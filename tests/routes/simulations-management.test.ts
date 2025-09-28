import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server';
import { prisma } from '../setup';

describe('Simulações - Gerenciamento Completo e Versões', () => {
  let app: FastifyInstance;
  let testClient: any;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpar banco de dados
    await prisma.simulation.deleteMany({});
    await prisma.client.deleteMany({});

    // Criar cliente de teste
    testClient = await prisma.client.create({
      data: {
        name: 'Cliente Teste Simulações',
        email: 'teste.simulacoes@exemplo.com',
      },
    });
  });

  describe('POST /api/simulations - Criar Simulação', () => {
    it('deve criar nova simulação com dados válidos', async () => {
      // Testar criação de simulação básica
      const simulationData = {
        name: 'Plano de Aposentadoria',
        description: 'Simulação para planejamento de aposentadoria',
        startDate: new Date('2025-01-01').toISOString(),
        realRate: 0.04,
        status: 'ATIVO',
        clientId: testClient.id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: simulationData,
      });

      expect(response.statusCode).toBe(201);
      const createdSimulation = response.json();
      expect(createdSimulation.name).toBe(simulationData.name);
      expect(createdSimulation.clientId).toBe(testClient.id);
      expect(createdSimulation.realRate).toBe(0.04);
      expect(createdSimulation.status).toBe('ATIVO');
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      // Testar validação com dados inválidos
      const invalidData = {
        name: 'AB', // Nome muito curto
        realRate: -0.1, // Taxa negativa
        status: 'STATUS_INVALIDO',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      const error = response.json();
      expect(error).toHaveProperty('status');
      expect(error.status).toBe('error');
    });

    it('deve retornar erro 400 para cliente inexistente', async () => {
      const simulationData = {
        name: 'Simulação Inválida',
        startDate: new Date().toISOString(),
        realRate: 0.04,
        status: 'ATIVO',
        clientId: 99999, // Cliente inexistente
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: simulationData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/simulations - Listar Simulações', () => {
    it('deve retornar lista vazia quando não há simulações', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations',
      });

      expect(response.statusCode).toBe(200);
      const simulations = response.json();
      expect(Array.isArray(simulations)).toBe(true);
      expect(simulations).toHaveLength(0);
    });

    it('deve retornar todas as simulações cadastradas', async () => {
      // Criar simulações de teste
      const sim1 = await prisma.simulation.create({
        data: {
          name: 'Simulação 1',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const sim2 = await prisma.simulation.create({
        data: {
          name: 'Simulação 2',
          startDate: new Date('2025-02-01'),
          realRate: 0.05,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations',
      });

      expect(response.statusCode).toBe(200);
      const simulations = response.json();
      expect(simulations).toHaveLength(2);
      expect(simulations.map((s: any) => s.id)).toContain(sim1.id);
      expect(simulations.map((s: any) => s.id)).toContain(sim2.id);
    });
  });

  describe('GET /api/simulations/:id - Buscar Simulação por ID', () => {
    it('deve retornar simulação existente pelo ID', async () => {
      const simulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Teste',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${simulation.id}`,
      });

      expect(response.statusCode).toBe(200);
      const foundSimulation = response.json();
      expect(foundSimulation.id).toBe(simulation.id);
      expect(foundSimulation.name).toBe(simulation.name);
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations/99999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/simulations/:id - Atualizar Simulação', () => {
    it('deve atualizar simulação existente', async () => {
      const simulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Original',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const updateData = {
        name: 'Simulação Atualizada',
        realRate: 0.06,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/simulations/${simulation.id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const updatedSimulation = response.json();
      expect(updatedSimulation.name).toBe(updateData.name);
      expect(updatedSimulation.realRate).toBe(updateData.realRate);
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const updateData = {
        name: 'Simulação Inexistente',
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/simulations/99999',
        payload: updateData,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/simulations/:id/duplicate - Duplicar Simulação', () => {
    it('deve duplicar simulação existente com novo nome', async () => {
      const originalSimulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Original',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const duplicateData = {
        name: 'Simulação Duplicada',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/simulations/${originalSimulation.id}/duplicate`,
        payload: duplicateData,
      });

      expect(response.statusCode).toBe(201);
      const duplicatedSimulation = response.json();
      expect(duplicatedSimulation.name).toBe(duplicateData.name);
      expect(duplicatedSimulation.baseId).toBe(originalSimulation.id);
      expect(duplicatedSimulation.clientId).toBe(testClient.id);
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const duplicateData = {
        name: 'Simulação Inexistente',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations/99999/duplicate',
        payload: duplicateData,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/simulations/:id/current-situation - Criar Situação Atual', () => {
    it('deve criar situação atual a partir de simulação existente', async () => {
      const baseSimulation = await prisma.simulation.create({
        data: {
          name: 'Plano Original',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/simulations/${baseSimulation.id}/current-situation`,
      });

      expect(response.statusCode).toBe(201);
      const currentSituation = response.json();
      expect(currentSituation.status).toBe('SITUACAO_ATUAL');
      expect(currentSituation.name).toContain(baseSimulation.name);
      expect(currentSituation.baseId).toBe(baseSimulation.id);
      expect(currentSituation.clientId).toBe(testClient.id);
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations/99999/current-situation',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/simulations/:id/status - Verificar Status da Simulação', () => {
    it('deve retornar status e permissões da simulação', async () => {
      const simulation = await prisma.simulation.create({
        data: {
          name: 'Simulação Teste Status',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${simulation.id}/status`,
      });

      expect(response.statusCode).toBe(200);
      const status = response.json();
      expect(status.simulationId).toBe(simulation.id);
      expect(status).toHaveProperty('isCurrentSituation');
      expect(status).toHaveProperty('canEdit');
      expect(status).toHaveProperty('canDelete');
      expect(status).toHaveProperty('isLegacy');
      expect(status).toHaveProperty('restrictions');
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations/99999/status',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/simulations/:id - Deletar Simulação', () => {
    it('deve deletar simulação existente', async () => {
      const simulation = await prisma.simulation.create({
        data: {
          name: 'Simulação para Deletar',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/simulations/${simulation.id}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('success');

      // Verificar se simulação foi realmente deletada
      const deletedSimulation = await prisma.simulation.findUnique({
        where: { id: simulation.id },
      });
      expect(deletedSimulation).toBeNull();
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/simulations/99999',
      });

      expect(response.statusCode).toBe(404);
    });

    it('deve impedir deleção de situação atual', async () => {
      // Criar situação atual
      await prisma.simulation.create({
        data: {
          name: 'Plano Base',
          startDate: new Date('2025-01-01'),
          realRate: 0.04,
          status: 'ATIVO',
          clientId: testClient.id,
        },
      });

      const currentSituation = await prisma.simulation.create({
        data: {
          name: 'Situação Atual - Plano Base',
          startDate: new Date(),
          realRate: 0.04,
          status: 'SITUACAO_ATUAL',
          clientId: testClient.id,
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/simulations/${currentSituation.id}`,
      });

      expect(response.statusCode).toBe(403);
      const error = response.json();
      expect(error.message).toContain('não pode ser deletada');
    });
  });
});
