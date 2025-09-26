import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// Esquemas de validação
const SimulationBaseSchema = {
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'SITUACAO_ATUAL']).default('ATIVO'),
  baseId: z.number().optional().nullable(),
  userId: z.string().uuid()
};

const CreateSimulationSchema = z.object({
  ...SimulationBaseSchema,
  allocations: z.array(z.object({
    assetId: z.string().uuid(),
    initialValue: z.number().positive('Valor inicial deve ser positivo'),
    targetAllocation: z.number().min(0).max(100, 'Alocação deve estar entre 0 e 100%')
  })).optional(),
  insurances: z.array(z.object({
    type: z.enum(['VIDA', 'RESIDENCIAL', 'AUTOMOVEL', 'OUTRO']),
    value: z.number().positive('Valor do seguro deve ser positivo'),
    description: z.string().optional()
  })).optional(),
  movements: z.array(z.object({
    type: z.enum(['ENTRADA', 'SAIDA']),
    value: z.number().positive('Valor deve ser positivo'),
    description: z.string(),
    date: z.string().datetime()
  })).optional()
});

const UpdateSimulationSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').optional(),
  description: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'SITUACAO_ATUAL']).optional()
});

type CreateSimulationInput = z.infer<typeof CreateSimulationSchema>;
type UpdateSimulationInput = z.infer<typeof UpdateSimulationSchema>;

// Serviço de simulação
const simulationService = {
  async createSimulation(input: CreateSimulationInput) {
    return {
      id: Math.floor(Math.random() * 10000),
      ...input,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async getSimulation(id: number) {
    return {
      id,
      name: 'Minha Simulação',
      description: 'Descrição da simulação',
      status: 'ATIVO',
      baseId: null,
      userId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async updateSimulation(id: number, input: UpdateSimulationInput) {
    const simulation = await this.getSimulation(id);
    return { ...simulation, ...input, updatedAt: new Date() };
  },

  async deleteSimulation(id: number) {
    return { id, deleted: true };
  },

  async duplicateSimulation(id: number, newName?: string) {
    const simulation = await this.getSimulation(id);
    return this.createSimulation({
      ...simulation,
      name: newName || `Cópia de ${simulation.name}`,
      baseId: simulation.id,
      status: simulation.status as 'ATIVO' | 'INATIVO' | 'SITUACAO_ATUAL'
    });
  }
};

export default async function (app: FastifyInstance) {
  // Listar todas as simulações
  app.get('/simulations', {
    schema: {
      summary: 'Lista todas as simulações',
      tags: ['Simulações']
    }
  }, async (_request, reply) => {
    try {
      return [];
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao listar simulações'
      });
    }
  });

  // Criar uma nova simulação
  app.post<{ Body: CreateSimulationInput }>('/simulations', {
    schema: {
      summary: 'Cria uma nova simulação',
      tags: ['Simulações'],
      body: {
        type: 'object',
        required: ['name', 'userId'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['ATIVO', 'INATIVO', 'SITUACAO_ATUAL'] },
          baseId: { type: 'number' },
          userId: { type: 'string', format: 'uuid' },
          allocations: { type: 'array' },
          insurances: { type: 'array' },
          movements: { type: 'array' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const body = CreateSimulationSchema.parse(request.body);
      const simulation = await simulationService.createSimulation(body);
      return reply.status(201).send(simulation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          status: 'error',
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao criar simulação'
      });
    }
  });

  //  Obter uma simulação por ID
  app.get<{ 
    Params: { id: string },
    Reply: any | { status: string; message: string }
  }>('/simulations/:id', {
    schema: {
      summary: 'Obtém uma simulação pelo ID',
      tags: ['Simulações'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^\\d+$' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const simulation = await simulationService.getSimulation(parseInt(id));
      
      if (!simulation) {
        return reply.status(404).send({
          status: 'error',
          message: 'Simulação não encontrada'
        });
      }
      
      return simulation;
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao buscar simulação'
      });
    }
  });

  // Atualizar uma simulação
  app.put<{ 
    Params: { id: string }, 
    Body: UpdateSimulationInput,
    Reply: any | { status: string; message: string; errors?: any[] }
  }>('/simulations/:id', {
    schema: {
      summary: 'Atualiza uma simulação existente',
      tags: ['Simulações'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^\\d+$' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['ATIVO', 'INATIVO', 'SITUACAO_ATUAL'] }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const body = UpdateSimulationSchema.parse(request.body);
      const updatedSimulation = await simulationService.updateSimulation(parseInt(id), body);
      return updatedSimulation;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          status: 'error',
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao atualizar simulação'
      });
    }
  });

  // Deletar uma simulação
  app.delete<{
    Params: { id: string },
    Reply: { id: number; deleted: boolean } | { status: string; message: string }
  }>('/simulations/:id', {
    schema: {
      summary: 'Remove uma simulação',
      tags: ['Simulações'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^\\d+$' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      await simulationService.deleteSimulation(parseInt(id));
      return { status: 'success', message: 'Simulação removida com sucesso' };
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao remover simulação'
      });
    }
  });

  // Duplicar uma simulação
  app.post<{ 
    Params: { id: string }, 
    Body: { name?: string },
    Reply: any | { status: string; message: string }
  }>('/simulations/:id/duplicate', {
    schema: {
      summary: 'Cria uma cópia de uma simulação existente',
      tags: ['Simulações'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^\\d+$' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { name } = request.body || {};
      
      const duplicatedSimulation = await simulationService.duplicateSimulation(
        parseInt(id),
        name || undefined
      );
      
      return reply.status(201).send(duplicatedSimulation);
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao duplicar simulação'
      });
    }
  });
}