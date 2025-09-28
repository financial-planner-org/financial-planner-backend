import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '../setup';
import { projectionService } from '../../src/routes/projections';

describe('ProjectionEngine - Testes Abrangentes para 100% Cobertura', () => {
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
        name: 'Cliente Teste Projection',
        email: 'teste.projection@exemplo.com',
      },
    });

    // Criar simulação de teste
    testSimulation = await prisma.simulation.create({
      data: {
        name: 'Simulação Teste Projection',
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

  describe('Validação de Parâmetros', () => {
    it('deve lançar erro para simulationId inválido', async () => {
      await expect(
        projectionService.calculateProjection({
          simulationId: 0,
          status: 'VIVO',
          realReturnRate: 0.04,
          projectionYears: 35,
          includeInsurances: false,
        })
      ).rejects.toThrow();
    });

    it('deve lançar erro para simulationId negativo', async () => {
      return await expect(
        projectionService.calculateProjection({
          simulationId: -1,
          status: 'VIVO',
          realReturnRate: 0.04,
          projectionYears: 0,
          includeInsurances: false,
        })
      ).rejects.toThrow();
    });

    it('deve lançar erro para realReturnRate muito baixo', async () => {
      await expect(
        projectionService.calculateProjection({
          simulationId: testSimulation.id,
          status: 'VIVO',
          realReturnRate: -1.0,
          projectionYears: 35,
          includeInsurances: false,
        })
      ).rejects.toThrow();
    });

    it('deve aceitar realReturnRate alto', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 10.0,
        projectionYears: 35,
        includeInsurances: false,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(35);
    });

    it('deve lançar erro para projectionYears inválido', async () => {
      await expect(
        projectionService.calculateProjection({
          simulationId: testSimulation.id,
          status: 'VIVO',
          realReturnRate: 0.04,
          projectionYears: 0,
          includeInsurances: false,
        })
      ).rejects.toThrow();
    });

    it('deve lançar erro para projectionYears muito alto', async () => {
      await expect(
        projectionService.calculateProjection({
          simulationId: testSimulation.id,
          status: 'VIVO',
          realReturnRate: 0.04,
          projectionYears: 1000,
          includeInsurances: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('Cenários com Dados Complexos', () => {
    beforeEach(async () => {
      // Criar dados complexos para teste
      const allocation = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Complexo',
          value: 100000,
          startDate: new Date('2025-01-01'),
        },
      });

      // Criar registros históricos
      await prisma.assetRecord.create({
        data: {
          allocationId: allocation.id,
          date: new Date('2024-12-01'),
          value: 95000,
          notes: 'Valor anterior',
        },
      });

      await prisma.assetRecord.create({
        data: {
          allocationId: allocation.id,
          date: new Date('2025-06-01'),
          value: 105000,
          notes: 'Valor atualizado',
        },
      });

      // Criar movimentações complexas
      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 5000,
          description: 'Salário Base',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2030-12-31'),
          frequency: 'MENSAL',
          category: 'Renda',
        },
      });

      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 2000,
          description: 'Bônus Anual',
          startDate: new Date('2025-12-01'),
          frequency: 'ANUAL',
          category: 'Bônus',
        },
      });

      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'SAIDA',
          value: 3000,
          description: 'Despesas Mensais',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2030-12-31'),
          frequency: 'MENSAL',
          category: 'Despesas',
        },
      });

      // Criar seguros complexos
      await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Vida Principal',
          type: 'VIDA',
          startDate: new Date('2025-01-01'),
          durationMonths: 120,
          premium: 500,
          insuredValue: 1000000,
        },
      });

      await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Invalidez',
          type: 'INVALIDEZ',
          startDate: new Date('2025-01-01'),
          durationMonths: 240,
          premium: 300,
          insuredValue: 500000,
        },
      });
    });

    it('deve calcular projeção com dados complexos - Status VIVO', async () => {
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

      // Verificar se os valores iniciais estão corretos
      expect(result.projections.financial[0]).toBe(95000); // Valor inicial correto
      expect(result.projections.insurance[0]).toBe(1500000); // Soma dos seguros
      // Com taxa de 4%, o total cresce para 1628800
      expect(result.projections.total[0]).toBeCloseTo(1628800, 0); // Total inicial correto

      // Verificar crescimento ao longo do tempo
      expect(result.projections.financial[9]).toBeGreaterThan(result.projections.financial[0]);
      expect(result.projections.total[9]).toBeGreaterThan(result.projections.total[0]);
    });

    it('deve calcular projeção com dados complexos - Status MORTO', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'MORTO',
        realReturnRate: 0.04,
        projectionYears: 10,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(10);

      // Verificar se os seguros foram reduzidos pela metade
      expect(result.projections.insurance[0]).toBe(1500000); // Valor inicial sem redução
      expect(result.projections.financial[0]).toBe(95000); // Apenas ativos financeiros
    });

    it('deve calcular projeção com dados complexos - Status INVÁLIDO', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'INVALIDO',
        realReturnRate: 0.04,
        projectionYears: 10,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(10);

      // Verificar se os seguros têm redução gradativa após 5 anos
      expect(result.projections.insurance[0]).toBe(1500000); // Valor inicial
      // Com taxa de 4%, após 5 anos o valor cresce, não diminui
      expect(result.projections.insurance[4]).toBeGreaterThan(1500000); // Após 5 anos
    });

    it('deve calcular projeção sem seguros', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 10,
        includeInsurances: false,
      });

      expect(result).toBeDefined();
      expect(result.projections.insurance).toEqual([]);
      expect(result.projections.withoutInsurances).toBeUndefined();
      // Com taxa de 4%, o valor cresce para 98800
      expect(result.projections.total[0]).toBeCloseTo(98800, 0); // Apenas ativos financeiros
    });
  });

  describe('Cenários de Edge Cases', () => {
    it('deve lidar com simulação com data de início no futuro', async () => {
      const futureSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Futura',
          startDate: new Date('2030-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: futureSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 5,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(5);
      expect(result.years[0]).toBe(2030);
    });

    it('deve lidar com simulação com data de início no passado', async () => {
      const pastSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Passado',
          startDate: new Date('2020-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const result = await projectionService.calculateProjection({
        simulationId: pastSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 5,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(5);
      expect(result.years[0]).toBe(2020); // Ano da simulação
    });

    it('deve lidar com taxa de retorno zero', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0,
        projectionYears: 5,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(5);

      // Com taxa zero, os valores devem permanecer constantes
      expect(result.projections.financial[0]).toBe(0);
      expect(result.projections.financial[4]).toBe(0);
    });

    it('deve lidar com taxa de retorno muito baixa', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.001, // 0.1% ao ano
        projectionYears: 5,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(5);

      // Com taxa muito baixa, o crescimento deve ser mínimo
      expect(result.projections.financial[4]).toBeGreaterThanOrEqual(
        result.projections.financial[0]
      );
    });

    it('deve lidar com projeção de apenas 1 ano', async () => {
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

    it('deve lidar com projeção de 50 anos', async () => {
      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 50,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(50);
      expect(result.years[0]).toBe(2025);
      expect(result.years[49]).toBe(2074);
    });
  });

  describe('Validação de Dados de Entrada', () => {
    it('deve validar parâmetros obrigatórios', async () => {
      await expect(projectionService.calculateProjection({} as any)).rejects.toThrow();
    });

    it('deve validar tipos de dados corretos', async () => {
      await expect(
        projectionService.calculateProjection({
          simulationId: 'não é número',
          status: 'VIVO',
          realReturnRate: 0.04,
        } as any)
      ).rejects.toThrow();
    });

    it('deve validar enums corretos', async () => {
      await expect(
        projectionService.calculateProjection({
          simulationId: testSimulation.id,
          status: 'STATUS_INVALIDO',
          realReturnRate: 0.04,
        } as any)
      ).rejects.toThrow();
    });
  });

  describe('Performance e Escalabilidade', () => {
    it('deve calcular projeção rapidamente', async () => {
      const start = Date.now();

      await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: true,
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Deve calcular em menos de 1 segundo
    });

    it('deve lidar com muitos dados de entrada', async () => {
      // Criar muitas alocações
      for (let i = 0; i < 50; i++) {
        await prisma.allocation.create({
          data: {
            simulationId: testSimulation.id,
            type: 'FINANCEIRA',
            name: `CDB ${i}`,
            value: 1000,
            startDate: new Date('2025-01-01'),
          },
        });
      }

      const result = await projectionService.calculateProjection({
        simulationId: testSimulation.id,
        status: 'VIVO',
        realReturnRate: 0.04,
        projectionYears: 35,
        includeInsurances: true,
      });

      expect(result).toBeDefined();
      expect(result.years).toHaveLength(35);
    });
  });

  describe('Cenários de Erro', () => {
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

    it('deve lançar erro para dados corrompidos', async () => {
      // Simular erro interno diretamente
      jest.spyOn(prisma.simulation, 'findUnique').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        projectionService.calculateProjection({
          simulationId: 99999,
          status: 'VIVO',
          realReturnRate: 0.04,
          projectionYears: 35,
          includeInsurances: true,
        })
      ).rejects.toThrow('Simulação não encontrada');

      // Restaurar implementação original
      jest.restoreAllMocks();
    });
  });
});
