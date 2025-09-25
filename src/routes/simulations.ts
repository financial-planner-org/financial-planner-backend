import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// Esquema de validação simplificado
const CreateSimulationSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  initialAmount: z.number().positive('Valor inicial deve ser positivo'),
  monthlyContribution: z.number().min(0, 'Contribuição mensal não pode ser negativa'),
  months: z.number().int('Meses deve ser um número inteiro').positive('Meses deve ser maior que zero'),
  annualInterestRate: z.number().positive('Taxa de juros deve ser positiva')
});

type CreateSimulationInput = z.infer<typeof CreateSimulationSchema>;

// Serviço de simulação simplificado
const simulationService = {
  createSimulation: (input: CreateSimulationInput) => ({
    id: 'sim-' + Math.random().toString(36).substring(2, 9),
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }),
  
  getSimulation: (id: string) => ({
    id,
    name: 'Minha Simulação',
    initialAmount: 1000,
    monthlyContribution: 100,
    months: 12,
    annualInterestRate: 0.1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
};

export default async function (app: FastifyInstance) {
  // Rota de teste
  app.get('/test', async () => {
    return { status: 'ok', message: 'API is working' };
  });

  // Rota para criar uma nova simulação (simplificada)
  app.post('/simulations', async (request, reply) => {
    try {
      const body = CreateSimulationSchema.parse(request.body);
      const simulation = simulationService.createSimulation(body);
      return reply.status(200).send({
        id: simulation.id,
        name: simulation.name,
        status: 'created'
      });
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

  // Rota para buscar uma simulação por ID (simplificada)
  app.get<{ Params: { id: string } }>('/simulations/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const simulation = simulationService.getSimulation(id);
      return simulation;
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        message: 'Erro ao buscar simulação'
      });
    }
  });
}
