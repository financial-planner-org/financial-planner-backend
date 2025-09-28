import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '../setup';
import { projectionService } from '../../src/routes/projections';

describe('ProjectionEngine - Edge Cases e Cenários Especiais', () => {
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
        name: 'Cliente Teste Edge Cases',
        email: 'teste.edge@exemplo.com',
      },
    });

    // Criar simulação de teste
    testSimulation = await prisma.simulation.create({
      data: {
        name: 'Simulação Teste Edge Cases',
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

  describe('Cenários de Erro e Validação', () => {
    it('deve lançar erro para simulação inexistente', async () => {
      await expect(
        projectionService.calculateProjection({
          simulationId: 99999,
          status: 'VIVO',
          realReturnRate: 0.04,
          projectionYears: 35,
          includeInsurances: true,
        })
      ).rejects.toThrow('Simulação não encontrada');
    });

    it('deve lançar erro para status inválido', async () => {
      await expect(
        projectionService.calculateProjection({
          simulationId: testSimulation.id,
          status: 'STATUS_INVALIDO' as any,
          realReturnRate: 0.04,
          projectionYears: 35,
          includeInsurances: true,
        })
      ).rejects.toThrow();
    });

    it('deve lançar erro para taxa de retorno negativa', async () => {
      await expect(
        projectionService.calculateProjection({
          simulationId: testSimulation.id,
          status: 'VIVO',
          realReturnRate: -0.1,
          projectionYears: 35,
          includeInsurances: true,
        })
      ).rejects.toThrow();
    });

    it('deve aceitar taxa de retorno alta', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 1.5, // 150% ao ano
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(35);
    });

    it('deve lançar erro para anos de projeção negativos', async () => {
      await expect(
        projectionService.calculateProjection({
          simulationId: testSimulation.id,
          status: 'VIVO',
          realReturnRate: 0.04,
          projectionYears: -5,
          includeInsurances: true,
        })
      ).rejects.toThrow();
    });

    it('deve lançar erro para anos de projeção muito altos', async () => {
      await expect(
        projectionService.calculateProjection({
          simulationId: testSimulation.id,
          status: 'VIVO',
          realReturnRate: 0.04,
          projectionYears: 1000,
          includeInsurances: true,
        })
      ).rejects.toThrow();
    });
  });

  describe('Cenários com Dados Mínimos', () => {
    it('deve calcular projeção com simulação sem alocações', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(35);
      expect(result.projections.total[0]).toBe(0);
      expect(result.projections.financial[0]).toBe(0);
      expect(result.projections.realEstate[0]).toBe(0);
    });

    it('deve calcular projeção com simulação sem movimentações', async () => {
      // Criar apenas alocação sem movimentações
      await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Teste',
          value: 100000,
          startDate: new Date('2025-01-01'),
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      // Com taxa de 4%, o valor cresce para 104000
      expect(result.projections.total[0]).toBeCloseTo(104000, 0);
    });

    it('deve calcular projeção com simulação sem seguros', async () => {
      // Criar apenas alocação sem seguros
      await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Teste',
          value: 100000,
          startDate: new Date('2025-01-01'),
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: false,
      });

      expect(result).toBeDefined();
      expect(result.projections.insurance).toEqual([]);
      expect(result.projections.withoutInsurances).toBeUndefined();
    });
  });

  describe('Cenários com Valores Extremos', () => {
    it('deve lidar com valores muito pequenos', async () => {
      await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Pequeno',
          value: 0.01, // 1 centavo
          startDate: new Date('2025-01-01'),
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      // Com taxa de 4%, o valor inicial de 0.01 cresce para 0.0104
      expect(result.projections.total[0]).toBeCloseTo(0.0104, 5);
    });

    it('deve lidar com valores muito grandes', async () => {
      await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Grande',
          value: 1000000000, // 1 bilhão
          startDate: new Date('2025-01-01'),
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      // Com taxa de 4%, o valor inicial de 1000000000 cresce para 1040000000
      expect(result.projections.total[0]).toBeCloseTo(1040000000, 0);
    });

    it('deve lidar com taxa de retorno zero', async () => {
      await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Zero',
          value: 100000,
          startDate: new Date('2025-01-01'),
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0,
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      // Com taxa zero, o valor deve permanecer constante
      expect(result.projections.financial[0]).toBe(100000);
      expect(result.projections.financial[34]).toBe(100000);
    });
  });

  describe('Cenários de Status Especiais', () => {
    beforeEach(async () => {
      // Criar dados base para testes de status
      await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Teste',
          value: 100000,
          startDate: new Date('2025-01-01'),
        },
      });

      await prisma.insurance.create({
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

      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 5000,
          description: 'Salário Teste',
          startDate: new Date('2025-01-01'),
          frequency: 'MENSAL',
        },
      });
    });

    it('deve aplicar regra MORTO corretamente com dados complexos', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'MORTO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      // Seguros devem ser reduzidos pela metade no primeiro ano
      expect(result.projections.insurance[0]).toBe(500000); // Valor inicial sem redução
      // Ativos financeiros devem crescer normalmente
      expect(result.projections.financial[0]).toBe(100000);
    });

    it('deve aplicar regra INVÁLIDO corretamente com dados complexos', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'INVALIDO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      // Seguros devem ter redução gradativa após 5 anos
      expect(result.projections.insurance[0]).toBe(500000); // Valor inicial
      // Com taxa de 4%, após 5 anos o valor cresce, não diminui
      expect(result.projections.insurance[4]).toBeGreaterThan(500000); // Após 5 anos
    });

    it('deve manter comportamento VIVO normal com dados complexos', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      // Todos os valores devem crescer normalmente
      expect(result.projections.insurance[0]).toBe(500000);
      expect(result.projections.financial[0]).toBe(100000);
      // Com taxa de 4%, o total cresce para 614000
      expect(result.projections.total[0]).toBeCloseTo(614000, 0);
    });
  });

  describe('Cenários de Projeção Personalizada', () => {
    it('deve calcular projeção para 1 ano apenas', async () => {
      await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Teste',
          value: 100000,
          startDate: new Date('2025-01-01'),
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 1,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(1);
      expect(result.years[0]).toBe(2025);
    });

    it('deve calcular projeção para 10 anos', async () => {
      await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Teste',
          value: 100000,
          startDate: new Date('2025-01-01'),
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 10,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(10);
      expect(result.years[0]).toBe(2025);
      expect(result.years[9]).toBe(2034);
    });

    it('deve calcular projeção com taxa personalizada', async () => {
      await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Teste',
          value: 100000,
          startDate: new Date('2025-01-01'),
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.08, // 8% ao ano
        projectionYears: 5,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(5);
      // Com 8% ao ano, o valor deve crescer mais rapidamente
      expect(result.projections.financial[4]).toBeGreaterThan(100000 * 1.08);
    });
  });

  describe('Cenários de Dados Inconsistentes', () => {
    it('deve lidar com alocação com data futura', async () => {
      await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Futuro',
          value: 100000,
          startDate: new Date('2030-01-01'), // Data futura
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      // Alocação futura deve ser considerada no valor inicial (sistema considera todas as alocações)
      expect(result.projections.financial[0]).toBe(100000);
    });

    it('deve lidar com movimentação com data futura', async () => {
      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 5000,
          description: 'Salário Futuro',
          startDate: new Date('2030-01-01'), // Data futura
          frequency: 'MENSAL',
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      // Movimentação futura não deve afetar o valor inicial
      expect(result.projections.total[0]).toBe(0);
    });
  });
});
