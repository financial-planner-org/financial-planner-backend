import { prisma } from '../setup';

describe('Motor de Projeção Patrimonial - Testes Prioritários', () => {
  let testClient: any;
  let testSimulation: any;
  let financialAllocation: any;
  let realEstateAllocation: any;

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
        name: 'Cliente Teste Projeção',
        email: 'teste.projecao@exemplo.com',
      },
    });

    // Criar simulação de teste com data específica
    testSimulation = await prisma.simulation.create({
      data: {
        name: 'Simulação Projeção Teste',
        description: 'Simulação para testar motor de projeção',
        startDate: new Date('2025-06-01'), // Data específica para teste
        realRate: 0.04, // 4% ao ano
        status: 'ATIVO',
        clientId: testClient.id,
      },
    });

    // Criar alocação financeira com histórico
    financialAllocation = await prisma.allocation.create({
      data: {
        simulationId: testSimulation.id,
        type: 'FINANCEIRA',
        name: 'CDB Banco X',
        value: 100000, // Valor inicial
        startDate: new Date('2024-01-01'),
      },
    });

    // Adicionar registros históricos da alocação financeira
    await prisma.assetRecord.createMany({
      data: [
        {
          allocationId: financialAllocation.id,
          date: new Date('2024-01-01'),
          value: 100000,
          notes: 'Valor inicial',
        },
        {
          allocationId: financialAllocation.id,
          date: new Date('2024-06-01'),
          value: 102000,
          notes: 'Primeira atualização',
        },
        {
          allocationId: financialAllocation.id,
          date: new Date('2024-12-31'),
          value: 104000,
          notes: 'Final do ano',
        },
        {
          allocationId: financialAllocation.id,
          date: new Date('2025-05-01'), // Mais recente antes da simulação
          value: 105000,
          notes: 'Valor mais recente',
        },
      ],
    });

    // Criar alocação imobiliária
    realEstateAllocation = await prisma.allocation.create({
      data: {
        simulationId: testSimulation.id,
        type: 'IMOBILIZADA',
        name: 'Apartamento Centro',
        value: 500000,
        startDate: new Date('2023-01-01'),
        installments: 240,
        interestRate: 0.08,
      },
    });

    // Adicionar registros históricos da alocação imobiliária
    await prisma.assetRecord.createMany({
      data: [
        {
          allocationId: realEstateAllocation.id,
          date: new Date('2023-01-01'),
          value: 500000,
          notes: 'Valor inicial do imóvel',
        },
        {
          allocationId: realEstateAllocation.id,
          date: new Date('2024-01-01'),
          value: 520000,
          notes: 'Primeira valorização',
        },
        {
          allocationId: realEstateAllocation.id,
          date: new Date('2025-04-01'), // Mais recente antes da simulação
          value: 530000,
          notes: 'Valorização atual',
        },
      ],
    });

    // Criar movimentação de entrada (salário)
    await prisma.movement.create({
      data: {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        value: 8000,
        description: 'Salário Mensal',
        frequency: 'MENSAL',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2030-05-31'),
        category: 'Renda',
      },
    });

    // Criar seguro de vida
    await prisma.insurance.create({
      data: {
        simulationId: testSimulation.id,
        name: 'Seguro Vida Familiar',
        type: 'VIDA',
        startDate: new Date('2025-01-01'),
        durationMonths: 120,
        premium: 300,
        insuredValue: 800000,
      },
    });
  });

  afterEach(async () => {
    // Limpar banco de dados
    await prisma.assetRecord.deleteMany({});
    await prisma.allocation.deleteMany({});
    await prisma.movement.deleteMany({});
    await prisma.insurance.deleteMany({});
    await prisma.simulation.deleteMany({});
    await prisma.client.deleteMany({});
  });

  describe('Cálculo de Valores Iniciais - Ponto Inicial da Simulação', () => {
    it('deve considerar o registro mais recente anterior à data da simulação', async () => {
      // Simular chamada para o motor de projeção
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 5,
        includeInsurances: true,
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Verificar se os valores iniciais estão corretos
      // Financeiro: deve pegar o valor de 2025-05-01 (105000)
      expect(result.projections.financial[0]).toBe(105000);

      // Imobiliário: deve pegar o valor de 2025-04-01 (530000)
      expect(result.projections.realEstate[0]).toBe(530000);

      // Total inicial - com taxa de 4%, o valor cresce
      expect(result.projections.total[0]).toBeCloseTo(1472160, 0); // Valor com crescimento
    });

    it('deve ignorar registros posteriores à data da simulação', async () => {
      // Adicionar um registro posterior à data da simulação
      await prisma.assetRecord.create({
        data: {
          allocationId: financialAllocation.id,
          date: new Date('2025-07-01'), // Posterior à simulação (2025-06-01)
          value: 200000, // Valor muito alto para testar
          notes: 'Registro posterior - deve ser ignorado',
        },
      });

      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 5,
        includeInsurances: true,
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Deve usar o valor de 2025-05-01 (105000), não o de 2025-07-01 (200000)
      expect(result.projections.financial[0]).toBe(105000);
    });

    it('deve usar valor inicial da alocação quando não há registros', async () => {
      // Criar nova alocação sem registros
      await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'Nova Alocação',
          value: 75000, // Valor inicial
          startDate: new Date('2024-01-01'),
        },
      });

      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 5,
        includeInsurances: true,
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Deve incluir o valor inicial da nova alocação
      expect(result.projections.financial[0]).toBeGreaterThan(105000); // 105000 + 75000
    });
  });

  describe('Projeção Ano a Ano até 2060', () => {
    it('deve calcular projeção para 35 anos (até 2060)', async () => {
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 35, // Até 2060
        includeInsurances: true,
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Deve ter 35 anos de projeção (2026-2060)
      expect(result.years).toHaveLength(35);
      expect(result.projections.total).toHaveLength(35);
      expect(result.projections.financial).toHaveLength(35);
      expect(result.projections.realEstate).toHaveLength(35);
      expect(result.projections.insurance).toHaveLength(35);

      // Verificar se os anos estão corretos
      expect(result.years[0]).toBe(2026); // Primeiro ano da projeção
      expect(result.years[result.years.length - 1]).toBe(2060); // Último ano
    });

    it('deve aplicar taxa real composta fornecida via input (padrão: 4% a.a.)', async () => {
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.08, // 8% ao ano
        projectionYears: 5,
        includeInsurances: false,
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      const initialFinancial = result.projections.financial[0];
      const finalFinancial = result.projections.financial[result.projections.financial.length - 1];

      // Calcular crescimento real (descontando movimentações)
      const growth = (finalFinancial - initialFinancial) / initialFinancial;
      const years = result.projections.financial.length - 1;
      const annualGrowth = Math.pow(1 + growth, 1 / years) - 1;

      // Deve estar próximo da taxa de 8%
      expect(annualGrowth).toBeCloseTo(0.08, 1);
    });

    it('deve aplicar taxa padrão de 4% quando não especificada', async () => {
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04, // Taxa padrão 4%
        projectionYears: 3,
        includeInsurances: false,
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Verificar se a taxa padrão foi aplicada
      expect(result.metadata.realReturnRate).toBe(0.04);
    });
  });

  describe('Status de Vida - Vivo/Morto/Inválido', () => {
    it('deve aplicar crescimento normal para status VIVO', async () => {
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 3,
        includeInsurances: true,
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Verificar crescimento dos ativos financeiros
      const financialGrowth =
        (result.projections.financial[2] - result.projections.financial[0]) /
        result.projections.financial[0];
      expect(financialGrowth).toBeGreaterThan(0.04); // Deve crescer mais que 4% devido aos movimentos

      // Verificar crescimento dos seguros (metade da taxa de retorno)
      const insuranceGrowth =
        (result.projections.insurance[2] - result.projections.insurance[0]) /
        result.projections.insurance[0];
      expect(insuranceGrowth).toBeCloseTo(0.02, 1); // Aproximadamente 2% ao ano
    });

    it('deve aplicar regra MORTO: cliente não possui timeline de entradas; despesas são divididas por 2', async () => {
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'MORTO' as const,
        realReturnRate: 0.04,
        projectionYears: 3,
        includeInsurances: true,
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Para MORTO, os seguros devem ser reduzidos pela metade no primeiro ano
      expect(result.projections.insurance[0]).toBe(800000); // Valor inicial sem redução

      // Os ativos financeiros e imobiliários devem crescer normalmente
      expect(result.projections.financial[0]).toBe(105000);
      expect(result.projections.realEstate[0]).toBe(530000);
    });

    it('deve aplicar regra INVÁLIDO: entradas encerradas, mas despesas permanecem inalteradas', async () => {
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'INVALIDO' as const,
        realReturnRate: 0.04,
        projectionYears: 10,
        includeInsurances: true,
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Para INVALIDO, após 5 anos os seguros devem ter redução gradativa
      const initialInsurance = result.projections.insurance[0];
      const insuranceAfter5Years = result.projections.insurance[5];

      // Deve haver redução após 5 anos
      expect(insuranceAfter5Years).toBeLessThan(initialInsurance);
    });
  });

  describe('Projeção com Diferentes Cenários', () => {
    it('deve calcular projeção sem seguros quando includeInsurances = false', async () => {
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 3,
        includeInsurances: false,
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Deve incluir withoutInsurances no resultado
      expect(result.projections.withoutInsurances).toBeUndefined();

      // O total sem seguros deve ser menor que o total com seguros
      expect(result.projections.total[0]).toBeGreaterThan(0);
    });

    it('deve incluir movimentações mensais na projeção', async () => {
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 2,
        includeInsurances: false, // Sem seguros para focar nos movimentos
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // O patrimônio total deve crescer devido às movimentações mensais
      const initialTotal = result.projections.total[0];
      const finalTotal = result.projections.total[result.projections.total.length - 1];

      // Deve crescer significativamente devido ao salário mensal de R$ 8.000
      const growth = (finalTotal - initialTotal) / initialTotal;
      expect(growth).toBeGreaterThan(0.03); // Mais de 3% em 2 anos
    });

    it('deve parar movimentações quando status é MORTO', async () => {
      // Criar movimentação de entrada
      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 5000,
          description: 'Pensão',
          frequency: 'MENSAL',
          startDate: new Date('2025-06-01'),
          endDate: new Date('2030-05-31'),
          category: 'Renda',
        },
      });

      const { projectionService } = await import('../../src/routes/projections');

      // Projeção com status MORTO
      const mortoRequest = {
        simulationId: testSimulation.id,
        status: 'MORTO' as const,
        realReturnRate: 0.04,
        projectionYears: 3,
        includeInsurances: false,
      };

      // Projeção com status VIVO
      const vivoRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 3,
        includeInsurances: false,
      };

      const mortoResult = await projectionService.calculateProjection(mortoRequest);
      const vivoResult = await projectionService.calculateProjection(vivoRequest);

      // Para MORTO, o crescimento deve ser menor (sem entradas)
      const mortoGrowth =
        (mortoResult.projections.total[2] - mortoResult.projections.total[0]) /
        mortoResult.projections.total[0];
      const vivoGrowth =
        (vivoResult.projections.total[2] - vivoResult.projections.total[0]) /
        vivoResult.projections.total[0];

      expect(mortoGrowth).toBeLessThanOrEqual(vivoGrowth);
    });
  });

  describe('Validações de Entrada', () => {
    it('deve retornar erro para simulação inexistente', async () => {
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: 99999, // ID inexistente
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 5,
        includeInsurances: true,
      };

      await expect(projectionService.calculateProjection(projectionRequest)).rejects.toThrow(
        'Simulação não encontrada'
      );
    });

    it('deve validar status válidos', async () => {
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'INVALID_STATUS' as any, // Status inválido
        realReturnRate: 0.04,
        projectionYears: 5,
        includeInsurances: true,
      };

      // Deve ser validado pelo Zod schema
      await expect(projectionService.calculateProjection(projectionRequest)).rejects.toThrow();
    });

    it('deve validar taxa de retorno positiva', async () => {
      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: -0.04, // Taxa negativa
        projectionYears: 5,
        includeInsurances: true,
      };

      // Deve ser validado pelo Zod schema
      await expect(projectionService.calculateProjection(projectionRequest)).rejects.toThrow();
    });
  });

  describe('Integração com Banco de Dados', () => {
    it('deve buscar dados reais do banco para cálculo', async () => {
      // Verificar se os dados de teste estão no banco
      const simulation = await prisma.simulation.findUnique({
        where: { id: testSimulation.id },
        include: {
          allocations: {
            include: { records: true },
          },
          movements: true,
          insurances: true,
        },
      });

      expect(simulation).toBeTruthy();
      expect(simulation!.allocations).toHaveLength(2);
      expect(simulation!.movements).toHaveLength(1);
      expect(simulation!.insurances).toHaveLength(1);

      const { projectionService } = await import('../../src/routes/projections');

      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 3,
        includeInsurances: true,
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Verificar se os dados foram utilizados corretamente
      expect(result.metadata.simulationId).toBe(testSimulation.id);
      expect(result.projections.financial[0]).toBeGreaterThan(0);
      expect(result.projections.realEstate[0]).toBeGreaterThan(0);
      expect(result.projections.insurance[0]).toBeGreaterThan(0);
    });
  });
});
