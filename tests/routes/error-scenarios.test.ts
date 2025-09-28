import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server';
import { prisma } from '../setup';

describe('Error Scenarios - Cenários de Erro e Validação', () => {
  let app: FastifyInstance;
  let testClient: any;
  let testSimulation: any;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpar banco de dados
    await prisma.assetRecord.deleteMany({});
    await prisma.allocation.deleteMany({});
    await prisma.movement.deleteMany({});
    await prisma.insurance.deleteMany({});
    await prisma.simulation.deleteMany({});
    await prisma.client.deleteMany({});

    // Criar cliente e simulação de teste
    testClient = await prisma.client.create({
      data: {
        name: 'Cliente Teste Erros',
        email: 'teste.erros@exemplo.com',
      },
    });

    testSimulation = await prisma.simulation.create({
      data: {
        name: 'Simulação Teste Erros',
        startDate: new Date('2025-01-01'),
        realRate: 0.04,
        status: 'ATIVO',
        clientId: testClient.id,
      },
    });
  });

  describe('Validação de Dados de Entrada', () => {
    it('deve retornar erro 400 para JSON inválido', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve retornar erro 400 para dados obrigatórios ausentes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: {
          // name ausente
          startDate: '2025-01-01',
          realRate: 0.04,
        },
      });

      expect(response.statusCode).toBe(400);
      const error = response.json();
      expect(error).toHaveProperty('errors');
    });

    it('deve retornar erro 400 para tipos de dados incorretos', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: {
          name: 'Teste',
          startDate: '2025-01-01',
          realRate: 'invalid', // Deveria ser número
          clientId: 'invalid', // Deveria ser número
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve retornar erro 400 para valores fora do range permitido', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: {
          name: 'Teste',
          startDate: '2025-01-01',
          realRate: -1, // Taxa negativa
          clientId: testClient.id,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Cenários de Recurso Não Encontrado', () => {
    it('deve retornar erro 404 para simulação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations/99999',
      });

      expect(response.statusCode).toBe(404);
    });

    it('deve retornar erro 404 para cliente inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/clients/99999',
      });

      expect(response.statusCode).toBe(404);
    });

    it('deve retornar erro 404 para alocação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/allocations/99999',
      });

      expect(response.statusCode).toBe(404);
    });

    it('deve retornar erro 404 para movimentação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/movements/99999',
      });

      expect(response.statusCode).toBe(404);
    });

    it('deve retornar erro 404 para seguro inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/insurances/99999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Cenários de Conflito de Dados', () => {
    it('deve retornar erro 500 para email duplicado', async () => {
      // Criar primeiro cliente
      await prisma.client.create({
        data: {
          name: 'Cliente Original',
          email: 'duplicado@exemplo.com',
        },
      });

      // Tentar criar segundo cliente com mesmo email
      const response = await app.inject({
        method: 'POST',
        url: '/api/clients',
        payload: {
          name: 'Cliente Duplicado',
          email: 'duplicado@exemplo.com',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('deve retornar erro 500 para cliente inexistente ao criar simulação', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: {
          name: 'Simulação Teste',
          startDate: '2025-01-01',
          realRate: 0.04,
          clientId: 99999, // Cliente inexistente
        },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('Cenários de Parâmetros Inválidos', () => {
    it('deve retornar erro 400 para ID inválido na URL', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations/invalid-id',
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve retornar erro 400 para ID negativo', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations/-1',
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve retornar erro 400 para ID zero', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations/0',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Cenários de Validação de Negócio', () => {
    it('deve retornar erro 400 para data de início no futuro', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: {
          name: 'Simulação Futura',
          startDate: '2030-01-01', // Data muito no futuro
          realRate: 0.04,
          clientId: testClient.id,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve retornar erro 400 para taxa de retorno muito alta', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: {
          name: 'Simulação Taxa Alta',
          startDate: '2025-01-01',
          realRate: 2.0, // 200% ao ano
          clientId: testClient.id,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve retornar erro 400 para nome muito curto', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: {
          name: 'AB', // Muito curto
          startDate: '2025-01-01',
          realRate: 0.04,
          clientId: testClient.id,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve retornar erro 400 para email inválido', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/clients',
        payload: {
          name: 'Cliente Email Inválido',
          email: 'email-invalido', // Sem @ e domínio
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Cenários de Projeção com Erros', () => {
    it('deve retornar erro 404 para projeção de simulação inexistente', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projections',
        payload: {
          simulationId: 99999,
          status: 'VIVO',
          realReturnRate: 0.04,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('deve retornar erro 400 para status inválido na projeção', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projections',
        payload: {
          simulationId: testSimulation.id,
          status: 'STATUS_INVALIDO',
          realReturnRate: 0.04,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve retornar erro 400 para taxa de retorno inválida na projeção', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projections',
        payload: {
          simulationId: testSimulation.id,
          status: 'VIVO',
          realReturnRate: -0.1, // Taxa negativa
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Cenários de Timeout e Performance', () => {
    it('deve lidar com projeção de muitos anos', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projections',
        payload: {
          simulationId: testSimulation.id,
          status: 'VIVO',
          realReturnRate: 0.04,
          projectionYears: 100, // Muitos anos
        },
      });

      // Deve retornar erro de validação, não timeout
      expect(response.statusCode).toBe(400);
    });

    it('deve lidar com muitos dados de entrada', async () => {
      // Criar muitas alocações
      const allocations = Array.from({ length: 100 }, (_, i) => ({
        simulationId: testSimulation.id,
        type: 'FINANCEIRA',
        name: `CDB ${i}`,
        value: 1000,
        startDate: new Date('2025-01-01'),
      }));

      for (const allocation of allocations) {
        await prisma.allocation.create({ data: allocation });
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/projections',
        payload: {
          simulationId: testSimulation.id,
          status: 'VIVO',
          realReturnRate: 0.04,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Cenários de Dados Corrompidos', () => {
    it('deve lidar com simulação com dados inconsistentes', async () => {
      // Criar simulação com dados que podem causar problemas
      const problematicSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Problemática',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      // Criar alocação com valor zero
      await prisma.allocation.create({
        data: {
          simulationId: problematicSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Zero',
          value: 0,
          startDate: new Date('2025-01-01'),
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/projections',
        payload: {
          simulationId: problematicSimulation.id,
          status: 'VIVO',
          realReturnRate: 0.04,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
