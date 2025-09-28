import {
  simulationService,
  type CreateSimulationInput,
} from '../../src/services/simulation.service';
import { prisma } from '../setup';

describe('Serviço de Simulações - Lógica de Negócio', () => {
  let testClient: any;

  beforeEach(async () => {
    // Limpar banco de dados
    await prisma.simulation.deleteMany({});
    await prisma.client.deleteMany({});

    // Criar cliente de teste
    testClient = await prisma.client.create({
      data: {
        name: 'Cliente Teste Serviço',
        email: 'teste.servico@exemplo.com',
      },
    });
  });

  afterEach(async () => {
    // Limpar dados após cada teste
    await prisma.simulation.deleteMany({});
    await prisma.client.deleteMany({});
  });

  describe('createSimulation - Criar Simulação', () => {
    it('deve criar uma simulação com sucesso', async () => {
      // Arrange
      const input: CreateSimulationInput = {
        name: 'Minha Primeira Simulação',
        description: 'Descrição da simulação',
        realRate: 0.1,
        status: 'ATIVO',
        startDate: new Date().toISOString(),
        clientId: testClient.id,
      };

      // Act
      const result = await simulationService.createSimulation(input);

      // Assert
      expect(result).toMatchObject({
        name: input.name,
        description: input.description,
        realRate: input.realRate,
        status: input.status,
        clientId: input.clientId,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('deve lançar erro se o nome for muito curto', async () => {
      // Arrange
      const input: CreateSimulationInput = {
        name: 'Mi',
        description: 'Descrição da simulação',
        realRate: 0.1,
        status: 'ATIVO',
        startDate: new Date().toISOString(),
        clientId: testClient.id,
      };

      // Act & Assert
      await expect(simulationService.createSimulation(input)).rejects.toThrow(
        'Nome deve ter no mínimo 3 caracteres'
      );
    });

    it('deve lançar erro se o cliente não existir', async () => {
      // Arrange
      const input: CreateSimulationInput = {
        name: 'Simulação Inválida',
        description: 'Descrição da simulação',
        realRate: 0.1,
        status: 'ATIVO',
        startDate: new Date().toISOString(),
        clientId: 99999, // Cliente inexistente
      };

      // Act & Assert
      await expect(simulationService.createSimulation(input)).rejects.toThrow();
    });
  });

  describe('getSimulation - Buscar Simulação', () => {
    it('deve retornar uma simulação existente', async () => {
      // Arrange
      const createdSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação de Teste',
          startDate: new Date(),
          realRate: 0.1,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      // Act
      const result = await simulationService.getSimulation(createdSimulation.id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.name).toBe('Simulação de Teste');
      expect(result?.id).toBe(createdSimulation.id);
    });

    it('deve retornar null para uma simulação inexistente', async () => {
      // Act
      const result = await simulationService.getSimulation(99999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateSimulation - Atualizar Simulação', () => {
    it('deve atualizar uma simulação existente', async () => {
      // Arrange
      const createdSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Original',
          startDate: new Date(),
          realRate: 0.1,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const updateData = {
        name: 'Simulação Atualizada',
        realRate: 0.15,
      };

      // Act
      const result = await simulationService.updateSimulation(createdSimulation.id, updateData);

      // Assert
      expect(result.name).toBe(updateData.name);
      expect(result.realRate).toBe(updateData.realRate);
      expect(result.id).toBe(createdSimulation.id);
    });

    it('deve lançar erro ao tentar atualizar simulação inexistente', async () => {
      // Arrange
      const updateData = {
        name: 'Simulação Inexistente',
      };

      // Act & Assert
      await expect(simulationService.updateSimulation(99999, updateData)).rejects.toThrow();
    });
  });

  describe('deleteSimulation - Deletar Simulação', () => {
    it('deve deletar uma simulação existente', async () => {
      // Arrange
      const createdSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação para Deletar',
          startDate: new Date(),
          realRate: 0.1,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      // Act
      await simulationService.deleteSimulation(createdSimulation.id);

      // Assert
      const deletedSimulation = await prisma.simulation.findUnique({
        where: { id: createdSimulation.id },
      });
      expect(deletedSimulation).toBeNull();
    });

    it('deve lançar erro ao tentar deletar simulação inexistente', async () => {
      // Act & Assert
      await expect(simulationService.deleteSimulation(99999)).rejects.toThrow();
    });
  });

  describe('duplicateSimulation - Duplicar Simulação', () => {
    it('deve duplicar uma simulação existente', async () => {
      // Arrange
      const originalSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Original',
          startDate: new Date(),
          realRate: 0.1,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const duplicateData = {
        name: 'Simulação Duplicada',
      };

      // Act
      const result = await simulationService.duplicateSimulation(
        originalSimulation.id,
        duplicateData
      );

      // Assert
      expect(result.name).toBe(duplicateData.name);
      expect(result.baseId).toBe(originalSimulation.id);
      expect(result.clientId).toBe(testClient.id);
      expect(result.realRate).toBe(originalSimulation.realRate);
      expect(result.id).not.toBe(originalSimulation.id);
    });

    it('deve lançar erro ao tentar duplicar simulação inexistente', async () => {
      // Arrange
      const duplicateData = {
        name: 'Simulação Inexistente',
      };

      // Act & Assert
      await expect(simulationService.duplicateSimulation(99999, duplicateData)).rejects.toThrow();
    });
  });

  describe('createCurrentSituation - Criar Situação Atual', () => {
    it('deve criar situação atual a partir de simulação existente', async () => {
      // Arrange
      const baseSimulation = await prisma.simulation.create({
        data: {
          name: 'Plano Original',
          startDate: new Date('2025-01-01'),
          realRate: 0.1,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      // Act
      const result = await simulationService.createCurrentSituation(baseSimulation.id);

      // Assert
      expect(result.status).toBe('SITUACAO_ATUAL');
      expect(result.name).toContain(baseSimulation.name);
      expect(result.baseId).toBe(baseSimulation.id);
      expect(result.clientId).toBe(testClient.id);
      expect(result.startDate).toBeDefined();
    });

    it('deve lançar erro ao tentar criar situação atual de simulação inexistente', async () => {
      // Act & Assert
      await expect(simulationService.createCurrentSituation(99999)).rejects.toThrow();
    });
  });

  describe('getSimulationsByClient - Buscar Simulações por Cliente', () => {
    it('deve retornar simulações de um cliente específico', async () => {
      // Arrange
      const simulation1 = await prisma.simulation.create({
        data: {
          name: 'Simulação 1',
          startDate: new Date(),
          realRate: 0.1,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const simulation2 = await prisma.simulation.create({
        data: {
          name: 'Simulação 2',
          startDate: new Date(),
          realRate: 0.15,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      // Criar simulação de outro cliente
      const otherClient = await prisma.client.create({
        data: {
          name: 'Outro Cliente',
          email: 'outro@exemplo.com',
        },
      });

      await prisma.simulation.create({
        data: {
          name: 'Simulação Outro Cliente',
          startDate: new Date(),
          realRate: 0.1,
          status: 'ATIVO',
          clientId: otherClient.id,
        },
      });

      // Act
      const result = await simulationService.getSimulationsByClient(testClient.id);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map(s => s.id)).toContain(simulation1.id);
      expect(result.map(s => s.id)).toContain(simulation2.id);
    });

    it('deve retornar lista vazia para cliente sem simulações', async () => {
      // Act
      const result = await simulationService.getSimulationsByClient(testClient.id);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('Verificação de Status e Permissões', () => {
    it('deve identificar simulação como situação atual', async () => {
      // Arrange
      const currentSituation = await prisma.simulation.create({
        data: {
          name: 'Situação Atual',
          startDate: new Date(),
          realRate: 0.1,
          status: 'SITUACAO_ATUAL',
          clientId: testClient.id,
        },
      });

      // Act
      const isCurrent = await simulationService.isCurrentSituation(currentSituation.id);

      // Assert
      expect(isCurrent).toBe(true);
    });

    it('deve verificar se simulação pode ser editada', async () => {
      // Arrange
      const editableSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Editável',
          startDate: new Date(),
          realRate: 0.1,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const currentSituation = await prisma.simulation.create({
        data: {
          name: 'Situação Atual',
          startDate: new Date(),
          realRate: 0.1,
          status: 'SITUACAO_ATUAL',
          clientId: testClient.id,
        },
      });

      // Act
      const canEditEditable = await simulationService.canEditSimulation(editableSimulation.id);
      const canEditCurrent = await simulationService.canEditSimulation(currentSituation.id);

      // Assert
      expect(canEditEditable).toBe(true);
      expect(canEditCurrent).toBe(false);
    });

    it('deve verificar se simulação pode ser deletada', async () => {
      // Arrange
      const deletableSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Deletável',
          startDate: new Date(),
          realRate: 0.1,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const currentSituation = await prisma.simulation.create({
        data: {
          name: 'Situação Atual',
          startDate: new Date(),
          realRate: 0.1,
          status: 'SITUACAO_ATUAL',
          clientId: testClient.id,
        },
      });

      // Act
      const canDeleteDeletable = await simulationService.canDeleteSimulation(
        deletableSimulation.id
      );
      const canDeleteCurrent = await simulationService.canDeleteSimulation(currentSituation.id);

      // Assert
      expect(canDeleteDeletable).toBe(true);
      expect(canDeleteCurrent).toBe(false);
    });

    it('deve identificar versões legadas', async () => {
      // Arrange
      const baseDate = new Date('2024-01-01');
      const baseSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Base',
          startDate: baseDate,
          realRate: 0.1,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      // Aguardar um pouco para garantir que as datas sejam diferentes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Criar primeira versão (que se tornará legada)
      const legacyVersion = await prisma.simulation.create({
        data: {
          name: 'Simulação Legada',
          startDate: baseDate,
          realRate: 0.15,
          status: 'ATIVO',
          clientId: testClient.id,
          baseId: baseSimulation.id,
        },
      });

      // Aguardar um pouco para garantir que as datas sejam diferentes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Criar uma simulação mais recente para tornar a primeira legada
      const newerDate = new Date('2024-02-01');
      await prisma.simulation.create({
        data: {
          name: 'Simulação Mais Recente',
          startDate: newerDate,
          realRate: 0.12,
          status: 'ATIVO',
          clientId: testClient.id,
          baseId: baseSimulation.id,
        },
      });

      // Act
      const isLegacy = await simulationService.isLegacyVersion(legacyVersion.id);
      const isNotLegacy = await simulationService.isLegacyVersion(baseSimulation.id);

      // Assert
      expect(isLegacy).toBe(true);
      expect(isNotLegacy).toBe(false);
    });
  });
});
