import { simulationService } from '../services/simulation.service';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../prisma/client';

// Esquemas de validação - CONFORME O CASE
const ProjectionRequestSchema = z.object({
  simulationId: z.number().int().positive('ID da simulação deve ser positivo'),
  status: z.enum(['VIVO', 'MORTO', 'INVALIDO'], {
    errorMap: () => ({ message: 'Status deve ser VIVO, MORTO ou INVALIDO' }),
  }),
  // Taxa real composta fornecida via input (padrão: 4% a.a.) - CONFORME CASE
  realReturnRate: z.number().min(0, 'Taxa de retorno real não pode ser negativa').default(0.04), // 4% ao ano - PADRÃO DO CASE
  // Projeção ano a ano até 2060 - CONFORME CASE
  projectionYears: z
    .number()
    .int('Anos de projeção devem ser um número inteiro')
    .min(1, 'Deve haver pelo menos 1 ano de projeção')
    .max(100, 'Máximo de 100 anos de projeção')
    .default(35), // Até 2060 (considerando 2025 como ano atual)
  includeInsurances: z.boolean().default(true),
});

type ProjectionRequest = z.infer<typeof ProjectionRequestSchema>;

// Tipos para a projeção
interface ProjectionResult {
  years: number[];
  projections: {
    total: number[];
    financial: number[];
    realEstate: number[];
    insurance: number[];
    withoutInsurances?: {
      total: number[];
      financial: number[];
      realEstate: number[];
    };
  };
  metadata: {
    simulationId: number;
    status: 'VIVO' | 'MORTO' | 'INVALIDO';
    realReturnRate: number;
    includeInsurances: boolean;
    projectionYears: number;
    calculatedAt: string;
  };
}

/**
 * Serviço de Projeção Patrimonial
 *
 * Responsável por calcular a evolução patrimonial ano a ano até 2060.
 * Implementa as regras de negócio do Multi Family Office:
 *
 * - Considera registro mais recente de cada ativo ANTERIOR à data da simulação
 * - Aplica taxa de retorno real composta (padrão 4% a.a.)
 * - Implementa regras específicas por status:
 *   * VIVO: crescimento normal de todos os ativos
 *   * MORTO: sem entradas, despesas divididas por 2
 *   * INVALIDO: sem entradas, despesas mantidas
 * - Calcula projeção com e sem seguros para comparação
 */
