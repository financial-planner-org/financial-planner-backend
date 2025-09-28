import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server';
import { prisma } from '../setup';

describe('Movements - Testes Abrangentes para 100% Cobertura', () => {
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
        name: 'Cliente Teste Movements',
        email: 'teste.movements@exemplo.com',
      },
    });

    testSimulation = await prisma.simulation.create({
      data: {
        name: 'Simulação Teste Movements',
        startDate: new Date('2025-01-01'),
        realRate: 0.04,
        status: 'ATIVO',
        clientId: testClient.id,
      },
    });
  });

  describe('POST /api/movements - Criar Movimentação', () => {
    it('deve criar movimentação de entrada com dados válidos', async () => {
      const movementData = {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        value: 5000,
        description: 'Salário Mensal',
        startDate: '2025-01-01T00:00:00.000Z',
        frequency: 'MENSAL',
        category: 'Renda',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: movementData,
      });

      expect(response.statusCode).toBe(201);
      const createdMovement = response.json();
      expect(createdMovement.type).toBe('ENTRADA');
      expect(createdMovement.value).toBe(5000);
      expect(createdMovement.simulationId).toBe(testSimulation.id);
    });

    it('deve criar movimentação de saída com dados válidos', async () => {
      const movementData = {
        simulationId: testSimulation.id,
        type: 'SAIDA',
        value: 2000,
        description: 'Aluguel',
        startDate: '2025-01-01T00:00:00.000Z',
        frequency: 'MENSAL',
        category: 'Moradia',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: movementData,
      });

      expect(response.statusCode).toBe(201);
      const createdMovement = response.json();
      expect(createdMovement.type).toBe('SAIDA');
      expect(createdMovement.value).toBe(2000);
    });

    it('deve criar movimentação única', async () => {
      const movementData = {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        value: 10000,
        description: 'Bônus Anual',
        startDate: '2025-12-01T00:00:00.000Z',
        frequency: 'UNICA',
        category: 'Bônus',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: movementData,
      });

      expect(response.statusCode).toBe(201);
      const createdMovement = response.json();
      expect(createdMovement.frequency).toBe('UNICA');
    });

    it('deve criar movimentação anual', async () => {
      const movementData = {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        value: 50000,
        description: '13º Salário',
        startDate: '2025-12-01T00:00:00.000Z',
        frequency: 'ANUAL',
        category: 'Bônus',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: movementData,
      });

      expect(response.statusCode).toBe(201);
      const createdMovement = response.json();
      expect(createdMovement.frequency).toBe('ANUAL');
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      const invalidData = {
        simulationId: testSimulation.id,
        type: 'TIPO_INVALIDO',
        value: -1000,
        description: 'Movimentação Inválida',
        startDate: '2025-01-01T00:00:00.000Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      const error = response.json();
      expect(error).toHaveProperty('status');
      expect(error.status).toBe('error');
    });

    it('deve retornar erro 400 para simulação inexistente', async () => {
      const movementData = {
        simulationId: 99999,
        type: 'ENTRADA',
        value: 5000,
        description: 'Salário',
        startDate: '2025-01-01T00:00:00.000Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: movementData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve retornar erro 400 para campos obrigatórios ausentes', async () => {
      const incompleteData = {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        // Faltam campos obrigatórios
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: incompleteData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/simulations/:simulationId/movements - Listar Movimentações', () => {
    beforeEach(async () => {
      // Criar movimentações de teste
      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 5000,
          description: 'Salário',
          startDate: new Date('2025-01-01'),
          frequency: 'MENSAL',
        },
      });

      await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'SAIDA',
          value: 2000,
          description: 'Aluguel',
          startDate: new Date('2025-01-01'),
          frequency: 'MENSAL',
        },
      });
    });

    it('deve retornar todas as movimentações da simulação', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/movements`,
      });

      expect(response.statusCode).toBe(200);
      const movements = response.json();
      expect(Array.isArray(movements)).toBe(true);
      expect(movements).toHaveLength(2);
    });

    it('deve retornar lista vazia para simulação sem movimentações', async () => {
      const newSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Vazia',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${newSimulation.id}/movements`,
      });

      expect(response.statusCode).toBe(200);
      const movements = response.json();
      expect(movements).toHaveLength(0);
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations/99999/movements',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/movements/:id - Buscar Movimentação', () => {
    let testMovement: any;

    beforeEach(async () => {
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
    });

    it('deve retornar movimentação existente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/movements/${testMovement.id}`,
      });

      expect(response.statusCode).toBe(200);
      const movement = response.json();
      expect(movement.id).toBe(testMovement.id);
      expect(movement.description).toBe('Salário Teste');
    });

    it('deve retornar erro 404 para movimentação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/movements/99999',
      });

      expect(response.statusCode).toBe(404);
    });

    it('deve retornar erro 400 para ID inválido', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/movements/invalid-id',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT /api/movements/:id - Atualizar Movimentação', () => {
    let testMovement: any;

    beforeEach(async () => {
      testMovement = await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 5000,
          description: 'Salário Original',
          startDate: new Date('2025-01-01'),
          frequency: 'MENSAL',
        },
      });
    });

    it('deve atualizar movimentação existente', async () => {
      const updateData = {
        value: 6000,
        description: 'Salário Atualizado',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/movements/${testMovement.id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const updatedMovement = response.json();
      expect(updatedMovement.value).toBe(6000);
      expect(updatedMovement.description).toBe('Salário Atualizado');
    });

    it('deve retornar erro 404 para movimentação inexistente', async () => {
      const updateData = {
        value: 6000,
        description: 'Salário Atualizado',
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/movements/99999',
        payload: updateData,
      });

      expect(response.statusCode).toBe(404);
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      const invalidData = {
        value: -1000, // Valor negativo
        type: 'TIPO_INVALIDO',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/movements/${testMovement.id}`,
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve retornar erro 400 para ID inválido', async () => {
      const updateData = {
        value: 6000,
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/movements/invalid-id',
        payload: updateData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/movements/:id - Deletar Movimentação', () => {
    let testMovement: any;

    beforeEach(async () => {
      testMovement = await prisma.movement.create({
        data: {
          simulationId: testSimulation.id,
          type: 'ENTRADA',
          value: 5000,
          description: 'Salário para Deletar',
          startDate: new Date('2025-01-01'),
          frequency: 'MENSAL',
        },
      });
    });

    it('deve deletar movimentação existente', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movements/${testMovement.id}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.status).toBe('success');

      // Verificar se foi realmente deletada
      const deletedMovement = await prisma.movement.findUnique({
        where: { id: testMovement.id },
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

    it('deve retornar erro 400 para ID inválido', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/movements/invalid-id',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Cenários de Erro e Edge Cases', () => {
    it('deve lidar com erro interno do servidor', async () => {
      // Simular erro interno
      const originalCreate = prisma.movement.create;
      jest.spyOn(prisma.movement, 'create').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const movementData = {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        value: 5000,
        description: 'Salário',
        startDate: '2025-01-01T00:00:00.000Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: movementData,
      });

      expect(response.statusCode).toBe(500);
      const error = response.json();
      expect(error.status).toBe('error');

      // Restaurar implementação original
      jest.restoreAllMocks();
    });

    it('deve lidar com JSON malformado', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve lidar com Content-Type incorreto', async () => {
      const movementData = {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        value: 5000,
        description: 'Salário',
        startDate: '2025-01-01T00:00:00.000Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: movementData,
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Validação de Dados Complexos', () => {
    it('deve validar datas no formato correto', async () => {
      const movementData = {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        value: 5000,
        description: 'Salário',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: movementData,
      });

      expect(response.statusCode).toBe(201);
    });

    it('deve rejeitar datas inválidas', async () => {
      const movementData = {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        value: 5000,
        description: 'Salário',
        startDate: 'data-invalida',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: movementData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve validar valores numéricos', async () => {
      const movementData = {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        value: 'não é um número',
        description: 'Salário',
        startDate: '2025-01-01T00:00:00.000Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: movementData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve validar enums corretamente', async () => {
      const movementData = {
        simulationId: testSimulation.id,
        type: 'ENTRADA',
        value: 5000,
        description: 'Salário',
        startDate: '2025-01-01T00:00:00.000Z',
        frequency: 'INVALID_FREQUENCY',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/movements',
        payload: movementData,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
