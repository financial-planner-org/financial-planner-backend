import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../prisma/client';

// Esquemas de validação
const InsuranceSchema = z.object({
  simulationId: z.number().int().positive('ID da simulação deve ser positivo'),
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  startDate: z.string().datetime('Data de início inválida'),
  durationMonths: z.number().int().positive('Duração deve ser um número positivo'),
  premium: z.number().positive('Prêmio deve ser positivo'),
  insuredValue: z.number().positive('Valor segurado deve ser positivo'),
  type: z.enum(['LIFE', 'DISABILITY', 'VIDA', 'INVALIDEZ']).default('LIFE'),
});

const UpdateInsuranceSchema = InsuranceSchema.partial().omit({ simulationId: true });

type InsuranceInput = z.infer<typeof InsuranceSchema>;
type UpdateInsuranceInput = z.infer<typeof UpdateInsuranceSchema>;

// Serviço de seguros
const insuranceService = {
  async createInsurance(input: InsuranceInput) {
    const insurance = await prisma.insurance.create({
      data: {
        simulationId: input.simulationId,
        name: input.name,
        startDate: new Date(input.startDate),
        durationMonths: input.durationMonths,
        premium: input.premium,
        insuredValue: input.insuredValue,
        type: input.type,
      },
    });

    return insurance;
  },

  async getInsurance(id: number) {
    const insurance = await prisma.insurance.findUnique({
      where: { id },
    });

    if (!insurance) {
      throw new Error('Seguro não encontrado');
    }

    return insurance;
  },

  async updateInsurance(id: number, input: UpdateInsuranceInput) {
    try {
      const data: any = { ...input };

      // Converte a data se for uma string
      if (data.startDate && typeof data.startDate === 'string') {
        data.startDate = new Date(data.startDate);
      }

      const insurance = await prisma.insurance.update({
        where: { id },
        data,
      });

      return insurance;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new Error('Seguro não encontrado');
      }
      throw error;
    }
  },

  async deleteInsurance(id: number) {
    try {
      await prisma.insurance.delete({
        where: { id },
      });
      return { id, deleted: true };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new Error('Seguro não encontrado');
      }
      throw error;
    }
  },

  async getSimulationInsurances(simulationId: number) {
    return prisma.insurance.findMany({
      where: { simulationId },
      orderBy: { startDate: 'asc' },
    });
  },

  // Calcular valor total segurado por simulação
  async getTotalInsuredValue(simulationId: number) {
    const result = await prisma.insurance.aggregate({
      where: { simulationId },
      _sum: {
        insuredValue: true,
      },
    });

    return result._sum.insuredValue || 0;
  },
};

