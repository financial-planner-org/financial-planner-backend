import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// Esquemas de validação 
const InsuranceSchema = z.object({
  simulationId: z.number().int().positive('ID da simulação deve ser positivo'),
  type: z.enum(['VIDA', 'RESIDENCIAL', 'AUTOMOVEL', 'OUTRO'], {
    errorMap: () => ({ message: 'Tipo de seguro inválido' })
  }),
  value: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  startDate: z.string().datetime('Data de início inválida'),
  endDate: z.string().datetime('Data de término inválida').optional(),
  isActive: z.boolean().default(true),
  paymentFrequency: z.enum(['MENSAL', 'ANUAL', 'UNICO']).default('MENSAL'),
  beneficiary: z.string().optional(),
  policyNumber: z.string().optional()
});

const UpdateInsuranceSchema = InsuranceSchema.partial().omit({ simulationId: true });

type InsuranceInput = z.infer<typeof InsuranceSchema>;
type UpdateInsuranceInput = z.infer<typeof UpdateInsuranceSchema>;

// Serviço de seguros
const insuranceService = {
  async createInsurance(input: InsuranceInput) {
    // Em produção, isso seria salvo no banco de dados
    return {
      id: Math.floor(Math.random() * 10000),
      ...input,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async getInsurance(id: number) {
    // Em produção, buscaria do banco de dados
    return {
      id,
      simulationId: 1,
      type: 'VIDA',
      value: 500,
      description: 'Seguro de vida',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano depois
      isActive: true,
      paymentFrequency: 'MENSAL',
      beneficiary: 'Família',
      policyNumber: 'POL123456789',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async updateInsurance(id: number, input: UpdateInsuranceInput) {
    // Em produção, atualizaria no banco de dados
    const insurance = await this.getInsurance(id);
    return { ...insurance, ...input, updatedAt: new Date() };
  },

  async deleteInsurance(id: number) {
    // Em produção, removeria ou desativaria no banco de dados
    return { id, deleted: true };
  },

  async getSimulationInsurances(simulationId: number) {
    // Em produção, buscaria do banco de dados com paginação
    return [
      {
        id: 1,
        simulationId,
        type: 'VIDA',
        value: 500,
        description: 'Seguro de vida',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        paymentFrequency: 'MENSAL',
        beneficiary: 'Família',
        policyNumber: 'POL123456789',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        simulationId,
        type: 'RESIDENCIAL',
        value: 1200,
        description: 'Seguro residencial',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        paymentFrequency: 'ANUAL',
        policyNumber: 'POL987654321',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }
};

export default async function (app: FastifyInstance) {
  // Listar todos os seguros de uma simulação
  app.get<{ Params: { simulationId: string } }>('/simulations/:simulationId/insurances', {
    schema: {
      summary: 'Lista todos os seguros de uma simulação',
      tags: ['Seguros'],
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

      const insurances = await insuranceService.getSimulationInsurances(parseInt(simulationId));
      return insurances;
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao listar seguros'
      });
    }
  });

  //  Criar um novo seguro
  app.post<{ 
    Body: InsuranceInput;
    Params: { simulationId: string } 
  }>('/simulations/:simulationId/insurances', {
    schema: {
      summary: 'Cria um novo seguro para uma simulação',
      tags: ['Seguros'],
      params: {
        type: 'object',
        properties: {
          simulationId: { type: 'string', pattern: '^\\d+$' }
        },
        required: ['simulationId']
      },
      body: {
        type: 'object',
        required: ['type', 'value', 'description', 'startDate'],
        properties: {
          type: { type: 'string', enum: ['VIDA', 'RESIDENCIAL', 'AUTOMOVEL', 'OUTRO'] },
          value: { type: 'number' },
          description: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          isActive: { type: 'boolean' },
          paymentFrequency: { type: 'string', enum: ['MENSAL', 'ANUAL', 'UNICO'] },
          beneficiary: { type: 'string' },
          policyNumber: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { simulationId } = request.params;
      const body = InsuranceSchema.parse({
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

      const insurance = await insuranceService.createInsurance(body);
      
      return reply.status(201).send(insurance);
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
        message: 'Erro ao criar seguro'
      });
    }
  });

  // Obter um seguro por ID
  app.get<{ Params: { id: string } }>('/insurances/:id', {
    schema: {
      summary: 'Obtém um seguro pelo ID',
      tags: ['Seguros'],
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
      const insurance = await insuranceService.getInsurance(parseInt(id));
      
      if (!insurance) {
        return reply.status(404).send({
          status: 'error',
          message: 'Seguro não encontrado'
        });
      }
      
      return insurance;
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao buscar seguro'
      });
    }
  });

  // Atualizar um seguro
  app.put<{ Params: { id: string }, Body: UpdateInsuranceInput }>('/insurances/:id', {
    schema: {
      summary: 'Atualiza um seguro existente',
      tags: ['Seguros'],
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
          type: { type: 'string', enum: ['VIDA', 'RESIDENCIAL', 'AUTOMOVEL', 'OUTRO'] },
          value: { type: 'number' },
          description: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          isActive: { type: 'boolean' },
          paymentFrequency: { type: 'string', enum: ['MENSAL', 'ANUAL', 'UNICO'] },
          beneficiary: { type: 'string' },
          policyNumber: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
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

      const updatedInsurance = await insuranceService.updateInsurance(
        parseInt(id),
        body
      );
      
      return updatedInsurance;
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
        message: 'Erro ao atualizar seguro'
      });
    }
  });

  //Remover um seguro
  app.delete<{ Params: { id: string } }>('/insurances/:id', {
    schema: {
      summary: 'Remove um seguro',
      tags: ['Seguros'],
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
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao remover seguro'
      });
    }
  });
}