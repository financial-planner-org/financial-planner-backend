import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server';
import { prisma } from '../setup';

describe('Movimentações - CRUD e Timeline de Entradas e Saídas', () => {
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
    await prisma.movement.deleteMany({});
    await prisma.simulation.deleteMany({});
    await prisma.client.deleteMany({});

    // Criar cliente e simulação de teste
    testClient = await prisma.client.create({
      data: {
        name: 'Cliente Teste Movimentações',
        email: 'teste.movimentacoes@exemplo.com',
      },
    });

    testSimulation = await prisma.simulation.create({
      data: {
        name: 'Simulação Teste Movimentações',
        startDate: new Date('2025-01-01'),
        realRate: 0.04,
        status: 'ATIVO',
        clientId: testClient.id,
      },
    });
  });

  describe('POST /api/simulations/:id/movements - Criar Movimentação', () => {
    it('deve criar movimentação de entrada mensal', async () => {
      // Testar criação de movimentação de entrada (salário)
      const movementData = {
        type: 'ENTRADA',
        value: 8000,
        description: 'Salário Mensal',
        frequency: 'MENSAL',
        startDate: new Date('2025-01-01').toISOString(),
        endDate: new Date('2030-12-31').toISOString(),
        category: 'Renda',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/simulations/${testSimulation.id}/movements`,
        payload: movementData,
      });

      expect(response.statusCode).toBe(201);
      const createdMovement = response.json();
      expect(createdMovement.type).toBe('ENTRADA');
      expect(createdMovement.value).toBe(8000);
      expect(createdMovement.frequency).toBe('MENSAL');
      expect(createdMovement.description).toBe('Salário Mensal');
      expect(createdMovement.simulationId).toBe(testSimulation.id);
    });

    it('deve criar movimentação de saída única', async () => {
      // Testar criação de movimentação de saída única
      const movementData = {
        type: 'SAIDA',
        value: 50000,
        description: 'Compra de Carro',
        frequency: 'UNICA',
        startDate: new Date('2025-06-01').toISOString(),
        category: 'Aquisição',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/simulations/${testSimulation.id}/movements`,
        payload: movementData,
      });

      expect(response.statusCode).toBe(201);
      const createdMovement = response.json();
      expect(createdMovement.type).toBe('SAIDA');
      expect(createdMovement.value).toBe(50000);
      expect(createdMovement.frequency).toBe('UNICA');
      expect(createdMovement.endDate).toBeNull();
    });

    it('deve criar movimentação anual', async () => {
      // Testar criação de movimentação anual (bonus)
      const movementData = {
        type: 'ENTRADA',
        value: 50000,
        description: 'Bônus Anual',
        frequency: 'ANUAL',
        startDate: new Date('2025-12-01').toISOString(),
        endDate: new Date('2030-11-30').toISOString(),
        category: 'Bônus',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/simulations/${testSimulation.id}/movements`,
        payload: movementData,
      });

      expect(response.statusCode).toBe(201);
      const createdMovement = response.json();
      expect(createdMovement.frequency).toBe('ANUAL');
      expect(createdMovement.value).toBe(50000);
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      // Testar validação com dados inválidos
      const invalidData = {
        type: 'TIPO_INVALIDO',
        value: -1000, // Valor negativo
        description: 'Movimento Inválido',
        frequency: 'FREQUENCIA_INVALIDA',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/simulations/${testSimulation.id}/movements`,
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      const error = response.json();
      expect(error).toHaveProperty('status');
      expect(error.status).toBe('error');
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const movementData = {
        type: 'ENTRADA',
        value: 1000,
        description: 'Movimento Teste',
        frequency: 'MENSAL',
        startDate: new Date().toISOString(),
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations/99999/movements',
        payload: movementData,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/simulations/:id/movements - Listar Movimentações por Simulação', () => {
    it('deve retornar lista vazia quando não há movimentações', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/movements`,
      });

      expect(response.statusCode).toBe(200);
      const movements = response.json();
      expect(Array.isArray(movements)).toBe(true);
      expect(movements).toHaveLength(0);
    });

    it('deve retornar todas as movimentações da simulação', async () => {
      // Criar movimentações de teste
      const movement1 = await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 8000,
          description: 'Salário',
          frequency: 'MENSAL',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2030-12-31'),
          category: 'Renda',
        },
      });

      const movement2 = await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'SAIDA',
          value: 2000,
          description: 'Aluguel',
          frequency: 'MENSAL',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2030-12-31'),
          category: 'Moradia',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/movements`,
      });

      expect(response.statusCode).toBe(200);
      const movements = response.json();
      expect(movements).toHaveLength(2);
      expect(movements.map((m: any) => m.id)).toContain(movement1.id);
      expect(movements.map((m: any) => m.id)).toContain(movement2.id);
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations/99999/movements',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/movements/:id - Buscar Movimentação por ID', () => {
    it('deve retornar movimentação existente pelo ID', async () => {
      const movement = await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 10000,
          description: 'Movimento Busca Teste',
          frequency: 'MENSAL',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2030-12-31'),
          category: 'Teste',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/movements/${movement.id}`,
      });

      expect(response.statusCode).toBe(200);
      const foundMovement = response.json();
      expect(foundMovement.id).toBe(movement.id);
      expect(foundMovement.description).toBe(movement.description);
      expect(foundMovement.value).toBe(movement.value);
    });

    it('deve retornar erro 404 para movimentação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/movements/99999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/movements/:id - Atualizar Movimentação', () => {
    it('deve atualizar movimentação existente', async () => {
      const movement = await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 8000,
          description: 'Salário Original',
          frequency: 'MENSAL',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2030-12-31'),
          category: 'Renda',
        },
      });

      const updateData = {
        description: 'Salário Atualizado',
        value: 10000,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/movements/${movement.id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const updatedMovement = response.json();
      expect(updatedMovement.description).toBe(updateData.description);
      expect(updatedMovement.value).toBe(updateData.value);
    });

    it('deve retornar erro 404 para movimentação inexistente', async () => {
      const updateData = {
        description: 'Movimentação Inexistente',
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/movements/99999',
        payload: updateData,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/simulations/:id/movements/timeline - Timeline de Movimentações', () => {
    it('deve gerar timeline de movimentações encadeadas', async () => {
      // Criar movimentações encadeadas (salário de 2025-2030, depois 2030-2040)
      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 8000,
          description: 'Salário Período 1',
          frequency: 'MENSAL',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2030-12-31'),
          category: 'Renda',
        },
      });

      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 12000,
          description: 'Salário Período 2',
          frequency: 'MENSAL',
          startDate: new Date('2031-01-01'),
          endDate: new Date('2040-12-31'),
          category: 'Renda',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/movements`,
        query: {
          startYear: '2025',
          endYear: '2040',
        },
      });

      expect(response.statusCode).toBe(200);
      const timeline = response.json();
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBeGreaterThan(0);
    });

    it('deve retornar timeline vazia quando não há movimentações', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/movements`,
        query: {
          startYear: '2025',
          endYear: '2030',
        },
      });

      expect(response.statusCode).toBe(200);
      const timeline = response.json();
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline).toHaveLength(0);
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations/99999/movements/timeline',
        query: {
          startYear: '2025',
          endYear: '2030',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/movements/:id - Deletar Movimentação', () => {
    it('deve deletar movimentação existente', async () => {
      const movement = await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 5000,
          description: 'Movimento para Deletar',
          frequency: 'MENSAL',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2030-12-31'),
          category: 'Teste',
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movements/${movement.id}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('success');

      // Verificar se movimentação foi realmente deletada
      const deletedMovement = await prisma.movement.findUnique({
        where: { id: movement.id },
      });
      expect(deletedMovement).toBeNull();
    });

    it('deve retornar erro 404 para movimentação inexistente', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/movements/99999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Cenários Especiais de Timeline', () => {
    it('deve lidar com movimentações que se sobrepõem no tempo', async () => {
      // Criar movimentações sobrepostas
      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 8000,
          description: 'Salário Principal',
          frequency: 'MENSAL',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2035-12-31'),
          category: 'Renda Principal',
        },
      });

      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 2000,
          description: 'Renda Extra',
          frequency: 'MENSAL',
          startDate: new Date('2030-01-01'),
          endDate: new Date('2040-12-31'),
          category: 'Renda Extra',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/movements`,
        query: {
          startYear: '2025',
          endYear: '2040',
        },
      });

      expect(response.statusCode).toBe(200);
      const timeline = response.json();
      expect(Array.isArray(timeline)).toBe(true);

      // Deve considerar ambas as movimentações no período de sobreposição
      const overlappingPeriod = timeline.filter(
        (entry: any) => entry.year >= 2030 && entry.year <= 2035
      );
      expect(overlappingPeriod.length).toBeGreaterThan(0);
    });

    it('deve lidar com movimentações de diferentes frequências', async () => {
      // Criar movimentações de diferentes frequências
      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 8000,
          description: 'Salário Mensal',
          frequency: 'MENSAL',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2030-12-31'),
          category: 'Renda',
        },
      });

      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 50000,
          description: 'Bônus Anual',
          frequency: 'ANUAL',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2030-11-30'),
          category: 'Bônus',
        },
      });

      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 100000,
          description: 'Venda de Imóvel',
          frequency: 'UNICA',
          startDate: new Date('2027-06-01'),
          category: 'Venda',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/movements`,
        query: {
          startYear: '2025',
          endYear: '2030',
        },
      });

      expect(response.statusCode).toBe(200);
      const timeline = response.json();
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBeGreaterThan(0);
    });
  });
});
