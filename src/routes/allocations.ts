import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// Esquemas de validação
const AllocationRecordSchema = z.object({
  date: z.string().datetime(),
  value: z.number().positive('Valor deve ser positivo'),
  notes: z.string().optional()
});

const CreateAllocationSchema = z.object({
  simulationId: z.number().int().positive('ID da simulação deve ser positivo'),
  assetId: z.string().uuid('ID do ativo deve ser um UUID válido'),
  initialValue: z.number().positive('Valor inicial deve ser positivo'),
  targetAllocation: z.number()
    .min(0, 'Alocação alvo não pode ser negativa')
    .max(100, 'Alocação alvo não pode ser maior que 100%'),
  records: z.array(AllocationRecordSchema).default([])
});

const UpdateAllocationSchema = z.object({
  targetAllocation: z.number()
    .min(0, 'Alocação alvo não pode ser negativa')
    .max(100, 'Alocação alvo não pode ser maior que 100%')
    .optional(),
  isActive: z.boolean().optional()
});

type CreateAllocationInput = z.infer<typeof CreateAllocationSchema>;
type UpdateAllocationInput = z.infer<typeof UpdateAllocationSchema>;

// Serviço de alocações 
const allocationService = {
  async createAllocation(input: CreateAllocationInput) {
    // Em produção, isso seria salvo no banco de dados
    return {
      id: Math.floor(Math.random() * 10000),
      ...input,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async getAllocation(id: number) {
    // Em produção, buscaria do banco de dados
    return {
      id,
      simulationId: 1,
      assetId: '550e8400-e29b-41d4-a716-446655440000',
      initialValue: 10000,
      currentValue: 10000,
      targetAllocation: 50,
      isActive: true,
      records: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async updateAllocation(id: number, input: UpdateAllocationInput) {
    // Em produção, atualizaria no banco de dados
    const allocation = await this.getAllocation(id);
    return { ...allocation, ...input, updatedAt: new Date() };
  },

  async deleteAllocation(id: number) {
    // Em produção, removeria do banco de dados
    return { id, deleted: true };
  },

  async addAllocationRecord(allocationId: number, value: number, notes?: string) {
    // Em produção, adicionaria um registro de histórico
    const record = {
      id: Math.floor(Math.random() * 10000),
      allocationId,
      date: new Date().toISOString(),
      value,
      notes,
      createdAt: new Date()
    };
    return record;
  },

  async getAllocationRecords(allocationId: number) {
    // Em produção, buscaria do banco de dados
    return [
      {
        id: 1,
        allocationId,
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        value: 9000,
        notes: 'Ajuste mensal',
        createdAt: new Date()
      },
      {
        id: 2,
        allocationId,
        date: new Date().toISOString(),
        value: 10000,
        notes: 'Aporte inicial',
        createdAt: new Date()
      }
    ];
  }
};

export default async function (app: FastifyInstance) {
  // Criar uma nova alocação
  app.post<{ 
    Body: CreateAllocationInput,
    Params: { simulationId: string },
    Reply: any | { status: string; message: string; errors?: any[] }
  }>('/simulations/:simulationId/allocations', {
    schema: {
      summary: 'Cria uma nova alocação para uma simulação',
      tags: ['Alocações'],
      body: {
        type: 'object',
        required: ['assetId', 'initialValue', 'targetAllocation'],
        properties: {
          assetId: { type: 'string', format: 'uuid' },
          initialValue: { type: 'number' },
          targetAllocation: { type: 'number' },
          records: { type: 'array' }
        }
      },
      params: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', pattern: '^\\d+$' }
        },
        required: ['simulationId']
      }
    }
  }, async (request, reply) => {
    try {
      const { simulationId } = request.params;
      const body = CreateAllocationSchema.parse(request.body);
      
      // Verificar se a simulação existe (em produção)
      // const simulation = await simulationService.getSimulation(parseInt(simulationId));
      // if (!simulation) {
      //   return reply.status(404).send({
      //     status: 'error',
      //     message: 'Simulação não encontrada'
      //   });
      // }

      const allocation = await allocationService.createAllocation({
        ...body,
        simulationId: parseInt(simulationId)
      });
      
      return reply.status(201).send(allocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          status: 'error',
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      return reply.status(500).send({
        message: 'Erro ao criar alocação'
      });
    }
  });

  // Atualizar uma alocação
  app.put<{ 
    Params: { id: string }, 
    Body: UpdateAllocationInput,
    Reply: any | { status: string; message: string; errors?: any[] }
  }>('/allocations/:id', {
    schema: {
      summary: 'Atualiza uma alocação existente',
      tags: ['Alocações'],
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
          targetAllocation: { type: 'number' },
          isActive: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const body = UpdateAllocationSchema.parse(request.body);
      
      // Em produção, verificar se a alocação existe e pertence ao usuário
      // const allocation = await allocationService.getAllocation(parseInt(id));
      // if (!allocated) {
      //   return reply.status(404).send({
      //     status: 'error',
      //     message: 'Alocação não encontrada'
      //   });
      // }

      const updatedAllocation = await allocationService.updateAllocation(
        parseInt(id),
        body
      );
      
      return updatedAllocation;
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
        message: 'Erro ao atualizar alocação'
      });
    }
  });

  // Obter uma alocação específica
  app.get<{ 
    Params: { id: string },
    Reply: any | { status: string; message: string }
  }>('/allocations/:id', {
    schema: {
      summary: 'Obtém uma alocação pelo ID',
      tags: ['Alocações'],
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
      
      // Em produção, verificar se a alocação existe e pertence ao usuário
      // const allocation = await allocationService.getAllocation(parseInt(id));
      // if (!allocated) {
      //   return reply.status(404).send({
      //     status: 'error',
      //     message: 'Alocação não encontrada'
      //   });
      // }

      const allocation = await allocationService.getAllocation(parseInt(id));
      return allocation;
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao remover alocação'
      });
    }
  });

  // Adicionar registro a uma alocação
  app.post<{ 
    Params: { id: string }, 
    Body: { value: number; notes?: string },
    Reply: any | { status: string; message: string; errors?: any[] }
  }>('/allocations/:id/records', {
    schema: {
      summary: 'Adiciona um registro de valor a uma alocação',
      tags: ['Alocações'],
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
          value: { type: 'number' },
          notes: { type: 'string' }
        },
        required: ['value']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { value, notes } = request.body;
      
      // Em produção, verificar se a alocação existe e pertence ao usuário
      // const allocation = await allocationService.getAllocation(parseInt(id));
      // if (!allocated) {
      //   return reply.status(404).send({
      //     status: 'error',
      //     message: 'Alocação não encontrada'
      //   });
      // }

      const record = await allocationService.addAllocationRecord(
        parseInt(id),
        value,
        notes
      );
      
      return reply.status(201).send(record);
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao adicionar registro de valor'
      });
    }
  });

  // Listar alocações de uma simulação
  app.get<{ 
    Params: { simulationId: string },
    Reply: any[] | { status: string; message: string }
  }>('/simulations/:simulationId/allocations', {
    schema: {
      summary: 'Lista as alocações de uma simulação',
      tags: ['Alocações'],
      params: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', pattern: '^\\d+$' }
        },
        required: ['simulationId']
      }
    }
  }, async (request, reply) => {
    try {
      // Em produção, buscar as alocações da simulação
      // Por enquanto, retornamos um array vazio como exemplo
      return [];
      
      // Código de exemplo para implementação futura:
      // const { simulationId } = request.params;
      // const simulationAllocations = await allocationService.getSimulationAllocations(parseInt(simulationId));
      // return simulationAllocations;
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao buscar registros de valor'
      });
    }
  });
}