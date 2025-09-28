import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../prisma/client';

// Esquemas de validação
const MovementSchema = z.object({
  simulationId: z.number().int().positive('ID da simulação deve ser positivo'),
  type: z.enum(['INCOME', 'EXPENSE', 'ENTRADA', 'SAIDA'], {
    errorMap: () => ({ message: 'Tipo deve ser INCOME, EXPENSE, ENTRADA ou SAIDA' }),
  }),
  value: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  startDate: z.string().datetime('Data de início inválida'),
  endDate: z.string().datetime('Data final inválida').optional(),
  frequency: z.enum(['UNIQUE', 'MONTHLY', 'ANNUAL', 'UNICA', 'MENSAL', 'ANUAL']).default('UNIQUE'),
  category: z.string().optional(),
});

const UpdateMovementSchema = MovementSchema.partial().omit({ simulationId: true });

type MovementInput = z.infer<typeof MovementSchema>;
type UpdateMovementInput = z.infer<typeof UpdateMovementSchema>;

// Serviço de movimentações
const movementService = {
  async createMovement(input: MovementInput) {
    const movement = await prisma.movement.create({
      data: {
        simulationId: input.simulationId,
        type: input.type,
        value: input.value,
        description: input.description,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        frequency: input.frequency,
        category: input.category,
      },
    });

    return movement;
  },

  async getMovement(id: number) {
    const movement = await prisma.movement.findUnique({
      where: { id },
    });

    if (!movement) {
      throw new Error('Movimentação não encontrada');
    }

    return movement;
  },

  async updateMovement(id: number, input: UpdateMovementInput) {
    const data: any = { ...input };

    // Converte as datas se forem strings
    if (data.startDate && typeof data.startDate === 'string') {
      data.startDate = new Date(data.startDate);
    }
    if (data.endDate && typeof data.endDate === 'string') {
      data.endDate = new Date(data.endDate);
    }

    const movement = await prisma.movement.update({
      where: { id },
      data,
    });

    return movement;
  },

  async deleteMovement(id: number) {
    await prisma.movement.delete({
      where: { id },
    });
    return { id, deleted: true };
  },

  async getSimulationMovements(simulationId: number) {
    return prisma.movement.findMany({
      where: { simulationId },
      orderBy: { startDate: 'asc' },
    });
  },

  // Timeline de entradas e saídas encadeadas
  async getMovementTimeline(simulationId: number, startYear: number, endYear: number) {
    const movements = await prisma.movement.findMany({
      where: {
        simulationId,
        startDate: {
          gte: new Date(startYear, 0, 1),
          lte: new Date(endYear, 11, 31),
        },
      },
      orderBy: { startDate: 'asc' },
    });

    // Gerar timeline encadeada
    const timeline = [];

    for (const movement of movements) {
      const startDate = new Date(movement.startDate);
      const endDate = movement.endDate ? new Date(movement.endDate) : new Date(endYear, 11, 31);

      if (movement.frequency === 'UNICA') {
        timeline.push({
          date: startDate,
          type: movement.type,
          value: movement.value,
          description: movement.description,
          movementId: movement.id,
        });
      } else if (movement.frequency === 'MENSAL') {
        let currentDate = startDate;
        while (currentDate <= endDate) {
          timeline.push({
            date: new Date(currentDate),
            type: movement.type,
            value: movement.value,
            description: movement.description,
            movementId: movement.id,
          });
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      } else if (movement.frequency === 'ANUAL') {
        let currentDate = startDate;
        while (currentDate <= endDate) {
          timeline.push({
            date: new Date(currentDate),
            type: movement.type,
            value: movement.value,
            description: movement.description,
            movementId: movement.id,
          });
          currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
      }
    }

    return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  },
};

export default async function (app: FastifyInstance) {
  // Listar todas as movimentações
  app.get<{
    Querystring: { simulationId?: string; type?: string };
    Reply: any[] | { status: string; message: string };
  }>(
    '/movements',
    {
      schema: {
        summary: 'Lista todas as movimentações ou filtra por simulação e tipo',
        tags: ['Movimentações'],
        querystring: {
          type: 'object',
          properties: {
            simulationId: { type: 'string', pattern: '^\\d+$' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'ENTRADA', 'SAIDA'] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { simulationId, type } = request.query;

        const where: any = {};
        if (simulationId) where.simulationId = parseInt(simulationId);
        if (type) where.type = type;

        const movements = await prisma.movement.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });

        return movements;
      } catch (error: any) {
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao buscar movimentações',
        });
      }
    }
  );

  //Listar todas as movimentações de uma simulação
  app.get<{ Params: { simulationId: string } }>(
    '/simulations/:simulationId/movements',
    {
      schema: {
        summary: 'Lista todas as movimentações de uma simulação',
        tags: ['Movimentações'],
        params: {
          type: 'object',
          properties: {
            simulationId: { type: 'string', pattern: '^\\d+$' },
          },
          required: ['simulationId'],
        },
      },
    },
    async (request, reply) => {
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
          message: 'Erro ao listar movimentações',
        });
      }
    }
  );

  // Criar uma nova movimentação
  app.post<{
    Body: MovementInput;
  }>(
    '/movements',
    {
      schema: {
        summary: 'Cria uma nova movimentação para uma simulação',
        tags: ['Movimentações'],
        body: {
          type: 'object',
          required: ['simulationId', 'type', 'value', 'description', 'startDate'],
          properties: {
            simulationId: { type: 'number', description: 'ID da simulação' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'ENTRADA', 'SAIDA'] },
            value: { type: 'number' },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            frequency: { type: 'string', enum: ['UNIQUE', 'MONTHLY', 'ANNUAL', 'UNICA', 'MENSAL', 'ANUAL'] },
            category: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = MovementSchema.parse(request.body);

        // Verificar se a simulação existe
        const simulation = await prisma.simulation.findUnique({
          where: { id: body.simulationId },
        });
        if (!simulation) {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }

        const movement = await movementService.createMovement(body);

        return reply.status(201).send(movement);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            status: 'error',
            message: 'Dados inválidos',
            errors: error.errors,
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao criar movimentação',
        });
      }
    }
  );

  // Obter uma movimentação por ID
  app.get<{ Params: { id: string } }>(
    '/movements/:id',
    {
      schema: {
        summary: 'Obtém uma movimentação pelo ID',
        tags: ['Movimentações'],
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
        const movement = await movementService.getMovement(parseInt(id));

        if (!movement) {
          return reply.status(404).send({
            status: 'error',
            message: 'Movimentação não encontrada',
          });
        }

        return movement;
      } catch (error) {
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao buscar movimentação',
        });
      }
    }
  );

  // Atualizar uma movimentação
  app.put<{ Params: { id: string }; Body: UpdateMovementInput }>(
    '/movements/:id',
    {
      schema: {
        summary: 'Atualiza uma movimentação existente',
        tags: ['Movimentações'],
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
            type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'ENTRADA', 'SAIDA'] },
            value: { type: 'number' },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            frequency: { type: 'string', enum: ['UNIQUE', 'MONTHLY', 'ANNUAL', 'UNICA', 'MENSAL', 'ANUAL'] },
            category: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
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

        const updatedMovement = await movementService.updateMovement(parseInt(id), body);

        return updatedMovement;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            status: 'error',
            message: 'Dados inválidos',
            errors: error.errors,
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao atualizar movimentação',
        });
      }
    }
  );

  // Remover uma movimentação
  app.delete<{ Params: { id: string } }>(
    '/movements/:id',
    {
      schema: {
        summary: 'Remove uma movimentação',
        tags: ['Movimentações'],
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

        // Verificar se a movimentação existe
        const existingMovement = await movementService.getMovement(parseInt(id));
        if (!existingMovement) {
          return reply.status(404).send({
            status: 'error',
            message: 'Movimentação não encontrada',
          });
        }

        await movementService.deleteMovement(parseInt(id));
        return { status: 'success', message: 'Movimentação removida com sucesso' };
      } catch (error) {
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao remover movimentação',
        });
      }
    }
  );
}
