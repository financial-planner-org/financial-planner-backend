import { z } from 'zod';

// Esquema de validação para criar uma simulação
export const CreateSimulationSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  initialAmount: z.number().positive('Valor inicial deve ser positivo'),
  monthlyContribution: z.number().min(0, 'Contribuição mensal não pode ser negativa'),
  months: z.number().int('Meses deve ser um número inteiro').positive('Meses deve ser maior que zero'),
  annualInterestRate: z.number().positive('Taxa de juros deve ser positiva')
});

export type CreateSimulationInput = z.infer<typeof CreateSimulationSchema>;

export const simulationService = {
  async createSimulation(input: CreateSimulationInput) {
    // Aqui iria a lógica de negócio para criar a simulação
    // Por enquanto, apenas retornamos os dados validados
    return {
      id: 'sim-' + Math.random().toString(36).substring(2, 9),
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },
  
  async getSimulation(id: string) {
    // Simulação de busca de simulação por ID
    return {
      id,
      name: 'Minha Simulação',
      initialAmount: 1000,
      monthlyContribution: 100,
      months: 12,
      annualInterestRate: 0.1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
};