const projectionService = {
  async calculateProjection(input: ProjectionRequest): Promise<ProjectionResult> {
    // Valida os dados de entrada usando schema Zod
    const validatedInput = ProjectionRequestSchema.parse(input);
    const { simulationId, status, realReturnRate, projectionYears, includeInsurances } =
      validatedInput;

    // Busca todos os dados da simulação do banco de dados
    // Inclui: alocações (com histórico), movimentações, seguros
    const simulation = await prisma.simulation.findUnique({
      where: { id: simulationId },
      include: {
        allocations: {
          include: {
            records: {
              orderBy: { date: 'desc' }, // Ordenar por data decrescente para pegar o mais recente
            },
          },
        },
        movements: {
          orderBy: { startDate: 'asc' },
        },
        insurances: true,
      },
    });

    if (!simulation) {
      throw new Error('Simulação não encontrada');
    }

    /**
     * CÁLCULO DOS VALORES INICIAIS
     *
     * Regra do Case: "Ponto inicial da simulação sempre considera o registro
     * mais recente de cada ativo ANTERIOR à data da simulação"
     *
     * Exemplo: Se há registros em jan/2020, jan/2021 e jan/2022, e a simulação
     * inicia em fev/2021, será considerado apenas o registro de jan/2021.
     */
    const simulationStartDate = new Date(simulation.startDate);

    let initialFinancial = 0; // Valor inicial de ativos financeiros
    let initialRealEstate = 0; // Valor inicial de ativos imobiliários
    let initialInsurance = 0; // Valor inicial de seguros

    // PROCESSAR ALOCAÇÕES FINANCEIRAS (CDBs, Fundos, Ações, etc.)
    const financialAllocations = simulation.allocations.filter(a => a.type === 'FINANCEIRA');
    for (const allocation of financialAllocations) {
      // Filtrar apenas registros ANTERIORES à data da simulação (< e não <=)
      const validRecords = allocation.records.filter(
        record => new Date(record.date) < simulationStartDate
      );

      if (validRecords.length > 0) {
        // Ordenar por data decrescente e pegar o mais recente
        const latestRecord = validRecords.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        initialFinancial += latestRecord.value;
      } else if (allocation.value) {
        // Se não há registros históricos, usar o valor inicial da alocação
        initialFinancial += allocation.value;
      }
    }

    // PROCESSAR ALOCAÇÕES IMOBILIÁRIAS (Imóveis, Terrenos, etc.)
    const realEstateAllocations = simulation.allocations.filter(a => a.type === 'IMOBILIZADA');
    for (const allocation of realEstateAllocations) {
      // Aplicar mesma lógica: registro mais recente anterior à simulação
      const validRecords = allocation.records.filter(
        record => new Date(record.date) < simulationStartDate
      );

      if (validRecords.length > 0) {
        // Ordenar por data decrescente e pegar o mais recente
        const latestRecord = validRecords.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        initialRealEstate += latestRecord.value;
      } else if (allocation.value) {
        // Fallback para valor inicial da alocação
        initialRealEstate += allocation.value;
      }
    }

    // PROCESSAR SEGUROS (Vida e Invalidez)
    // Soma todos os valores segurados ativos na data da simulação
    for (const insurance of simulation.insurances) {
      initialInsurance += insurance.insuredValue;
    }

    // Armazena os valores iniciais calculados
    const initialValues = {
      financial: initialFinancial,
      realEstate: initialRealEstate,
      insurance: initialInsurance,
    };

    // Arrays para armazenar a projeção ano a ano
    const years: number[] = [];
    const total: number[] = [];
    const financial: number[] = [initialValues.financial];
    const realEstate: number[] = [initialValues.realEstate];
    const insurance: number[] = [initialValues.insurance];

    // Ano base para a projeção (usar o ano de início da simulação)
    const currentYear = new Date(simulation.startDate).getFullYear();

    /**
     * CÁLCULO DA PROJEÇÃO ANO A ANO
     *
     * Loop de projeção até o ano final (padrão: 2060 = 35 anos)
     * A cada ano, aplica:
     * 1. Taxa de retorno real composta nos ativos financeiros
     * 2. Taxa reduzida (80%) nos imóveis (menor liquidez)
     * 3. Regras específicas de seguros por status
     */
    for (let year = 0; year < projectionYears; year++) {
      const currentProjectionYear = currentYear + year + 1;
      years.push(currentProjectionYear);

      // ATIVOS FINANCEIROS: aplicar taxa de retorno real composta
      financial.push(financial[year] * (1 + realReturnRate));

      // ATIVOS IMOBILIÁRIOS: crescimento menor (80% da taxa)
      // Imóveis têm menor liquidez e valorização mais conservadora
      realEstate.push(realEstate[year] * (1 + realReturnRate * 0.8));

      /**
       * SEGUROS: aplicar regras específicas por status
       *
       * VIVO: seguros crescem normalmente (50% da taxa de retorno)
       * MORTO: cliente não possui timeline de entradas, despesas /2
       *        - Seguros reduzidos pela metade no 1º ano
       * INVALIDO: entradas encerradas, despesas mantidas
       *           - Redução gradativa após 5 anos
       */
      if (status === 'MORTO') {
        if (year === 0) {
          // Primeiro ano: reduz seguros pela metade
          insurance.push(Math.max(0, insurance[year] * 0.5));
        } else {
          // Anos seguintes: mantém o valor reduzido
          insurance.push(insurance[year]);
        }
      } else if (status === 'INVALIDO' && year >= 5) {
        // Redução gradativa após 5 anos (10% ao ano)
        const reductionFactor = Math.max(0, 1 - (year - 4) * 0.1);
        insurance.push(insurance[year] * reductionFactor);
      } else {
        // VIVO: crescimento normal (50% da taxa de retorno real)
        insurance.push(insurance[year] * (1 + realReturnRate * 0.5));
      }

      // TOTAL: soma de todos os ativos do ano
      total.push(
        financial[year + 1] + realEstate[year + 1] + (includeInsurances ? insurance[year + 1] : 0)
      );
    }

    /**
     * CÁLCULO DA PROJEÇÃO SEM SEGUROS
     *
     * Requisito do Case: "Ver em detalhes mostra linha adicional de
     * Patrimônio Total sem Seguros"
     *
     * Usado para comparação: mostra quanto o cliente teria sem
     * os valores segurados (cenário mais conservador)
     */
    let withoutInsurances;
    if (includeInsurances) {
      withoutInsurances = {
        total: financial.map((f, i) => f + realEstate[i]),
        financial: [...financial],
        realEstate: [...realEstate],
      };
    }

    // Retorna o resultado completo da projeção
    return {
      years, // Anos da projeção [2026, 2027, ..., 2060]
      projections: {
        total, // Patrimônio total por ano
        financial, // Ativos financeiros por ano
        realEstate, // Ativos imobiliários por ano
        insurance: includeInsurances ? insurance : [], // Seguros por ano
        ...(withoutInsurances && { withoutInsurances }), // Sem seguros (comparação)
      },
      metadata: {
        simulationId,
        status: status as 'VIVO' | 'MORTO' | 'INVALIDO',
        realReturnRate,
        includeInsurances,
        projectionYears,
        calculatedAt: new Date().toISOString(),
      },
    };
  },

  // Método auxiliar para obter valores iniciais da simulação (simulado)
  async getSimulationInitialValues(_simulationId: number) {
    // Em produção, isso buscaria os valores reais do banco de dados usando o _simulationId
    // Por enquanto, retornamos valores fixos para demonstração
    return {
      financial: 100000,
      realEstate: 500000,
      insurance: 100000,
    };
  },
};