export default async function (app: FastifyInstance) {
  // Listar todos os seguros
  app.get<{
    Querystring: { simulationId?: string; type?: string };
    Reply: any[] | { status: string; message: string };
  }>(
    '/insurances',
    {
      schema: {
        summary: 'Lista todos os seguros ou filtra por simulação e tipo',
        tags: ['Seguros'],
        querystring: {
          type: 'object',
          properties: {
            simulationId: { type: 'string', pattern: '^\\d+$' },
            type: { type: 'string', enum: ['LIFE', 'DISABILITY', 'VIDA', 'INVALIDEZ'] },
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

        const insurances = await prisma.insurance.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });

        return insurances;
      } catch (error: any) {
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao buscar seguros',
        });
      }
    }
  );

  // Listar todos os seguros de uma simulação
  app.get<{ Params: { simulationId: string } }>(
    '/simulations/:simulationId/insurances',
    {
      schema: {
        summary: 'Lista todos os seguros de uma simulação',
        tags: ['Seguros'],
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

        // Verificar se a simulação existe
        const simulation = await prisma.simulation.findUnique({
          where: { id: parseInt(simulationId) },
        });
        if (!simulation) {
          return reply.status(404).send({
            status: 'error',
            message: 'Simulação não encontrada',
          });
        }

        const insurances = await insuranceService.getSimulationInsurances(parseInt(simulationId));
        return insurances;
      } catch (error) {
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao listar seguros',
        });
      }
    }
  );

  //  Criar um novo seguro
  app.post<{
    Body: InsuranceInput;
  }>(
    '/insurances',
    {
      schema: {
        summary: 'Cria um novo seguro para uma simulação',
        tags: ['Seguros'],
        body: {
          type: 'object',
          required: [
            'simulationId',
            'name',
            'startDate',
            'durationMonths',
            'premium',
            'insuredValue',
          ],
          properties: {
            simulationId: { type: 'number', description: 'ID da simulação' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['LIFE', 'DISABILITY', 'VIDA', 'INVALIDEZ'] },
            startDate: { type: 'string', format: 'date-time' },
            durationMonths: { type: 'number' },
            premium: { type: 'number' },
            insuredValue: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = InsuranceSchema.parse(request.body);

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

        const insurance = await insuranceService.createInsurance(body);

        return reply.status(201).send(insurance);
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
          message: 'Erro ao criar seguro',
        });
      }
    }
  );

  // Obter um seguro por ID
  app.get<{ Params: { id: string } }>(
    '/insurances/:id',
    {
      schema: {
        summary: 'Obtém um seguro pelo ID',
        tags: ['Seguros'],
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
        const insurance = await insuranceService.getInsurance(parseInt(id));

        return insurance;
      } catch (error) {
        if ((error as any).message === 'Seguro não encontrado') {
          return reply.status(404).send({
            status: 'error',
            message: 'Seguro não encontrado',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao buscar seguro',
        });
      }
    }
  );

  // Atualizar um seguro
  app.put<{ Params: { id: string }; Body: UpdateInsuranceInput }>(
    '/insurances/:id',
    {
      schema: {
        summary: 'Atualiza um seguro existente',
        tags: ['Seguros'],
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
            type: { type: 'string', enum: ['LIFE', 'DISABILITY', 'VIDA', 'INVALIDEZ'] },
            startDate: { type: 'string', format: 'date-time' },
            durationMonths: { type: 'number' },
            premium: { type: 'number' },
            insuredValue: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const body = UpdateInsuranceSchema.parse(request.body);

        // Verificar se o seguro existe (em produção)
        // const existingInsurance = await insuranceService.getInsurance(parseInt(id));
        // if (!existingInsurance) {
        //   return reply.status(404).send({
        //     status: 'error',
        //     message: 'Seguro não encontrado'
        //   });
        // }

        const updatedInsurance = await insuranceService.updateInsurance(parseInt(id), body);

        return updatedInsurance;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            status: 'error',
            message: 'Dados inválidos',
            errors: error.errors,
          });
        }
        if ((error as any).message === 'Seguro não encontrado') {
          return reply.status(404).send({
            status: 'error',
            message: 'Seguro não encontrado',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao atualizar seguro',
        });
      }
    }
  );

  //Remover um seguro
  app.delete<{ Params: { id: string } }>(
    '/insurances/:id',
    {
      schema: {
        summary: 'Remove um seguro',
        tags: ['Seguros'],
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

        // Verificar se o seguro existe (em produção)
        // const existingInsurance = await insuranceService.getInsurance(parseInt(id));
        // if (!existingInsurance) {
        //   return reply.status(404).send({
        //     status: 'error',
        //     message: 'Seguro não encontrado'
        //   });
        // }

        await insuranceService.deleteInsurance(parseInt(id));
        return { status: 'success', message: 'Seguro removido com sucesso' };
      } catch (error) {
        if ((error as any).message === 'Seguro não encontrado') {
          return reply.status(404).send({
            status: 'error',
            message: 'Seguro não encontrado',
          });
        }
        return reply.status(500).send({
          status: 'error',
          message: 'Erro ao remover seguro',
        });
      }
    }
  );
}
