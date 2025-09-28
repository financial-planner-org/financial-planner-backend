import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Esquema de validação para criar um cliente
export const CreateClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email deve ter formato válido'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;

export type UpdateClientInput = {
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  isActive?: boolean;
};

// Definir o tipo de retorno das funções
export type Client = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const clientService = {
  async createClient(input: CreateClientInput): Promise<Client> {
    try {
      // Valida os dados de entrada
      const validatedData = CreateClientSchema.parse(input);

      // Cria o cliente no banco de dados
      const client = await prisma.client.create({
        data: validatedData,
      });

      return client;
    } catch (error: unknown) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  },

  async getClient(id: number): Promise<Client | null> {
    return prisma.client.findUnique({
      where: { id },
    });
  },

  async getClients(): Promise<Client[]> {
    return prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  async getAllClients(): Promise<Client[]> {
    return prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  async getActiveClients(): Promise<Client[]> {
    return prisma.client.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async activateClient(id: number): Promise<Client> {
    try {
      return prisma.client.update({
        where: { id },
        data: { isActive: true },
      });
    } catch (error) {
      console.error('Erro ao ativar cliente:', error);
      throw error;
    }
  },

  async deactivateClient(id: number): Promise<Client> {
    try {
      return prisma.client.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      console.error('Erro ao desativar cliente:', error);
      throw error;
    }
  },

  async updateClient(id: number, input: UpdateClientInput): Promise<Client> {
    try {
      return prisma.client.update({
        where: { id },
        data: input,
      });
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }
  },

  async deleteClient(id: number): Promise<{ id: number; deleted: boolean }> {
    await prisma.client.delete({
      where: { id },
    });

    return { id, deleted: true };
  },

  async getClientByEmail(email: string): Promise<Client | null> {
    return prisma.client.findUnique({
      where: { email },
    });
  },
};
