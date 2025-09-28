import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import {
  simulationService,
  type CreateSimulationInput,
  type UpdateSimulationInput,
} from '../services/simulation.service';

const prisma = new PrismaClient();

// Esquemas de validação
const SimulationBaseSchema = {
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'SITUACAO_ATUAL']).default('ATIVO'),
  baseId: z.number().optional().nullable(),
};

const CreateSimulationSchema = z.object({
  ...SimulationBaseSchema,
  clientId: z.number().int().positive('ID do cliente deve ser positivo'),
  allocations: z
    .array(
      z.object({
        assetId: z.string().uuid(),
        initialValue: z.number().positive('Valor inicial deve ser positivo'),
        targetAllocation: z.number().min(0).max(100, 'Alocação deve estar entre 0 e 100%'),
      })
    )
    .optional(),
  insurances: z
    .array(
      z.object({
        type: z.enum(['VIDA', 'RESIDENCIAL', 'AUTOMOVEL', 'OUTRO']),
        value: z.number().positive('Valor do seguro deve ser positivo'),
        description: z.string().optional(),
      })
    )
    .optional(),
  movements: z
    .array(
      z.object({
        type: z.enum(['ENTRADA', 'SAIDA']),
        value: z.number().positive('Valor deve ser positivo'),
        description: z.string(),
        date: z.string().datetime(),
      })
    )
    .optional(),
  realRate: z.number().default(0),
  startDate: z.string().datetime().optional().default(new Date().toISOString()),
});

const UpdateSimulationSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').optional(),
  description: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'SITUACAO_ATUAL']).optional(),
  realRate: z.number().optional(),
  startDate: z.string().datetime().optional(),
});

