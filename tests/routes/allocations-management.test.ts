import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server';
import { prisma } from '../setup';

describe('Alocações - Gerenciamento de Ativos Financeiros e Imobiliários', () => {
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
    await prisma.simulation.deleteMany({});
    await prisma.client.deleteMany({});

    // Criar cliente e simulação de teste
    testClient = await prisma.client.create({
      data: {
        name: 'Cliente Teste Alocações',
        email: 'teste.alocacoes@exemplo.com',
      },
    });

    testSimulation = await prisma.simulation.create({
      data: {
        name: 'Simulação Teste Alocações',
        startDate: new Date('2025-01-01'),
        realRate: 0.04,
        status: 'ATIVO',
        clientId: testClient.id,
      },
    });
  });

  describe('POST /api/allocations - Criar Alocação', () => {
    it('deve criar alocação financeira com dados válidos', async () => {
      // Testar criação de alocação financeira
      const allocationData = {
        type: 'FINANCEIRA',
        name: 'CDB Banco X',
        value: 100000,
        startDate: new Date('2024-01-01').toISOString(),
        simulationId: testSimulation.id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/allocations',
        payload: allocationData,
      });

      expect(response.statusCode).toBe(201);
      const createdAllocation = response.json();
      expect(createdAllocation.type).toBe('FINANCEIRA');
      expect(createdAllocation.name).toBe(allocationData.name);
      expect(createdAllocation.value).toBe(allocationData.value);
      expect(createdAllocation.simulationId).toBe(testSimulation.id);
    });

    it('deve criar alocação imobiliária com financiamento', async () => {
      // Testar criação de alocação imobiliária com financiamento
      const allocationData = {
        type: 'IMOBILIZADA',
        name: 'Apartamento Centro',
        value: 500000,
        startDate: new Date('2023-01-01').toISOString(),
        installments: 240, // 20 anos
        interestRate: 0.08, // 8% ao ano
        simulationId: testSimulation.id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/allocations',
        payload: allocationData,
      });

      expect(response.statusCode).toBe(201);
      const createdAllocation = response.json();
      expect(createdAllocation.type).toBe('IMOBILIZADA');
      expect(createdAllocation.installments).toBe(240);
      expect(createdAllocation.interestRate).toBe(0.08);
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      // Testar validação com dados inválidos
      const invalidData = {
        type: 'TIPO_INVALIDO',
        name: 'Alocação Inválida',
        value: -1000, // Valor negativo
        simulationId: testSimulation.id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/allocations',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      const error = response.json();
      expect(error).toHaveProperty('status');
      expect(error.status).toBe('error');
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const allocationData = {
        type: 'FINANCEIRA',
        name: 'Alocação Teste',
        value: 100000,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations/99999/allocations',
        payload: allocationData,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/simulations/:id/allocations - Listar Alocações por Simulação', () => {
    it('deve retornar lista vazia quando não há alocações', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/allocations`,
      });

      expect(response.statusCode).toBe(200);
      const allocations = response.json();
      expect(Array.isArray(allocations)).toBe(true);
      expect(allocations).toHaveLength(0);
    });

    it('deve retornar todas as alocações da simulação', async () => {
      // Criar alocações de teste
      const allocation1 = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Teste 1',
          value: 100000,
          startDate: new Date('2024-01-01'),
        },
      });

      const allocation2 = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'IMOBILIZADA',
          name: 'Apartamento Teste',
          value: 300000,
          startDate: new Date('2023-01-01'),
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/allocations`,
      });

      expect(response.statusCode).toBe(200);
      const allocations = response.json();
      expect(allocations).toHaveLength(2);
      expect(allocations.map((a: any) => a.id)).toContain(allocation1.id);
      expect(allocations.map((a: any) => a.id)).toContain(allocation2.id);
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations/99999/allocations',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/allocations/:id - Buscar Alocação por ID', () => {
    it('deve retornar alocação existente pelo ID', async () => {
      const allocation = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Busca Teste',
          value: 150000,
          startDate: new Date('2024-01-01'),
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/allocations/${allocation.id}`,
      });

      expect(response.statusCode).toBe(200);
      const foundAllocation = response.json();
      expect(foundAllocation.id).toBe(allocation.id);
      expect(foundAllocation.name).toBe(allocation.name);
      expect(foundAllocation.value).toBe(allocation.value);
    });

    it('deve retornar erro 404 para alocação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/allocations/99999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/allocations/:id - Atualizar Alocação', () => {
    it('deve atualizar alocação existente', async () => {
      const allocation = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Original',
          value: 100000,
          startDate: new Date('2024-01-01'),
        },
      });

      const updateData = {
        name: 'CDB Atualizado',
        value: 120000,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/allocations/${allocation.id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const updatedAllocation = response.json();
      expect(updatedAllocation.name).toBe(updateData.name);
      expect(updatedAllocation.value).toBe(updateData.value);
    });

    it('deve retornar erro 404 para alocação inexistente', async () => {
      const updateData = {
        name: 'Alocação Inexistente',
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/allocations/99999',
        payload: updateData,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/allocations/:id/records - Adicionar Registro Histórico', () => {
    it('deve adicionar novo registro histórico à alocação', async () => {
      const allocation = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB com Registros',
          value: 100000,
          startDate: new Date('2024-01-01'),
        },
      });

      const recordData = {
        value: 105000,
        notes: 'Atualização mensal de valor',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/allocations/${allocation.id}/records`,
        payload: recordData,
      });

      expect(response.statusCode).toBe(201);
      const createdRecord = response.json();
      expect(createdRecord.allocationId).toBe(allocation.id);
      expect(createdRecord.value).toBe(recordData.value);
      expect(createdRecord.notes).toBe(recordData.notes);
      expect(createdRecord).toHaveProperty('date');
    });

    it('deve retornar erro 400 para dados de registro inválidos', async () => {
      const allocation = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB Teste',
          value: 100000,
          startDate: new Date('2024-01-01'),
        },
      });

      const invalidRecordData = {
        value: -500, // Valor negativo
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/allocations/${allocation.id}/records`,
        payload: invalidRecordData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('deve retornar erro 404 para alocação inexistente', async () => {
      const recordData = {
        value: 105000,
        notes: 'Registro teste',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/allocations/99999/records',
        payload: recordData,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/allocations/:id/records - Listar Registros Históricos', () => {
    it('deve retornar todos os registros históricos da alocação', async () => {
      const allocation = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB com Histórico',
          value: 100000,
          startDate: new Date('2024-01-01'),
        },
      });

      // Criar registros históricos
      await prisma.assetRecord.createMany({
        data: [
          {
            allocationId: allocation.id,
            date: new Date('2024-01-01'),
            value: 100000,
            notes: 'Valor inicial',
          },
          {
            allocationId: allocation.id,
            date: new Date('2024-06-01'),
            value: 102000,
            notes: 'Primeira atualização',
          },
          {
            allocationId: allocation.id,
            date: new Date('2024-12-31'),
            value: 104000,
            notes: 'Final do ano',
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/allocations/${allocation.id}/records`,
      });

      expect(response.statusCode).toBe(200);
      const records = response.json();
      expect(Array.isArray(records)).toBe(true);
      expect(records).toHaveLength(3);

      // Verificar se os registros estão ordenados por data (mais recentes primeiro)
      expect(records[0].value).toBe(104000);
      expect(records[1].value).toBe(102000);
      expect(records[2].value).toBe(100000);
    });

    it('deve retornar lista vazia para alocação sem registros', async () => {
      const allocation = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB sem Registros',
          value: 100000,
          startDate: new Date('2024-01-01'),
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/allocations/${allocation.id}/records`,
      });

      expect(response.statusCode).toBe(200);
      const records = response.json();
      expect(Array.isArray(records)).toBe(true);
      expect(records).toHaveLength(0);
    });

    it('deve retornar erro 404 para alocação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/allocations/99999/records',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/allocations/:id - Deletar Alocação', () => {
    it('deve deletar alocação existente', async () => {
      const allocation = await prisma.allocation.create({
        data: {
          simulationId: testSimulation.id,
          type: 'FINANCEIRA',
          name: 'CDB para Deletar',
          value: 100000,
          startDate: new Date('2024-01-01'),
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/allocations/${allocation.id}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result).toHaveProperty('deleted');
      expect(result.deleted).toBe(true);

      // Verificar se alocação foi realmente deletada
      const deletedAllocation = await prisma.allocation.findUnique({
        where: { id: allocation.id },
      });
      expect(deletedAllocation).toBeNull();
    });

    it('deve retornar erro 404 para alocação inexistente', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/allocations/99999',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
