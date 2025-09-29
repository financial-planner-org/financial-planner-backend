import { simulationService, type CreateSimulationInput } from '../../src/services/simulation.service';
import { describe, expect, it, beforeAll, afterAll, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Simulation Service', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Limpar os dados após cada teste
    await prisma.simulation.deleteMany({});
  });

  describe('createSimulation', () => {
    it('deve criar uma simulação com sucesso', async () => {
      // Arrange
      const input: CreateSimulationInput = {
        name: 'Minha Primeira Simulação',
        description: 'Descrição da simulação',
        realRate: 0.1,
        status: 'ATIVO',
        startDate: new Date().toISOString()
      };

      // Act
      const result = await simulationService.createSimulation(input);

      // Assert
      expect(result).toMatchObject({
        name: input.name,
        description: input.description,
        realRate: input.realRate,
        status: 'ATIVO'
      });
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      // userId não é mais esperado no resultado
    });

    it('deve lançar erro se o nome for muito curto', async () => {
      // Arrange
      const input = {
        name: 'ab', // Nome com menos de 3 caracteres
        realRate: 0.1,
        status: 'ATIVO',
        startDate: new Date().toISOString()
      };

      // Act & Assert
      await expect(simulationService.createSimulation(input as any))
        .rejects
        .toThrow('Nome deve ter no mínimo 3 caracteres');
    });
  });

  describe('getSimulation', () => {
    it('deve retornar uma simulação existente', async () => {
      // Arrange
      const createdSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação de Teste',
          startDate: new Date(),
          realRate: 0.1,
          status: 'ATIVO'
        }
      });
      
      // Act
      const result = await simulationService.getSimulation(createdSimulation.id);
      
      // Assert
      expect(result).toMatchObject({
        id: createdSimulation.id,
        name: 'Simulação de Teste',
        realRate: 0.1,
        status: 'ATIVO',
        description: null,
        baseId: null,
        startDate: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('deve retornar null para uma simulação inexistente', async () => {
      // Act
      const result = await simulationService.getSimulation(99999);
      
      // Assert
      expect(result).toBeNull();
    });
  });
});