export default async function (app: FastifyInstance) {
  // Listar todas as simulações
  app.get(
    '/simulations',
    {
      schema: {
        summary: 'Lista todas as simulações',
        tags: ['Simulações'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                status: { type: 'string' },
                baseId: { type: 'number', nullable: true },
                startDate: { type: 'string', format: 'date-time' },
                realRate: { type: 'number' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          500: {
            type: 'object',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        // Em uma implementação real, você poderia adicionar filtros aqui
        const simulations = await prisma.simulation.findMany();
        return reply.send(simulations);
      } catch (error) {
        console.error('Erro ao listar simulações:', error);
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao listar simulações',
        });
      }
    }
  );

  // Listar histórico de simulações com versões
  app.get(
    '/simulations/history',
    {
      schema: {
        summary: 'Lista histórico de simulações com versões',
        tags: ['Simulações'],
        querystring: {
          type: 'object',
          properties: {
            clientId: { type: 'number', description: 'ID do cliente (opcional)' },
            includeVersions: {
              type: 'boolean',
              default: true,
              description: 'Incluir versões legadas',
            },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                status: { type: 'string' },
                baseId: { type: 'number', nullable: true },
                startDate: { type: 'string', format: 'date-time' },
                realRate: { type: 'number' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                clientId: { type: 'number' },
                isLegacy: { type: 'boolean' },
                isCurrentVersion: { type: 'boolean' },
                versions: {
                  type: 'array',
                  items: { type: 'number' },
                },
              },
            },
          },
          500: {
            type: 'object',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { clientId, includeVersions = true } = request.query as {
          clientId?: number;
          includeVersions?: boolean;
        };

        // Buscar todas as simulações
        const simulations = await prisma.simulation.findMany({
          where: clientId ? { clientId } : undefined,
          include: {
            base: true,
            versions: true,
            client: true,
          },
          orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        });

        // Processar simulações para identificar versões legadas
        const processedSimulations = simulations.map(simulation => {
          const sameNameSimulations = simulations.filter(s => s.name === simulation.name);
          const isLatestVersion =
            sameNameSimulations.length === 1 ||
            simulation.createdAt.getTime() >=
              Math.max(...sameNameSimulations.map(s => s.createdAt.getTime()));

          return {
            ...simulation,
            isLegacy: !isLatestVersion,
            isCurrentVersion: isLatestVersion,
            versions: sameNameSimulations.map(s => s.id),
          };
        });

        // Filtrar versões legadas se necessário
        const filteredSimulations = includeVersions
          ? processedSimulations
          : processedSimulations.filter(s => s.isCurrentVersion);

        return reply.send(filteredSimulations);
      } catch (error) {
        console.error('Erro ao listar histórico de simulações:', error);
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao listar histórico de simulações',
        });
      }
    }
  );

  // Criar uma nova simulação
  app.post<{ Body: CreateSimulationInput }>('/simulations', {
    schema: {
      summary: 'Cria uma nova simulação',
      tags: ['Simulações'],
      body: {
        type: 'object',
        required: ['name', 'startDate', 'realRate', 'clientId'],
        properties: {
          name: {
            type: 'string',
            minLength: 3,
            description: 'Nome da simulação (mínimo 3 caracteres)',
          },
          description: {
            type: 'string',
            description: 'Descrição opcional da simulação',
          },
          status: {
            type: 'string',
            enum: ['ATIVO', 'INATIVO', 'SITUACAO_ATUAL'],
            default: 'ATIVO',
            description: 'Status da simulação (ATIVO, INATIVO, SITUACAO_ATUAL)',
          },
          baseId: {
            type: 'number',
            nullable: true,
            description: 'ID da simulação base (opcional)',
          },
          // userId removido
          startDate: {
            type: 'string',
            format: 'date-time',
            description: 'Data de início da simulação',
          },
          realRate: {
            type: 'number',
            description: 'Taxa real de retorno',
          },
          clientId: {
            type: 'number',
            description: 'ID do cliente',
          },
          allocations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                assetId: { type: 'string', format: 'uuid' },
                initialValue: { type: 'number', minimum: 0 },
                targetAllocation: { type: 'number', minimum: 0, maximum: 100 },
              },
              required: ['assetId', 'initialValue', 'targetAllocation'],
            },
            description: 'Alocações de ativos da simulação',
          },
          insurances: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['VIDA', 'RESIDENCIAL', 'AUTOMOVEL', 'OUTRO'] },
                value: { type: 'number', minimum: 0 },
                description: { type: 'string' },
              },
              required: ['type', 'value'],
            },
            description: 'Seguros da simulação',
          },
          movements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['ENTRADA', 'SAIDA'] },
                value: { type: 'number', minimum: 0 },
                description: { type: 'string' },
                date: { type: 'string', format: 'date-time' },
              },
              required: ['type', 'value', 'description', 'date'],
            },
            description: 'Movimentações financeiras da simulação',
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            description: { type: ['string', 'null'] },
            status: { type: 'string' },
            baseId: { type: ['number', 'null'] },
            clientId: { type: 'number' },
            startDate: { type: 'string' },
            realRate: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          type: 'object',
          properties: {
            status: { type: 'string', default: 'error' },
            message: { type: 'string' },
            errors: { type: 'array' },
          },
        },
        500: {
          type: 'object',
          properties: {
            status: { type: 'string', default: 'error' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const body = CreateSimulationSchema.parse(request.body);
        const simulation = await simulationService.createSimulation(body);
        return reply.status(201).send(simulation);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            status: 'error',
            message: 'Dados inválidos',
            errors: error.errors,
          });
        }

        if (error instanceof Error) {
          return reply.status(400).send({
            status: 'error',
            message: error.message,
          });
        }

        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao criar simulação',
        });
      }
    },
  });

  //  Obter uma simulação por ID
  app.get<{
    Params: { id: string };
    Reply: any | { status: string; message: string };
  }>(
    '/simulations/:id',
    {
      schema: {
        summary: 'Obtém uma simulação pelo ID',
        tags: ['Simulações'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const simulation = await simulationService.getSimulation(parseInt(id));

        if (!simulation) {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }

        return simulation;
      } catch (error) {
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao buscar simulação',
        });
      }
    }
  );

  // Atualizar uma simulação
  app.put<{
    Params: { id: string };
    Body: UpdateSimulationInput;
    Reply: any | { status: string; message: string; errors?: any[] };
  }>(
    '/simulations/:id',
    {
      schema: {
        summary: 'Atualiza uma simulação existente',
        tags: ['Simulações'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 3 },
            description: { type: 'string' },
            status: { type: 'string', enum: ['ATIVO', 'INATIVO', 'SITUACAO_ATUAL'] },
            realRate: { type: 'number' },
            startDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              status: { type: 'string' },
              realRate: { type: 'number' },
              startDate: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            type: 'object',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string' },
              errors: { type: 'array' },
            },
          },
          404: {
            type: 'object',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Verificar se a simulação pode ser editada
        const canEdit = await simulationService.canEditSimulation(parseInt(id));
        if (!canEdit) {
          return reply.status(403).send({
            status: 'error',
            message: 'Esta simulação não pode ser editada (Situação Atual ou versão legada)',
          });
        }

        const body = UpdateSimulationSchema.parse(request.body);
        const updatedSimulation = await simulationService.updateSimulation(parseInt(id), body);
        return updatedSimulation;
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            status: 'error',
            message: 'Dados inválidos',
            errors: error.errors,
          });
        }
        if (error.message === 'Simulação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }
        if (error.code === 'P2025') {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao atualizar simulação',
        });
      }
    }
  );

  // Deletar uma simulação
  app.delete<{
    Params: { id: string };
    Reply: { id: number; deleted: boolean } | { status: string; message: string };
  }>(
    '/simulations/:id',
    {
      schema: {
        summary: 'Remove uma simulação',
        tags: ['Simulações'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Verificar se a simulação pode ser deletada
        const canDelete = await simulationService.canDeleteSimulation(parseInt(id));
        if (!canDelete) {
          return reply.status(403).send({
            status: 'error',
            message: 'Esta simulação não pode ser deletada (Situação Atual)',
          });
        }

        await simulationService.deleteSimulation(parseInt(id));
        return { status: 'success', message: 'Simulação removida com sucesso' };
      } catch (error: any) {
        if (error.message === 'Simulação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }
        if (error.code === 'P2025') {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao remover simulação',
        });
      }
    }
  );

  // Criar Situação Atual
  app.post<{
    Params: { id: string };
    Reply: any | { status: string; message: string };
  }>(
    '/simulations/:id/current-situation',
    {
      schema: {
        summary: 'Cria uma Situação Atual baseada na simulação',
        tags: ['Simulações'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const currentSituation = await simulationService.createCurrentSituation(parseInt(id));
        return reply.status(201).send(currentSituation);
      } catch (error: any) {
        if (error.message === 'Simulação base não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: error instanceof Error ? error.message : 'Erro ao criar Situação Atual',
        });
      }
    }
  );

  // Verificar status de uma simulação
  app.get<{
    Params: { id: string };
    Reply: any | { status: string; message: string };
  }>(
    '/simulations/:id/status',
    {
      schema: {
        summary: 'Verifica o status e permissões de uma simulação',
        tags: ['Simulações'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const simulationId = parseInt(id);

        const [isCurrentSituation, canEdit, canDelete, isLegacy] = await Promise.all([
          simulationService.isCurrentSituation(simulationId),
          simulationService.canEditSimulation(simulationId),
          simulationService.canDeleteSimulation(simulationId),
          simulationService.isLegacyVersion(simulationId),
        ]);

        return reply.status(200).send({
          simulationId,
          isCurrentSituation,
          canEdit,
          canDelete,
          isLegacy,
          restrictions: {
            cannotEdit: !canEdit,
            cannotDelete: !canDelete,
            isLegacyVersion: isLegacy,
            isCurrentSituation,
          },
        });
      } catch (error: any) {
        if (error.message === 'Simulação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao verificar status da simulação',
        });
      }
    }
  );

  // Duplicar uma simulação
  app.post<{
    Params: { id: string };
    Body: { name?: string };
    Reply: any | { status: string; message: string };
  }>(
    '/simulations/:id/duplicate',
    {
      schema: {
        summary: 'Cria uma cópia de uma simulação existente',
        tags: ['Simulações'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { name } = request.body || {};

        const duplicatedSimulation = await simulationService.duplicateSimulation(
          parseInt(id),
          name || undefined
        );

        return reply.status(201).send(duplicatedSimulation);
      } catch (error: any) {
        if (error.message === 'Simulação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao duplicar simulação',
        });
      }
    }
  );

  // Criar nova versão de uma simulação
  app.post<{
    Params: { id: string };
    Body: { newName: string };
  }>(
    '/simulations/:id/create-version',
    {
      schema: {
        summary: 'Cria uma nova versão de uma simulação',
        tags: ['Simulações'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          required: ['newName'],
          properties: {
            newName: { type: 'string', minLength: 3 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const simulationId = parseInt(id);
        const { newName } = request.body;

        // Verificar se já existe uma simulação com esse nome
        const existingSimulation = await prisma.simulation.findFirst({
          where: { name: newName },
        });

        if (existingSimulation) {
          return reply.status(409).send({
            status: 'error',
            message: 'Já existe uma simulação com este nome',
          });
        }

        const newVersion = await simulationService.duplicateSimulation(simulationId, newName);

        return reply.status(201).send(newVersion);
      } catch (error: any) {
        if (error.message === 'Simulação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao criar nova versão',
        });
      }
    }
  );
}