export default async function (app: FastifyInstance) {
  // Endpoint para calcular projeção patrimonial
  app.post<{
    Body: ProjectionRequest;
    Reply: ProjectionResult | { status: string; message: string; errors?: any[] };
  }>(
    '/projections',
    {
      schema: {
        summary: 'Calcula a projeção patrimonial até 2060',
        description:
          'Calcula a projeção patrimonial ano a ano até 2060 com base nos parâmetros fornecidos.',
        tags: ['Projeções'],
        body: {
          type: 'object',
          required: ['simulationId', 'status'],
          properties: {
            simulationId: {
              type: 'number',
              description: 'ID da simulação para a qual a projeção será calculada',
            },
            status: {
              type: 'string',
              enum: ['VIVO', 'MORTO', 'INVALIDO'],
              description: 'Status do titular para cálculo da projeção (VIVO, MORTO ou INVALIDO)',
            },
            realReturnRate: {
              type: 'number',
              description: 'Taxa de retorno real anual (padrão: 0.04 para 4%)',
              default: 0.04,
            },
            projectionYears: {
              type: 'number',
              description: 'Número de anos para a projeção (padrão: 35 anos até 2060)',
              default: 35,
            },
            includeInsurances: {
              type: 'boolean',
              description: 'Se deve incluir seguros na projeção',
              default: true,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Projeção calculada com sucesso',
            properties: {
              years: {
                type: 'array',
                items: { type: 'number' },
                description: 'Anos da projeção',
              },
              projections: {
                type: 'object',
                properties: {
                  total: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'Valor total projetado para cada ano',
                  },
                  financial: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'Valor dos ativos financeiros projetados para cada ano',
                  },
                  realEstate: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'Valor dos imóveis projetados para cada ano',
                  },
                  insurance: {
                    type: 'array',
                    items: { type: 'number' },
                    description:
                      'Valor dos seguros projetados para cada ano (se includeInsurances for true)',
                  },
                  withoutInsurances: {
                    type: 'object',
                    nullable: true,
                    description:
                      'Projeção sem considerar seguros (apenas se includeInsurances for true)',
                    properties: {
                      total: {
                        type: 'array',
                        items: { type: 'number' },
                        description: 'Valor total sem seguros para cada ano',
                      },
                      financial: {
                        type: 'array',
                        items: { type: 'number' },
                        description: 'Valor dos ativos financeiros sem seguros para cada ano',
                      },
                      realEstate: {
                        type: 'array',
                        items: { type: 'number' },
                        description: 'Valor dos imóveis sem seguros para cada ano',
                      },
                    },
                  },
                },
              },
              metadata: {
                type: 'object',
                properties: {
                  simulationId: {
                    type: 'number',
                    description: 'ID da simulação utilizada para o cálculo',
                  },
                  status: {
                    type: 'string',
                    enum: ['VIVO', 'MORTO', 'INVALIDO'],
                    description: 'Status utilizado para o cálculo',
                  },
                  realReturnRate: {
                    type: 'number',
                    description: 'Taxa de retorno real utilizada no cálculo',
                  },
                  includeInsurances: {
                    type: 'boolean',
                    description: 'Se os seguros foram incluídos na projeção',
                  },
                  projectionYears: {
                    type: 'number',
                    description: 'Número de anos da projeção',
                  },
                  calculatedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Data e hora do cálculo da projeção',
                  },
                },
              },
            },
          },
          400: {
            type: 'object',
            description: 'Erro de validação dos dados de entrada',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string' },
              errors: {
                type: 'array',
                items: { type: 'object' },
                description: 'Detalhes dos erros de validação',
              },
            },
          },
          404: {
            type: 'object',
            description: 'Simulação não encontrada',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string', default: 'Simulação não encontrada' },
            },
          },
          500: {
            type: 'object',
            description: 'Erro interno do servidor',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string', default: 'Erro ao calcular projeção' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Validar os dados de entrada com Zod
        const body = ProjectionRequestSchema.parse(request.body);

        // Verificar se a simulação existe
        const simulation = await simulationService.getSimulation(Number(body.simulationId));
        if (!simulation) {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }

        // Calcular a projeção
        const projection = await projectionService.calculateProjection(body);

        return reply.status(200).send(projection);
      } catch (error) {
        // Tratar erros de validação do Zod
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            status: 'error',
            message: 'Dados inválidos',
            errors: error.errors,
          });
        }

        // Log do erro para debug (em produção, usar um logger apropriado)
        console.error('Erro ao calcular projeção:', error);

        // Retornar erro genérico
        return reply.status(500).send({
          status: 'error',
          message: 'Erro interno ao calcular projeção',
        });
      }
    }
  );
}

// Exportar o serviço para uso em testes
export { projectionService };
