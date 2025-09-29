import request from 'supertest';
import { buildServer } from '../../src/server';
import { randomUUID } from 'crypto';

describe('Allocations API', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  
  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /simulations/:simulationId/allocations', () => {
    it('deve criar uma nova alocação', async () => {
      // Primeiro criamos uma simulação de teste
      const simulationResponse = await request(app.server)
        .post('/api/simulations')
        .send({
          name: 'Test Simulation',
          description: 'Simulação para teste de alocações',
          realRate: 0.05,
          status: 'ATIVO',
          startDate: new Date().toISOString()
        });
      
      const simulationId = simulationResponse.body.id;
      const assetId = randomUUID();
      
      const allocationData = {
        assetId,
        initialValue: 10000,
        targetAllocation: 50,
        records: []
      };

      const response = await request(app.server)
        .post(`/api/simulations/${simulationId}/allocations`)
        .send(allocationData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        simulationId,
        assetId: allocationData.assetId,
        initialValue: allocationData.initialValue,
        targetAllocation: allocationData.targetAllocation,
        isActive: true
      });
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      // Primeiro criamos uma simulação de teste
      const simulationResponse = await request(app.server)
        .post('/api/simulations')
        .send({
          name: 'Test Simulation',
          description: 'Simulação para teste de alocações',
          realRate: 0.05,
          status: 'ATIVO',
          startDate: new Date().toISOString()
        });
      
      const simulationId = simulationResponse.body.id;
      
      const invalidData = {
        assetId: 'invalid-uuid', // Inválido: deve ser um UUID válido
        initialValue: -100,      // Inválido: deve ser positivo
        targetAllocation: 150    // Inválido: deve ser entre 0 e 100
      };

      const response = await request(app.server)
        .post(`/api/simulations/${simulationId}/allocations`)
        .send(invalidData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe('GET /allocations/:id', () => {
    it('deve retornar uma alocação existente', async () => {
      // Primeiro criamos uma simulação
      const simulationResponse = await request(app.server)
        .post('/api/simulations')
        .send({
          name: 'Test Simulation',
          description: 'Simulação para teste de alocações',
          realRate: 0.05,
          status: 'ATIVO',
          startDate: new Date().toISOString()
        });
      
      const simulationId = simulationResponse.body.id;
      const assetId = randomUUID();
      
      // Depois criamos uma alocação
      const createResponse = await request(app.server)
        .post(`/api/simulations/${simulationId}/allocations`)
        .send({
          assetId,
          initialValue: 10000,
          targetAllocation: 50,
          records: []
        });

      const allocationId = createResponse.body.id;

      // Agora buscamos a alocação
      const response = await request(app.server)
        .get(`/api/allocations/${allocationId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        id: allocationId,
        simulationId,
        assetId,
        initialValue: 10000,
        targetAllocation: 50,
        isActive: true
      });
    });

    it('deve retornar 404 para uma alocação inexistente', async () => {
      const nonExistentId = 99999;
      
      const response = await request(app.server)
        .get(`/api/allocations/${nonExistentId}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /allocations/:id', () => {
    it('deve atualizar uma alocação existente', async () => {
      // Primeiro criamos uma simulação
      const simulationResponse = await request(app.server)
        .post('/api/simulations')
        .send({
          name: 'Test Simulation',
          description: 'Simulação para teste de alocações',
          realRate: 0.05,
          status: 'ATIVO',
          startDate: new Date().toISOString()
        });
      
      const simulationId = simulationResponse.body.id;
      const assetId = randomUUID();
      
      // Depois criamos uma alocação
      const createResponse = await request(app.server)
        .post(`/api/simulations/${simulationId}/allocations`)
        .send({
          assetId,
          initialValue: 10000,
          targetAllocation: 50,
          records: []
        });

      const allocationId = createResponse.body.id;

      // Agora atualizamos a alocação
      const updateData = {
        targetAllocation: 60,
        isActive: false
      };

      const response = await request(app.server)
        .put(`/api/allocations/${allocationId}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        id: allocationId,
        targetAllocation: updateData.targetAllocation,
        isActive: updateData.isActive
      });
    });

    it('deve retornar 400 para dados de atualização inválidos', async () => {
      // Primeiro criamos uma alocação
      const createResponse = await request(app.server)
        .post('/api/allocations')
        .send({
          simulationId: 1,
          assetId: '550e8400-e29b-41d4-a716-446655440000',
          initialValue: 10000,
          targetAllocation: 50,
          records: []
        });

      const allocationId = createResponse.body.id;

      // Tentamos atualizar com dados inválidos
      const invalidUpdateData = {
        targetAllocation: 150 // Inválido: deve ser entre 0 e 100
      };

      const response = await request(app.server)
        .put(`/api/allocations/${allocationId}`)
        .send(invalidUpdateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('DELETE /allocations/:id', () => {
    it('deve excluir uma alocação existente', async () => {
      // Primeiro criamos uma simulação
      const simulationResponse = await request(app.server)
        .post('/api/simulations')
        .send({
          name: 'Test Simulation',
          description: 'Simulação para teste de alocações',
          realRate: 0.05,
          status: 'ATIVO',
          startDate: new Date().toISOString()
        });
      
      const simulationId = simulationResponse.body.id;
      const assetId = randomUUID();
      
      // Depois criamos uma alocação
      const createResponse = await request(app.server)
        .post(`/api/simulations/${simulationId}/allocations`)
        .send({
          assetId,
          initialValue: 10000,
          targetAllocation: 50,
          records: []
        });

      const allocationId = createResponse.body.id;

      // Agora excluímos a alocação
      const deleteResponse = await request(app.server)
        .delete(`/api/allocations/${allocationId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('id', allocationId);
      expect(deleteResponse.body).toHaveProperty('deleted', true);
    });

    it('deve retornar 404 ao tentar excluir uma alocação inexistente', async () => {
      const nonExistentId = 99999;
      
      const response = await request(app.server)
        .delete(`/api/allocations/${nonExistentId}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /allocations/:id/records', () => {
    it('deve adicionar um registro de valor a uma alocação', async () => {
      // Primeiro criamos uma simulação
      const simulationResponse = await request(app.server)
        .post('/api/simulations')
        .send({
          name: 'Test Simulation',
          description: 'Simulação para teste de alocações',
          realRate: 0.05,
          status: 'ATIVO',
          startDate: new Date().toISOString()
        });
      
      const simulationId = simulationResponse.body.id;
      const assetId = randomUUID();
      
      // Depois criamos uma alocação
      const createResponse = await request(app.server)
        .post(`/api/simulations/${simulationId}/allocations`)
        .send({
          assetId,
          initialValue: 10000,
          targetAllocation: 50,
          records: []
        });

      const allocationId = createResponse.body.id;

      // Agora adicionamos um registro
      const recordData = {
        value: 10500,
        notes: 'Atualização mensal de valor'
      };

      const response = await request(app.server)
        .post(`/api/allocations/${allocationId}/records`)
        .send(recordData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        allocationId,
        value: recordData.value,
        notes: recordData.notes,
        date: expect.any(String)
      });
    });

    it('deve retornar 400 para dados de registro inválidos', async () => {
      // Primeiro criamos uma alocação
      const createResponse = await request(app.server)
        .post('/api/allocations')
        .send({
          simulationId: 1,
          assetId: '550e8400-e29b-41d4-a716-446655440000',
          initialValue: 10000,
          targetAllocation: 50,
          records: []
        });

      const allocationId = createResponse.body.id;

      // Tentamos adicionar um registro com valor inválido
      const invalidRecordData = {
        value: -100, // Inválido: deve ser positivo
        notes: 'Valor inválido'
      };

      const response = await request(app.server)
        .post(`/api/allocations/${allocationId}/records`)
        .send(invalidRecordData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /allocations/:id/records', () => {
    it('deve retornar os registros de uma alocação', async () => {
      // Primeiro criamos uma simulação
      const simulationResponse = await request(app.server)
        .post('/api/simulations')
        .send({
          name: 'Test Simulation',
          description: 'Simulação para teste de alocações',
          realRate: 0.05,
          status: 'ATIVO',
          startDate: new Date().toISOString()
        });
      
      const simulationId = simulationResponse.body.id;
      const assetId = randomUUID();
      
      // Depois criamos uma alocação
      const createResponse = await request(app.server)
        .post(`/api/simulations/${simulationId}/allocations`)
        .send({
          assetId,
          initialValue: 10000,
          targetAllocation: 50,
          records: []
        });

      const allocationId = createResponse.body.id;

      // Adicionamos alguns registros
      await request(app.server)
        .post(`/api/allocations/${allocationId}/records`)
        .send({ value: 10500, notes: 'Primeiro registro' });

      await request(app.server)
        .post(`/api/allocations/${allocationId}/records`)
        .send({ value: 11000, notes: 'Segundo registro' });

      // Agora buscamos os registros
      const response = await request(app.server)
        .get(`/api/allocations/${allocationId}/records`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('value', 10500);
      expect(response.body[1]).toHaveProperty('value', 11000);
    });

    it('deve retornar um array vazio para uma alocação sem registros', async () => {
      // Primeiro criamos uma simulação
      const simulationResponse = await request(app.server)
        .post('/api/simulations')
        .send({
          name: 'Test Simulation',
          description: 'Simulação para teste de alocações',
          realRate: 0.05,
          status: 'ATIVO',
          startDate: new Date().toISOString()
        });
      
      const simulationId = simulationResponse.body.id;
      const assetId = randomUUID();
      
      // Depois criamos uma alocação sem registros
      const createResponse = await request(app.server)
        .post(`/api/simulations/${simulationId}/allocations`)
        .send({
          assetId,
          initialValue: 10000,
          targetAllocation: 50,
          records: []
        });

      const allocationId = createResponse.body.id;

      // Buscamos os registros (deve retornar array vazio)
      const response = await request(app.server)
        .get(`/api/allocations/${allocationId}/records`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });
});
