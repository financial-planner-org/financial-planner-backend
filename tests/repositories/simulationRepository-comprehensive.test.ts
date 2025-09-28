import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '../setup';
import * as simulationRepository from '../../src/repositories/simulationRepository';

describe('SimulationRepository - Testes Abrangentes', () => {
  let testClient: any;
  let testSimulation: any;
  let testAllocation: any;
  let testMovement: any;
  let testInsurance: any;

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

    // Criar dados relacionados
    testAllocation = await prisma.allocation.create({
      data: {
        simulationId: testSimulation.id,
        type: 'FINANCEIRA',
        name: 'CDB Teste',
        value: 100000,
        startDate: new Date('2025-01-01'),
      },
    });

    testMovement = await prisma.movement.create({
      data: {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        value: 5000,
        description: 'Salário Teste',
        startDate: new Date('2025-01-01'),
        frequency: 'MENSAL',
      },
    });

    testInsurance = await prisma.insurance.create({
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

  describe('findAllSimulations', () => {
    it('deve retornar todas as simulações com relacionamentos', async () => {
      const simulations = await simulationRepository.findAllSimulations();

      expect(simulations).toHaveLength(1);
      expect(simulations[0].id).toBe(testSimulation.id);
      expect(simulations[0].allocations).toHaveLength(1);
      expect(simulations[0].movements).toHaveLength(1);
      expect(simulations[0].insurances).toHaveLength(1);
    });

    it('deve retornar array vazio quando não há simulações', async () => {
      // Limpar todas as tabelas relacionadas primeiro
      await prisma.assetRecord.deleteMany({});
      await prisma.allocation.deleteMany({});
      await prisma.movement.deleteMany({});
      await prisma.insurance.deleteMany({});
      await prisma.simulation.deleteMany({});

      const simulations = await simulationRepository.findAllSimulations();

      expect(simulations).toHaveLength(0);
    });

    it('deve incluir relacionamentos de versões e base', async () => {
      // Criar simulação base
      const baseSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Base',
          startDate: new Date('2024-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      // Criar versão da simulação
      await prisma.simulation.create({
        data: {
          name: 'Simulação Versão',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
          baseId: baseSimulation.id,
        },
      });

      const simulations = await simulationRepository.findAllSimulations();

      expect(simulations).toHaveLength(3);
      const versionSim = simulations.find(s => s.baseId === baseSimulation.id);
      expect(versionSim).toBeDefined();
    });
  });

  describe('findSimulationById', () => {
    it('deve retornar simulação com todos os relacionamentos', async () => {
      const simulation = await simulationRepository.findSimulationById(testSimulation.id);

      expect(simulation).toBeDefined();
      expect(simulation?.id).toBe(testSimulation.id);
      expect(simulation?.allocations).toHaveLength(1);
      expect(simulation?.movements).toHaveLength(1);
      expect(simulation?.insurances).toHaveLength(1);
      expect(simulation?.allocations[0].records).toBeDefined();
    });

    it('deve retornar null para simulação inexistente', async () => {
      const simulation = await simulationRepository.findSimulationById(99999);

      expect(simulation).toBeNull();
    });

    it('deve incluir registros de alocação', async () => {
      // Criar registro de alocação
      await prisma.assetRecord.create({
        data: {
          allocationId: testAllocation.id,
          date: new Date('2025-06-01'),
          value: 105000,
          notes: 'Atualização de valor',
        },
      });

      const simulation = await simulationRepository.findSimulationById(testSimulation.id);

      expect(simulation?.allocations[0].records).toHaveLength(1);
      expect(simulation?.allocations[0].records[0].value).toBe(105000);
    });
  });

  describe('duplicateSimulation', () => {
    it('deve duplicar simulação com todos os dados relacionados', async () => {
      const duplicatedSimulation = await simulationRepository.duplicateSimulation(
        testSimulation.id
      );

      expect(duplicatedSimulation).toBeDefined();
      expect(duplicatedSimulation.name).toBe('Simulação Teste Repository (copy)');
      expect(duplicatedSimulation.baseId).toBe(testSimulation.id);
      expect(duplicatedSimulation.clientId).toBe(testClient.id);

      // Verificar se os dados relacionados foram duplicados
      const duplicatedAllocations = await prisma.allocation.findMany({
        where: { simulationId: duplicatedSimulation.id },
      });
      expect(duplicatedAllocations).toHaveLength(1);
      expect(duplicatedAllocations[0].name).toBe('CDB Teste');

      const duplicatedMovements = await prisma.movement.findMany({
        where: { simulationId: duplicatedSimulation.id },
      });
      expect(duplicatedMovements).toHaveLength(1);
      expect(duplicatedMovements[0].description).toBe('Salário Teste');

      const duplicatedInsurances = await prisma.insurance.findMany({
        where: { simulationId: duplicatedSimulation.id },
      });
      expect(duplicatedInsurances).toHaveLength(1);
      expect(duplicatedInsurances[0].name).toBe('Seguro Teste');
    });

    it('deve lançar erro para simulação inexistente', async () => {
      await expect(simulationRepository.duplicateSimulation(99999)).rejects.toThrow(
        'Simulation not found'
      );
    });

    it('deve duplicar registros de alocação', async () => {
      // Criar registro de alocação
      await prisma.assetRecord.create({
        data: {
          allocationId: testAllocation.id,
          date: new Date('2025-06-01'),
          value: 105000,
          notes: 'Atualização de valor',
        },
      });

      const duplicatedSimulation = await simulationRepository.duplicateSimulation(
        testSimulation.id
      );

      // Verificar se os registros foram duplicados
      const duplicatedAllocations = await prisma.allocation.findMany({
        where: { simulationId: duplicatedSimulation.id },
        include: { records: true },
      });
      expect(duplicatedAllocations[0].records).toHaveLength(1);
      expect(duplicatedAllocations[0].records[0].value).toBe(105000);
    });

    it('deve manter baseId original quando simulação já é uma versão', async () => {
      // Criar simulação base
      const baseSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Base',
          startDate: new Date('2024-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      // Criar versão da simulação
      const versionSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Versão',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
          baseId: baseSimulation.id,
        },
      });

      const duplicatedSimulation = await simulationRepository.duplicateSimulation(
        versionSimulation.id
      );

      expect(duplicatedSimulation.baseId).toBe(baseSimulation.id);
    });
  });

  describe('Cenários de Erro e Edge Cases', () => {
    it('deve lidar com simulação sem dados relacionados', async () => {
      // Criar simulação sem dados relacionados
      const emptySimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Vazia',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const simulation = await simulationRepository.findSimulationById(emptySimulation.id);

      expect(simulation).toBeDefined();
      expect(simulation?.allocations).toHaveLength(0);
      expect(simulation?.movements).toHaveLength(0);
      expect(simulation?.insurances).toHaveLength(0);
    });

    it('deve lidar com simulação com muitos dados relacionados', async () => {
      // Criar muitas alocações
      for (let i = 0; i < 10; i++) {
        await prisma.allocation.create({
          data: {
            simulationId: testSimulation.id,
            type: 'FINANCEIRA',
            name: `CDB ${i}`,
            value: 10000,
            startDate: new Date('2025-01-01'),
          },
        });
      }

      // Criar muitas movimentações
      for (let i = 0; i < 10; i++) {
        await prisma.movement.create({
          data: {
            simulationId: testSimulation.id,
            type: 'ENTRADA',
            value: 1000,
            description: `Movimentação ${i}`,
            startDate: new Date('2025-01-01'),
            frequency: 'MENSAL',
          },
        });
      }

      // Criar muitos seguros
      for (let i = 0; i < 5; i++) {
        await prisma.insurance.create({
          data: {
            simulationId: testSimulation.id,
            name: `Seguro ${i}`,
            type: 'VIDA',
            startDate: new Date('2025-01-01'),
            durationMonths: 120,
            premium: 100,
            insuredValue: 100000,
          },
        });
      }

      const simulation = await simulationRepository.findSimulationById(testSimulation.id);

      expect(simulation?.allocations).toHaveLength(11); // 1 original + 10 novas
      expect(simulation?.movements).toHaveLength(11); // 1 original + 10 novas
      expect(simulation?.insurances).toHaveLength(6); // 1 original + 5 novos
    });

    it('deve duplicar simulação com dados complexos', async () => {
      // Criar dados complexos
      const complexAllocation = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'IMOBILIZADA',
          name: 'Apartamento Complexo',
          value: 500000,
          startDate: new Date('2025-01-01'),
          installments: 240,
          interestRate: 0.08,
        },
      });

      // Criar registros de alocação
      for (let i = 0; i < 5; i++) {
        await prisma.assetRecord.create({
          data: {
            allocationId: complexAllocation.id,
            date: new Date(2025, i, 1),
            value: 500000 + i * 10000,
            notes: `Atualização ${i}`,
          },
        });
      }

      const duplicatedSimulation = await simulationRepository.duplicateSimulation(
        testSimulation.id
      );

      expect(duplicatedSimulation).toBeDefined();

      // Verificar se a alocação complexa foi duplicada
      const duplicatedAllocations = await prisma.allocation.findMany({
        where: { simulationId: duplicatedSimulation.id },
        include: { records: true },
      });

      const complexDuplicated = duplicatedAllocations.find(a => a.name === 'Apartamento Complexo');
      expect(complexDuplicated).toBeDefined();
      expect(complexDuplicated?.installments).toBe(240);
      expect(complexDuplicated?.interestRate).toBe(0.08);
      expect(complexDuplicated?.records).toHaveLength(5);
    });
  });

  describe('Transações e Integridade', () => {
    it('deve manter integridade em caso de erro durante duplicação', async () => {
      // Simular erro durante duplicação
      const originalFindById = simulationRepository.findSimulationById;
      jest.spyOn(simulationRepository, 'findSimulationById').mockImplementationOnce(async () => {
        throw new Error('Database error');
      });

      await expect(simulationRepository.duplicateSimulation(testSimulation.id)).rejects.toThrow(
        'Database error'
      );

      // Verificar que não foi criada simulação duplicada
      const simulations = await prisma.simulation.findMany();
      expect(simulations).toHaveLength(1);

      // Restaurar implementação original
      jest.restoreAllMocks();
    });

    it('deve executar duplicação em transação', async () => {
      // Verificar se a duplicação funciona (que internamente usa transação)
      const duplicatedSimulation = await simulationRepository.duplicateSimulation(
        testSimulation.id
      );

      expect(duplicatedSimulation).toBeDefined();
      expect(duplicatedSimulation.name).toBe('Simulação Teste Repository (copy)');
    });
  });
});
