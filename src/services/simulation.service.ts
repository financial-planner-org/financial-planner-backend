import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Esquema de validação para criar uma simulação
export const CreateSimulationSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional().nullable(),
  status: z.enum(['ATIVO', 'INATIVO', 'SITUACAO_ATUAL']).default('ATIVO'),
  baseId: z.number().optional().nullable(),
  clientId: z.number().int().positive('ID do cliente deve ser positivo'),
  startDate: z.union([z.string().datetime(), z.date()]).default(new Date().toISOString()),
  realRate: z.number().default(0)
});

export type CreateSimulationInput = z.infer<typeof CreateSimulationSchema>;

export type UpdateSimulationInput = {
  name?: string;
  description?: string | null;
  status?: 'ATIVO' | 'INATIVO' | 'SITUACAO_ATUAL';
  realRate?: number;
  startDate?: Date | string;
  clientId?: number;
};

// Definir o tipo de retorno das funções
export type Simulation = {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  baseId: number | null;
  clientId: number;
  startDate: Date;
  realRate: number;
  createdAt: Date;
  updatedAt: Date;
};

// Função auxiliar para criar dados de simulação com tipos corretos
const createSimulationData = (data: CreateSimulationInput) => {
  return {
    name: data.name,
    description: data.description ?? null,
    status: data.status,
    startDate: new Date(data.startDate || new Date()),
    realRate: data.realRate,
    baseId: data.baseId ?? null,
    clientId: data.clientId
  };
};

export const simulationService = {
  async createSimulation(input: CreateSimulationInput): Promise<Simulation> {
    try {
      // Valida os dados de entrada
      const validatedData = CreateSimulationSchema.parse(input);

      // Cria a simulação no banco de dados
      const simulation = await prisma.simulation.create({
        data: createSimulationData(validatedData)
      });

      return simulation;
    } catch (error: unknown) {
      console.error('Erro ao criar simulação:', error);
      throw error;
    }
  },

  async getSimulation(id: number): Promise<Simulation | null> {
    return prisma.simulation.findUnique({
      where: { id }
    });
  },

  async getSimulationsByClient(clientId: number): Promise<Simulation[]> {
    return prisma.simulation.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' }
    });
  },

  async updateSimulation(id: number, input: UpdateSimulationInput): Promise<Simulation> {
    try {
      const data: any = { ...input };

      // Converte a data se for uma string
      if (data.startDate && typeof data.startDate === 'string') {
        data.startDate = new Date(data.startDate);
      }

      return prisma.simulation.update({
        where: { id },
        data
      });
    } catch (error) {
      console.error('Erro ao atualizar simulação:', error);
      throw error;
    }
  },

  async deleteSimulation(id: number): Promise<{ id: number; deleted: boolean }> {
    await prisma.simulation.delete({
      where: { id }
    });

    return { id, deleted: true };
  },

  async duplicateSimulation(id: number, newName?: string): Promise<Simulation> {
    try {
      // Busca a simulação original
      const original = await prisma.simulation.findUnique({
        where: { id }
      });

      if (!original) {
        throw new Error('Simulação não encontrada');
      }

      // Cria uma cópia da simulação original
      const newSimulation = await prisma.simulation.create({
        data: {
          name: newName || `Cópia de ${original.name}`,
          description: original.description ?? null,
          status: original.status,
          startDate: original.startDate,
          realRate: original.realRate,
          baseId: original.id,
          clientId: original.clientId
        }
      });

      return newSimulation;
    } catch (error) {
      console.error('Erro ao duplicar simulação:', error);
      throw error;
    }
  }
};
