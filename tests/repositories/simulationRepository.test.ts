import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '../setup';

describe('SimulationRepository - Repositório de Simulações', () => {
  let testClient: any;
  let testSimulation: any;

  beforeEach(async () => {
    // Limpar banco de dados
    await prisma.assetRecord.deleteMany({});
    await prisma.allocation.deleteMany({});
    await prisma.movement.deleteMany({});
    await prisma.insurance.deleteMany({});
    await prisma.simulation.deleteMany({});
    await prisma.client.deleteMany({});

    // Criar cliente de teste
    testClient = await prisma.client.create({
      data: {
        name: 'Cliente Teste Repository',
        email: 'teste.repository@exemplo.com',
      },
    });

    // Criar simulação de teste
    testSimulation = await prisma.simulation.create({
      data: {
        name: 'Simulação Teste Repository',
        startDate: new Date('2025-01-01'),
        realRate: 0.04,
        status: 'ATIVO',
        clientId: testClient.id,
      },
    });
  });

  afterEach(async () => {
    // Limpar banco de dados após cada teste
    await prisma.assetRecord.deleteMany({});
    await prisma.allocation.deleteMany({});
    await prisma.movement.deleteMany({});
    await prisma.insurance.deleteMany({});
    await prisma.simulation.deleteMany({});
    await prisma.client.deleteMany({});
  });

  describe('findSimulationsByClientId', () => {
    it('deve retornar simulações de um cliente específico', async () => {
      const simulations = await prisma.simulation.findMany({
        where: { clientId: testClient.id },
      });

      expect(simulations).toHaveLength(1);
      expect(simulations[0].clientId).toBe(testClient.id);
      expect(simulations[0].name).toBe('Simulação Teste Repository');
    });

    it('deve retornar array vazio para cliente sem simulações', async () => {
      const newClient = await prisma.client.create({
        data: {
          name: 'Cliente Sem Simulações',
          email: 'sem.simulacoes@exemplo.com',
        },
      });

      const simulations = await prisma.simulation.findMany({
        where: { clientId: newClient.id },
      });

      expect(simulations).toHaveLength(0);
    });
  });

  describe('findSimulationWithRelations', () => {
    it('deve retornar simulação com relacionamentos', async () => {
      // Criar dados relacionados
      const allocation = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Teste',
          value: 100000,
          startDate: new Date('2025-01-01'),
        },
      });

      const movement = await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 5000,
          description: 'Salário Teste',
          startDate: new Date('2025-01-01'),
          frequency: 'MENSAL',
        },
      });

      const insurance = await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Teste',
          type: 'VIDA',
          startDate: new Date('2025-01-01'),
          durationMonths: 120,
          premium: 300,
          insuredValue: 500000,
        },
      });

      const simulation = await prisma.simulation.findUnique({
        where: { id: testSimulation.id },
        include: {
          allocations: true,
          movements: true,
          insurances: true,
          client: true,
        },
      });

      expect(simulation).toBeDefined();
      expect(simulation?.allocations).toHaveLength(1);
      expect(simulation?.movements).toHaveLength(1);
      expect(simulation?.insurances).toHaveLength(1);
      expect(simulation?.client).toBeDefined();
    });

    it('deve retornar null para simulação inexistente', async () => {
      const simulation = await prisma.simulation.findUnique({
        where: { id: 99999 },
        include: {
          allocations: true,
          movements: true,
          insurances: true,
          client: true,
        },
      });

      expect(simulation).toBeNull();
    });
  });

  describe('findLatestSimulationByName', () => {
    it('deve retornar a simulação mais recente com um nome específico', async () => {
      // Criar simulações com o mesmo nome
      const simulation1 = await prisma.simulation.create({
        data: {
          name: 'Simulação Duplicada',
          startDate: new Date('2024-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const simulation2 = await prisma.simulation.create({
        data: {
          name: 'Simulação Duplicada',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const latestSimulation = await prisma.simulation.findFirst({
        where: { name: 'Simulação Duplicada' },
        orderBy: { createdAt: 'desc' },
      });

      expect(latestSimulation).toBeDefined();
      expect(latestSimulation?.id).toBe(simulation2.id);
    });

    it('deve retornar null para nome que não existe', async () => {
      const simulation = await prisma.simulation.findFirst({
        where: { name: 'Nome Inexistente' },
        orderBy: { createdAt: 'desc' },
      });

      expect(simulation).toBeNull();
    });
  });

  describe('findSimulationsByName', () => {
    it('deve retornar todas as simulações com um nome específico', async () => {
      // Criar simulações com o mesmo nome
      await prisma.simulation.create({
        data: {
          name: 'Simulação Múltipla',
          startDate: new Date('2024-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      await prisma.simulation.create({
        data: {
          name: 'Simulação Múltipla',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const simulations = await prisma.simulation.findMany({
        where: { name: 'Simulação Múltipla' },
        orderBy: { createdAt: 'asc' },
      });

      expect(simulations).toHaveLength(2);
    });

    it('deve retornar array vazio para nome que não existe', async () => {
      const simulations = await prisma.simulation.findMany({
        where: { name: 'Nome Inexistente' },
      });

      expect(simulations).toHaveLength(0);
    });
  });

  describe('countSimulationsByName', () => {
    it('deve contar simulações com um nome específico', async () => {
      // Criar simulações com o mesmo nome
      await prisma.simulation.create({
        data: {
          name: 'Simulação Contagem',
          startDate: new Date('2024-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      await prisma.simulation.create({
        data: {
          name: 'Simulação Contagem',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const count = await prisma.simulation.count({
        where: { name: 'Simulação Contagem' },
      });

      expect(count).toBe(2);
    });

    it('deve retornar 0 para nome que não existe', async () => {
      const count = await prisma.simulation.count({
        where: { name: 'Nome Inexistente' },
      });

      expect(count).toBe(0);
    });
  });

  describe('findSimulationsWithVersions', () => {
    it('deve retornar simulações com informações de versão', async () => {
      // Criar simulações com baseId para simular versões
      const baseSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Base',
          startDate: new Date('2024-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const versionSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Base',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
          baseId: baseSimulation.id,
        },
      });

      const simulations = await prisma.simulation.findMany({
        where: { clientId: testClient.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(simulations).toHaveLength(3); // 1 original + 2 criadas
    });
  });
});
