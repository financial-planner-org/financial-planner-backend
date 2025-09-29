import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// Esquemas de validação
const MovementSchema = z.object({
  simulationId: z.number().int().positive('ID da simulação deve ser positivo'),
  type: z.enum(['ENTRADA', 'SAIDA'], {
    errorMap: () => ({ message: 'Tipo deve ser ENTRADA ou SAIDA' })
  }),
  value: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  date: z.string().datetime('Data inválida'),
  category: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(['MENSAL', 'ANUAL']).optional(),
  endDate: z.string().datetime('Data final inválida').optional()
});

const UpdateMovementSchema = MovementSchema.partial().omit({ simulationId: true });

type MovementInput = z.infer<typeof MovementSchema>;
type UpdateMovementInput = z.infer<typeof UpdateMovementSchema>;

// Serviço de movimentações
const movementService = {
  async createMovement(input: MovementInput) {
    // Em produção, isso seria salvo no banco de dados
    return {
      id: Math.floor(Math.random() * 10000),
      ...input,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async getMovement(id: number) {
    // Em produção, buscaria do banco de dados
    return {
      id,
      simulationId: 1,
      type: 'ENTRADA',
      value: 1000,
      description: 'Salário',
      date: new Date().toISOString(),
      category: 'SALARIO',
      isRecurring: true,
      recurrenceFrequency: 'MENSAL',
      endDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async updateMovement(id: number, input: UpdateMovementInput) {
    // Em produção, atualizaria no banco de dados
    const movement = await this.getMovement(id);
    return { ...movement, ...input, updatedAt: new Date() };
  },

  async deleteMovement(id: number) {
    // Em produção, removeria do banco de dados
    return { id, deleted: true };
  },

  async getSimulationMovements(simulationId: number) {
    // Em produção, buscaria do banco de dados com paginação
    return [
      {
        id: 1,
        simulationId,
        type: 'ENTRADA',
        value: 5000,
        description: 'Salário',
        date: new Date().toISOString(),
        category: 'SALARIO',
        isRecurring: true,
        recurrenceFrequency: 'MENSAL',
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        simulationId,
        type: 'SAIDA',
        value: 1500,
        description: 'Aluguel',
        date: new Date().toISOString(),
        category: 'MORADIA',
        isRecurring: true,
        recurrenceFrequency: 'MENSAL',
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }
};

export default async function (app: FastifyInstance) {
  //Listar todas as movimentações de uma simulação
  app.get<{ Params: { simulationId: string } }>('/simulations/:simulationId/movements', {
    schema: {
      summary: 'Lista todas as movimentações de uma simulação',
      tags: ['Movimentações'],
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
      
      // Em produção, verificar se a simulação existe e pertence ao usuário
      // const simulation = await simulationService.getSimulation(parseInt(simulationId));
      // if (!simulation) {
      //   return reply.status(404).send({
      //     status: 'error',
      //     message: 'Simulação não encontrada'
      //   });
      // }

      const movements = await movementService.getSimulationMovements(parseInt(simulationId));
      return movements;
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao listar movimentações'
      });
    }
  });

  // Criar uma nova movimentação
  app.post<{ 
    Body: MovementInput; 
    Params: { simulationId: string } 
  }>('/simulations/:simulationId/movements', {
    schema: {
      summary: 'Cria uma nova movimentação para uma simulação',
      tags: ['Movimentações'],
      params: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', pattern: '^\\d+$' }
        },
        required: ['simulationId']
      },
      body: {
        type: 'object',
        required: ['type', 'value', 'description', 'date'],
        properties: {
          type: { type: 'string', enum: ['ENTRADA', 'SAIDA'] },
          value: { type: 'number' },
          description: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          category: { type: 'string' },
          isRecurring: { type: 'boolean' },
          recurrenceFrequency: { type: 'string', enum: ['MENSAL', 'ANUAL'] },
          endDate: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { simulationId } = request.params;
      const body = MovementSchema.parse({
        ...request.body,
        simulationId: parseInt(simulationId)
      });
      
      // Verificar se a simulação existe (em produção)
      // const simulation = await simulationService.getSimulation(parseInt(simulationId));
      // if (!simulation) {
      //   return reply.status(404).send({
      //     status: 'error',
      //     message: 'Simulação não encontrada'
      //   });
      // }

      const movement = await movementService.createMovement(body);
      
      return reply.status(201).send(movement);
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
        message: 'Erro ao criar movimentação'
      });
    }
  });

  // Obter uma movimentação por ID
  app.get<{ Params: { id: string } }>('/movements/:id', {
    schema: {
      summary: 'Obtém uma movimentação pelo ID',
      tags: ['Movimentações'],
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
      const movement = await movementService.getMovement(parseInt(id));
      
      if (!movement) {
        return reply.status(404).send({
          status: 'error',
          message: 'Movimentação não encontrada'
        });
      }
      
      return movement;
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao buscar movimentação'
      });
    }
  });

  // Atualizar uma movimentação
  app.put<{ Params: { id: string }, Body: UpdateMovementInput }>('/movements/:id', {
    schema: {
      summary: 'Atualiza uma movimentação existente',
      tags: ['Movimentações'],
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
          type: { type: 'string', enum: ['ENTRADA', 'SAIDA'] },
          value: { type: 'number' },
          description: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          category: { type: 'string' },
          isRecurring: { type: 'boolean' },
          recurrenceFrequency: { type: 'string', enum: ['MENSAL', 'ANUAL'] },
          endDate: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const body = UpdateMovementSchema.parse(request.body);
      
      // Verificar se a movimentação existe (em produção)
      // const existingMovement = await movementService.getMovement(parseInt(id));
      // if (!existingMovement) {
      //   return reply.status(404).send({
      //     status: 'error',
      //     message: 'Movimentação não encontrada'
      //   });
      // }

      const updatedMovement = await movementService.updateMovement(
        parseInt(id),
        body
      );
      
      return updatedMovement;
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
        message: 'Erro ao atualizar movimentação'
      });
    }
  });

  // Remover uma movimentação
  app.delete<{ Params: { id: string } }>('/movements/:id', {
    schema: {
      summary: 'Remove uma movimentação',
      tags: ['Movimentações'],
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
      
      // Verificar se a movimentação existe (em produção)
      // const existingMovement = await movementService.getMovement(parseInt(id));
      // if (!existingMovement) {
      //   return reply.status(404).send({
      //     status: 'error',
      //     message: 'Movimentação não encontrada'
      //   });
      // }

      await movementService.deleteMovement(parseInt(id));
      return { status: 'success', message: 'Movimentação removida com sucesso' };
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao remover movimentação'
      });
    }
  });
}