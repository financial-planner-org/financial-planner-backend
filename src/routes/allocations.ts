import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../prisma/client';

// Esquemas de validação

const CreateAllocationRecordSchema = z.object({
  value: z.number().positive('Valor deve ser positivo'),
  notes: z.string().optional(),
});

const CreateAllocationSchema = z.object({
  simulationId: z.number().int().positive('ID da simulação deve ser positivo'),
  type: z.enum(['FINANCIAL', 'IMMOBILIZED', 'FINANCEIRA', 'IMOBILIZADA']),
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  value: z.number().positive('Valor deve ser positivo'),
  startDate: z.string().datetime().optional(),
  installments: z.number().int().positive().optional(),
  interestRate: z.number().positive().optional(),
});

const UpdateAllocationSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').optional(),
  value: z.number().positive('Valor deve ser positivo').optional(),
  startDate: z.string().datetime().optional(),
  installments: z.number().int().positive().optional(),
  interestRate: z.number().positive().optional(),
});

type CreateAllocationInput = z.infer<typeof CreateAllocationSchema>;
type UpdateAllocationInput = z.infer<typeof UpdateAllocationSchema>;

// Serviço de alocações
const allocationService = {
  async createAllocation(simulationId: number, input: CreateAllocationInput) {
    const allocation = await prisma.allocation.create({
      data: {
        simulationId,
        type: input.type,
        name: input.name,
        value: input.value,
        startDate: input.startDate ? new Date(input.startDate) : null,
        installments: input.installments || null,
        interestRate: input.interestRate || null,
      },
      include: {
        records: {
          orderBy: { date: 'desc' },
        },
      },
    });

    return allocation;
  },

  async getAllocation(id: number) {
    const allocation = await prisma.allocation.findUnique({
      where: { id },
      include: {
        records: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!allocation) {
      throw new Error('Alocação não encontrada');
    }

    return allocation;
  },

  async updateAllocation(id: number, input: UpdateAllocationInput) {
    const data: any = { ...input };

    // Converte a data se for uma string
    if (data.startDate && typeof data.startDate === 'string') {
      data.startDate = new Date(data.startDate);
    }

    const allocation = await prisma.allocation.update({
      where: { id },
      data,
      include: {
        records: {
          orderBy: { date: 'desc' },
        },
      },
    });

    return allocation;
  },

  async deleteAllocation(id: number) {
    try {
      await prisma.allocation.delete({
        where: { id },
      });
      return { id, deleted: true };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new Error('Alocação não encontrada');
      }
      throw error;
    }
  },

  // Botão "Atualizar": cria registro novo na data atual
  async updateAllocationCurrentValue(allocationId: number, value: number, notes?: string) {
    // Verificar se a alocação existe
    const allocation = await prisma.allocation.findUnique({
      where: { id: allocationId },
    });

    if (!allocation) {
      throw new Error('Alocação não encontrada');
    }

    const record = await prisma.assetRecord.create({
      data: {
        allocationId,
        date: new Date(),
        value,
        notes,
      },
    });

    return record;
  },

  async getAllocationRecords(allocationId: number) {
    // Verificar se a alocação existe
    const allocation = await prisma.allocation.findUnique({
      where: { id: allocationId },
    });

    if (!allocation) {
      throw new Error('Alocação não encontrada');
    }

    return prisma.assetRecord.findMany({
      where: { allocationId },
      orderBy: { date: 'desc' },
    });
  },

  // Buscar alocações por simulação
  async getAllocationsBySimulation(simulationId: number) {
    return prisma.allocation.findMany({
      where: { simulationId },
      include: {
        records: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async getSimulationAllocations(simulationId: number) {
    // Verificar se a simulação existe
    const simulation = await prisma.simulation.findUnique({
      where: { id: simulationId },
    });

    if (!simulation) {
      throw new Error('Simulação não encontrada');
    }

    return prisma.allocation.findMany({
      where: { simulationId },
      include: {
        records: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },
};

export default async function (app: FastifyInstance) {
  // Listar todas as alocações
  app.get<{
    Querystring: { simulationId?: string };
    Reply: any[] | { status: string; message: string };
  }>(
    '/allocations',
    {
      schema: {
        summary: 'Lista todas as alocações ou filtra por simulação',
        tags: ['Alocações'],
        querystring: {
          type: 'object',
          properties: {
            simulationId: { type: 'string', pattern: '^\\d+$' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { simulationId } = request.query;

        if (simulationId) {
          const allocations = await allocationService.getSimulationAllocations(parseInt(simulationId));
          return allocations;
        } else {
          // Listar todas as alocações
          const allocations = await prisma.allocation.findMany({
            include: {
              records: {
                orderBy: { date: 'desc' },
              },
            },
            orderBy: { createdAt: 'desc' },
          });
          return allocations;
        }
      } catch (error: any) {
        if (error.message === 'Simulação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao buscar alocações',
        });
      }
    }
  );

  // Criar uma nova alocação
  app.post<{
    Body: CreateAllocationInput;
    Reply: any | { status: string; message: string; errors?: any[] };
  }>(
    '/allocations',
    {
      schema: {
        summary: 'Cria uma nova alocação para uma simulação',
        tags: ['Alocações'],
        body: {
          type: 'object',
          required: ['simulationId', 'type', 'name', 'value'],
          properties: {
            simulationId: { type: 'number', description: 'ID da simulação' },
            type: {
              type: 'string',
              enum: ['FINANCIAL', 'IMMOBILIZED', 'FINANCEIRA', 'IMOBILIZADA'],
              description: 'Tipo da alocação',
            },
            name: { type: 'string', minLength: 3, description: 'Nome da alocação' },
            value: { type: 'number', minimum: 0, description: 'Valor da alocação' },
            startDate: { type: 'string', format: 'date-time', description: 'Data de início' },
            installments: { type: 'number', minimum: 1, description: 'Número de parcelas' },
            interestRate: { type: 'number', minimum: 0, description: 'Taxa de juros' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = CreateAllocationSchema.parse(request.body);

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

        const allocation = await allocationService.createAllocation(body.simulationId, body);

        return reply.status(201).send(allocation);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            status: 'error',
            message: 'Dados inválidos',
            errors: error.errors,
          });
        }
        return reply.status(500).send({
          message: 'Erro ao criar alocação',
        });
      }
    }
  );

  // Atualizar uma alocação
  app.put<{
    Params: { id: string };
    Body: UpdateAllocationInput;
    Reply: any | { status: string; message: string; errors?: any[] };
  }>(
    '/allocations/:id',
    {
      schema: {
        summary: 'Atualiza uma alocação existente',
        tags: ['Alocações'],
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
            value: { type: 'number', minimum: 0 },
            startDate: { type: 'string', format: 'date-time' },
            installments: { type: 'number', minimum: 1 },
            interestRate: { type: 'number', minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
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

        const updatedAllocation = await allocationService.updateAllocation(parseInt(id), body);

        return updatedAllocation;
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            status: 'error',
            message: 'Dados inválidos',
            errors: error.errors,
          });
        }
        if (error.message === 'Alocação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Alocação não encontrada',
          });
        }
        if (error.code === 'P2025') {
          return reply.status(404).send({
            status: 'error',
            message: 'Alocação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao atualizar alocação',
        });
      }
    }
  );

  // Obter uma alocação específica
  app.get<{
    Params: { id: string };
    Reply: any | { status: string; message: string };
  }>(
    '/allocations/:id',
    {
      schema: {
        summary: 'Obtém uma alocação pelo ID',
        tags: ['Alocações'],
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
        const allocation = await allocationService.getAllocation(parseInt(id));

        if (!allocation) {
          return reply.status(404).send({
            status: 'error',
            message: 'Alocação não encontrada',
          });
        }

        return allocation;
      } catch (error: any) {
        if (error.message === 'Alocação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Alocação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao buscar alocação',
        });
      }
    }
  );

  // Adicionar registro a uma alocação
  app.post<{
    Params: { id: string };
    Body: { value: number; notes?: string };
    Reply: any | { status: string; message: string; errors?: any[] };
  }>(
    '/allocations/:id/records',
    {
      schema: {
        summary: 'Adiciona um registro de valor a uma alocação',
        tags: ['Alocações'],
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
        const body = CreateAllocationRecordSchema.parse(request.body);
        const { value, notes } = body;

        // Em produção, verificar se a alocação existe e pertence ao usuário
        // const allocation = await allocationService.getAllocation(parseInt(id));
        // if (!allocated) {
        //   return reply.status(404).send({
        //     status: 'error',
        //     message: 'Alocação não encontrada'
        //   });
        // }

        const record = await allocationService.updateAllocationCurrentValue(
          parseInt(id),
          value,
          notes
        );

        return reply.status(201).send(record);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            status: 'error',
            message: 'Dados inválidos',
            errors: error.errors,
          });
        }
        if (error.message === 'Alocação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Alocação não encontrada',
          });
        }
        if (error.code === 'P2025') {
          return reply.status(404).send({
            status: 'error',
            message: 'Alocação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao adicionar registro de valor',
        });
      }
    }
  );

  // Deletar uma alocação
  app.delete<{
    Params: { id: string };
    Reply: { id: number; deleted: boolean } | { status: string; message: string };
  }>(
    '/allocations/:id',
    {
      schema: {
        summary: 'Remove uma alocação',
        tags: ['Alocações'],
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
        const result = await allocationService.deleteAllocation(parseInt(id));
        return result;
      } catch (error: any) {
        if (error.message === 'Alocação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Alocação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao remover alocação',
        });
      }
    }
  );

  // Listar registros históricos de uma alocação
  app.get<{
    Params: { id: string };
    Reply: any[] | { status: string; message: string };
  }>(
    '/allocations/:id/records',
    {
      schema: {
        summary: 'Lista os registros históricos de uma alocação',
        tags: ['Alocações'],
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
        const records = await allocationService.getAllocationRecords(parseInt(id));
        return records;
      } catch (error: any) {
        if (error.message === 'Alocação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Alocação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao buscar registros históricos',
        });
      }
    }
  );

  // Listar alocações de uma simulação
  app.get<{
    Params: { simulationId: string };
    Reply: any[] | { status: string; message: string };
  }>(
    '/simulations/:simulationId/allocations',
    {
      schema: {
        summary: 'Lista as alocações de uma simulação',
        tags: ['Alocações'],
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
        const simulationAllocations = await allocationService.getSimulationAllocations(
          parseInt(simulationId)
        );
        return simulationAllocations;
      } catch (error: any) {
        if (error.message === 'Simulação não encontrada') {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao buscar alocações da simulação',
        });
      }
    }
  );
}
