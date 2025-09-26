import { simulationService } from '../services/simulation.service';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// Esquemas de validação
const ProjectionRequestSchema = z.object({
  simulationId: z.number().int().positive('ID da simulação deve ser positivo'),
  status: z.enum(['VIVO', 'MORTO', 'INVALIDO'], {
    errorMap: () => ({ message: 'Status deve ser VIVO, MORTO ou INVALIDO' })
  }),
  realReturnRate: z.number()
    .min(0, 'Taxa de retorno real não pode ser negativa')
    .default(0.04), // 4% ao ano
  projectionYears: z.number()
    .int('Anos de projeção devem ser um número inteiro')
    .min(1, 'Deve haver pelo menos 1 ano de projeção')
    .max(100, 'Máximo de 100 anos de projeção')
    .default(35), // Até 2060 (considerando 2025 como ano atual)
  includeInsurances: z.boolean().default(true)
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

// Serviço de projeção
const projectionService = {
  async calculateProjection(input: ProjectionRequest): Promise<ProjectionResult> {
    const { simulationId, status, realReturnRate, projectionYears, includeInsurances } = input;
    
    // Em produção, esses valores viriam do banco de dados
    const initialValues = {
      financial: 100000,  // Valor financeiro inicial
      realEstate: 500000, // Valor de imóveis inicial
      insurance: 100000   // Valor de seguros inicial
    };

    const years: number[] = [];
    const total: number[] = [];
    const financial: number[] = [initialValues.financial];
    const realEstate: number[] = [initialValues.realEstate];
    const insurance: number[] = [initialValues.insurance];
    
    // Ano base para a projeção
    const currentYear = new Date().getFullYear();
    
    // Calcular projeção ano a ano
    for (let year = 1; year <= projectionYears; year++) {
      const currentProjectionYear = currentYear + year;
      years.push(currentProjectionYear);
      
      // Aplicar taxa de retorno real nos ativos financeiros
      financial.push(financial[year - 1] * (1 + realReturnRate));
      
      // Imóveis têm crescimento um pouco menor (80% da taxa de retorno real)
      realEstate.push(realEstate[year - 1] * (1 + realReturnRate * 0.8));
      
      // Lógica para seguros baseada no status
      if (status === 'MORTO') {
        // Reduz o valor dos seguros pela metade em caso de falecimento
        insurance.push(Math.max(0, insurance[year - 1] * 0.5));
      } else if (status === 'INVALIDO' && year >= 5) {
        // Redução gradativa após 5 anos em caso de invalidez
        const reductionFactor = Math.max(0, 1 - (year - 4) * 0.1);
        insurance.push(insurance[year - 1] * reductionFactor);
      } else {
        // Crescimento normal dos seguros (metade da taxa de retorno real)
        insurance.push(insurance[year - 1] * (1 + realReturnRate * 0.5));
      }
      
      // Calcular o total para o ano atual
      total.push(financial[year] + realEstate[year] + (includeInsurances ? insurance[year] : 0));
    }
    
    // Remover o primeiro ano (ano base)
    years.shift();
    financial.shift();
    realEstate.shift();
    insurance.shift();
    
    // Calcular projeção sem seguros, se necessário
    let withoutInsurances;
    if (includeInsurances) {
      withoutInsurances = {
        total: financial.map((f, i) => f + realEstate[i]),
        financial: [...financial],
        realEstate: [...realEstate]
      };
    }
    
    return {
      years,
      projections: {
        total,
        financial,
        realEstate,
        insurance: includeInsurances ? insurance : [],
        ...(withoutInsurances && { withoutInsurances })
      },
      metadata: {
        simulationId,
        status: status as 'VIVO' | 'MORTO' | 'INVALIDO',
        realReturnRate,
        includeInsurances,
        projectionYears,
        calculatedAt: new Date().toISOString()
      }
    };
  },
  
  // Método auxiliar para obter valores iniciais da simulação (simulado)
  async getSimulationInitialValues(_simulationId: number) {
    // Em produção, isso buscaria os valores reais do banco de dados usando o _simulationId
    // Por enquanto, retornamos valores fixos para demonstração
    return {
      financial: 100000,
      realEstate: 500000,
      insurance: 100000
    };
  }
};

export default async function (app: FastifyInstance) {
  // Endpoint para calcular projeção patrimonial
  app.post<{ 
    Body: ProjectionRequest;
    Reply: ProjectionResult | { status: string; message: string; errors?: any[]; }
  }>('/projections', {
    schema: {
      summary: 'Calcula a projeção patrimonial até 2060',
      description: 'Calcula a projeção patrimonial ano a ano até 2060 com base nos parâmetros fornecidos.',
      tags: ['Projeções'],
      body: {
        type: 'object',
        required: ['simulationId', 'status'],
        properties: {
          simulationId: { 
            type: 'number',
            description: 'ID da simulação para a qual a projeção será calculada'
          },
          status: { 
            type: 'string', 
            enum: ['VIVO', 'MORTO', 'INVALIDO'],
            description: 'Status do titular para cálculo da projeção (VIVO, MORTO ou INVALIDO)'
          },
          realReturnRate: { 
            type: 'number',
            description: 'Taxa de retorno real anual (padrão: 0.04 para 4%)',
            default: 0.04
          },
          projectionYears: { 
            type: 'number',
            description: 'Número de anos para a projeção (padrão: 35 anos até 2060)',
            default: 35
          },
          includeInsurances: { 
            type: 'boolean',
            description: 'Se deve incluir seguros na projeção',
            default: true
          }
        }
      },
      response: {
        200: {
          type: 'object',
          description: 'Projeção calculada com sucesso',
          properties: {
            years: { 
              type: 'array', 
              items: { type: 'number' },
              description: 'Anos da projeção'
            },
            projections: {
              type: 'object',
              properties: {
                total: { 
                  type: 'array', 
                  items: { type: 'number' },
                  description: 'Valor total projetado para cada ano'
                },
                financial: { 
                  type: 'array', 
                  items: { type: 'number' },
                  description: 'Valor dos ativos financeiros projetados para cada ano'
                },
                realEstate: { 
                  type: 'array', 
                  items: { type: 'number' },
                  description: 'Valor dos imóveis projetados para cada ano'
                },
                insurance: { 
                  type: 'array', 
                  items: { type: 'number' },
                  description: 'Valor dos seguros projetados para cada ano (se includeInsurances for true)'
                },
                withoutInsurances: {
                  type: 'object',
                  nullable: true,
                  description: 'Projeção sem considerar seguros (apenas se includeInsurances for true)',
                  properties: {
                    total: { 
                      type: 'array', 
                      items: { type: 'number' },
                      description: 'Valor total sem seguros para cada ano'
                    },
                    financial: { 
                      type: 'array', 
                      items: { type: 'number' },
                      description: 'Valor dos ativos financeiros sem seguros para cada ano'
                    },
                    realEstate: { 
                      type: 'array', 
                      items: { type: 'number' },
                      description: 'Valor dos imóveis sem seguros para cada ano'
                    }
                  }
                }
              }
            },
            metadata: {
              type: 'object',
              properties: {
                simulationId: { 
                  type: 'number',
                  description: 'ID da simulação utilizada para o cálculo'
                },
                status: { 
                  type: 'string', 
                  enum: ['VIVO', 'MORTO', 'INVALIDO'],
                  description: 'Status utilizado para o cálculo'
                },
                realReturnRate: { 
                  type: 'number',
                  description: 'Taxa de retorno real utilizada no cálculo'
                },
                includeInsurances: { 
                  type: 'boolean',
                  description: 'Se os seguros foram incluídos na projeção'
                },
                projectionYears: { 
                  type: 'number',
                  description: 'Número de anos da projeção'
                },
                calculatedAt: { 
                  type: 'string', 
                  format: 'date-time',
                  description: 'Data e hora do cálculo da projeção'
                }
              }
            }
          }
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
              description: 'Detalhes dos erros de validação'
            }
          }
        },
        404: {
          type: 'object',
          description: 'Simulação não encontrada',
          properties: {
            status: { type: 'string', default: 'error' },
            message: { type: 'string', default: 'Simulação não encontrada' }
          }
        },
        500: {
          type: 'object',
          description: 'Erro interno do servidor',
          properties: {
            status: { type: 'string', default: 'error' },
            message: { type: 'string', default: 'Erro ao calcular projeção' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Validar os dados de entrada com Zod
      const body = ProjectionRequestSchema.parse(request.body);
      
      // Verificar se a simulação existe
      const simulation = await simulationService.getSimulation(body.simulationId.toString());
      if (!simulation) {
        return reply.status(404).send({
          status: 'error',
          message: 'Simulação não encontrada'
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
          errors: error.errors
        });
      }
      
      // Log do erro para debug (em produção, usar um logger apropriado)
      console.error('Erro ao calcular projeção:', error);
      
      // Retornar erro genérico
      return reply.status(500).send({
        status: 'error',
        message: 'Erro interno ao calcular projeção'
      });
    }
  });
}