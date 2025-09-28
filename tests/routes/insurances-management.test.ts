import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server';
import { prisma } from '../setup';

describe('Seguros - Gerenciamento de Seguros de Vida e Invalidez', () => {
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
    await prisma.insurance.deleteMany({});
    await prisma.simulation.deleteMany({});
    await prisma.client.deleteMany({});

    // Criar cliente e simulação de teste
    testClient = await prisma.client.create({
      data: {
        name: 'Cliente Teste Seguros',
        email: 'teste.seguros@exemplo.com',
      },
    });

    testSimulation = await prisma.simulation.create({
      data: {
        name: 'Simulação Teste Seguros',
        startDate: new Date('2025-01-01'),
        realRate: 0.04,
        status: 'ATIVO',
        clientId: testClient.id,
      },
    });
  });

  describe('POST /api/insurances - Criar Seguro', () => {
    it('deve criar seguro de vida com dados válidos', async () => {
      // Testar criação de seguro de vida
      const insuranceData = {
        name: 'Seguro Vida Familiar',
        type: 'VIDA',
        startDate: new Date('2025-01-01').toISOString(),
        durationMonths: 120, // 10 anos
        premium: 300, // R$ 300 por mês
        insuredValue: 800000, // R$ 800.000
        simulationId: testSimulation.id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/insurances',
        payload: insuranceData,
      });

      expect(response.statusCode).toBe(201);
      const createdInsurance = response.json();
      expect(createdInsurance.name).toBe(insuranceData.name);
      expect(createdInsurance.type).toBe('VIDA');
      expect(createdInsurance.durationMonths).toBe(120);
      expect(createdInsurance.premium).toBe(300);
      expect(createdInsurance.insuredValue).toBe(800000);
      expect(createdInsurance.simulationId).toBe(testSimulation.id);
    });

    it('deve criar seguro de invalidez com dados válidos', async () => {
      // Testar criação de seguro de invalidez
      const insuranceData = {
        name: 'Seguro Invalidez Permanente',
        type: 'INVALIDEZ',
        startDate: new Date('2025-01-01').toISOString(),
        durationMonths: 240, // 20 anos
        premium: 200, // R$ 200 por mês
        insuredValue: 500000, // R$ 500.000
        simulationId: testSimulation.id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/insurances',
        payload: insuranceData,
      });

      expect(response.statusCode).toBe(201);
      const createdInsurance = response.json();
      expect(createdInsurance.type).toBe('INVALIDEZ');
      expect(createdInsurance.durationMonths).toBe(240);
      expect(createdInsurance.premium).toBe(200);
      expect(createdInsurance.insuredValue).toBe(500000);
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      // Testar validação com dados inválidos
      const invalidData = {
        name: '', // Nome vazio
        type: 'TIPO_INVALIDO',
        startDate: new Date().toISOString(), // Data obrigatória
        durationMonths: -120, // Duração negativa
        premium: -300, // Prêmio negativo
        insuredValue: -800000, // Valor segurado negativo
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/insurances`,
        payload: {
          ...invalidData,
          simulationId: testSimulation.id,
        },
      });

      expect(response.statusCode).toBe(400);
      const error = response.json();
      expect(error).toHaveProperty('message');
      expect(error.message).toContain('must be equal to one of the allowed values');
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const insuranceData = {
        name: 'Seguro Teste',
        type: 'VIDA',
        startDate: new Date().toISOString(),
        durationMonths: 120,
        premium: 300,
        insuredValue: 500000,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/insurances',
        payload: {
          ...insuranceData,
          simulationId: 99999,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/simulations/:id/insurances - Listar Seguros por Simulação', () => {
    it('deve retornar lista vazia quando não há seguros', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/insurances`,
      });

      expect(response.statusCode).toBe(200);
      const insurances = response.json();
      expect(Array.isArray(insurances)).toBe(true);
      expect(insurances).toHaveLength(0);
    });

    it('deve retornar todos os seguros da simulação', async () => {
      // Criar seguros de teste
      const insurance1 = await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Vida 1',
          type: 'VIDA',
          startDate: new Date('2025-01-01'),
          durationMonths: 120,
          premium: 300,
          insuredValue: 800000,
        },
      });

      const insurance2 = await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Invalidez 1',
          type: 'INVALIDEZ',
          startDate: new Date('2025-01-01'),
          durationMonths: 240,
          premium: 200,
          insuredValue: 500000,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/insurances`,
      });

      expect(response.statusCode).toBe(200);
      const insurances = response.json();
      expect(insurances).toHaveLength(2);
      expect(insurances.map((i: any) => i.id)).toContain(insurance1.id);
      expect(insurances.map((i: any) => i.id)).toContain(insurance2.id);
    });

    it('deve retornar erro 404 para simulação inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulations/99999/insurances',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/insurances/:id - Buscar Seguro por ID', () => {
    it('deve retornar seguro existente pelo ID', async () => {
      const insurance = await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Busca Teste',
          type: 'VIDA',
          startDate: new Date('2025-01-01'),
          durationMonths: 120,
          premium: 300,
          insuredValue: 800000,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/insurances/${insurance.id}`,
      });

      expect(response.statusCode).toBe(200);
      const foundInsurance = response.json();
      expect(foundInsurance.id).toBe(insurance.id);
      expect(foundInsurance.name).toBe(insurance.name);
      expect(foundInsurance.type).toBe(insurance.type);
      expect(foundInsurance.premium).toBe(insurance.premium);
      expect(foundInsurance.insuredValue).toBe(insurance.insuredValue);
    });

    it('deve retornar erro 404 para seguro inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/insurances/99999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/insurances/:id - Atualizar Seguro', () => {
    it('deve atualizar seguro existente', async () => {
      const insurance = await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Original',
          type: 'VIDA',
          startDate: new Date('2025-01-01'),
          durationMonths: 120,
          premium: 300,
          insuredValue: 800000,
        },
      });

      const updateData = {
        name: 'Seguro Atualizado',
        premium: 350,
        insuredValue: 900000,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/insurances/${insurance.id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const updatedInsurance = response.json();
      expect(updatedInsurance.name).toBe(updateData.name);
      expect(updatedInsurance.premium).toBe(updateData.premium);
      expect(updatedInsurance.insuredValue).toBe(updateData.insuredValue);
    });

    it('deve retornar erro 404 para seguro inexistente', async () => {
      const updateData = {
        name: 'Seguro Inexistente',
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/insurances/99999',
        payload: updateData,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/insurances/:id - Deletar Seguro', () => {
    it('deve deletar seguro existente', async () => {
      const insurance = await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro para Deletar',
          type: 'VIDA',
          startDate: new Date('2025-01-01'),
          durationMonths: 120,
          premium: 300,
          insuredValue: 800000,
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/insurances/${insurance.id}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('success');

      // Verificar se seguro foi realmente deletado
      const deletedInsurance = await prisma.insurance.findUnique({
        where: { id: insurance.id },
      });
      expect(deletedInsurance).toBeNull();
    });

    it('deve retornar erro 404 para seguro inexistente', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/insurances/99999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Cenários Especiais de Seguros', () => {
    it('deve permitir múltiplos seguros de vida na mesma simulação', async () => {
      // Criar primeiro seguro de vida
      await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Vida Principal',
          type: 'VIDA',
          startDate: new Date('2025-01-01'),
          durationMonths: 120,
          premium: 300,
          insuredValue: 800000,
        },
      });

      // Criar segundo seguro de vida
      const response = await app.inject({
        method: 'POST',
        url: `/api/insurances`,
        payload: {
          name: 'Seguro Vida Complementar',
          type: 'VIDA',
          startDate: new Date('2025-06-01').toISOString(),
          durationMonths: 180,
          premium: 200,
          insuredValue: 500000,
          simulationId: testSimulation.id,
        },
      });

      expect(response.statusCode).toBe(201);
      const createdInsurance = response.json();
      expect(createdInsurance.name).toBe('Seguro Vida Complementar');

      // Verificar se ambos os seguros existem
      const allInsurancesResponse = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/insurances`,
      });

      expect(allInsurancesResponse.statusCode).toBe(200);
      const allInsurances = allInsurancesResponse.json();
      expect(allInsurances).toHaveLength(2);
      expect(allInsurances.filter((i: any) => i.type === 'VIDA')).toHaveLength(2);
    });

    it('deve permitir seguros de vida e invalidez na mesma simulação', async () => {
      // Criar seguro de vida
      await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Vida',
          type: 'VIDA',
          startDate: new Date('2025-01-01'),
          durationMonths: 120,
          premium: 300,
          insuredValue: 800000,
        },
      });

      // Criar seguro de invalidez
      const response = await app.inject({
        method: 'POST',
        url: `/api/insurances`,
        payload: {
          name: 'Seguro Invalidez',
          type: 'INVALIDEZ',
          startDate: new Date('2025-01-01').toISOString(),
          durationMonths: 240,
          premium: 200,
          insuredValue: 500000,
          simulationId: testSimulation.id,
        },
      });

      expect(response.statusCode).toBe(201);
      const createdInsurance = response.json();
      expect(createdInsurance.type).toBe('INVALIDEZ');

      // Verificar se ambos os tipos existem
      const allInsurancesResponse = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/insurances`,
      });

      expect(allInsurancesResponse.statusCode).toBe(200);
      const allInsurances = allInsurancesResponse.json();
      expect(allInsurances).toHaveLength(2);

      const types = allInsurances.map((i: any) => i.type);
      expect(types).toContain('VIDA');
      expect(types).toContain('INVALIDEZ');
    });

    it('deve calcular valor total segurado corretamente', async () => {
      // Criar múltiplos seguros
      await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Vida 1',
          type: 'VIDA',
          startDate: new Date('2025-01-01'),
          durationMonths: 120,
          premium: 300,
          insuredValue: 800000,
        },
      });

      await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Vida 2',
          type: 'VIDA',
          startDate: new Date('2025-01-01'),
          durationMonths: 180,
          premium: 200,
          insuredValue: 500000,
        },
      });

      await prisma.insurance.create({
        data: {
          simulationId: testSimulation.id,
          name: 'Seguro Invalidez',
          type: 'INVALIDEZ',
          startDate: new Date('2025-01-01'),
          durationMonths: 240,
          premium: 150,
          insuredValue: 300000,
        },
      });

      // Buscar todos os seguros
      const response = await app.inject({
        method: 'GET',
        url: `/api/simulations/${testSimulation.id}/insurances`,
      });

      expect(response.statusCode).toBe(200);
      const insurances = response.json();
      expect(insurances).toHaveLength(3);

      // Calcular valor total segurado
      const totalInsuredValue = insurances.reduce(
        (sum: number, insurance: any) => sum + insurance.insuredValue,
        0
      );
      expect(totalInsuredValue).toBe(1600000); // 800000 + 500000 + 300000

      // Calcular prêmio total
      const totalPremium = insurances.reduce(
        (sum: number, insurance: any) => sum + insurance.premium,
        0
      );
      expect(totalPremium).toBe(650); // 300 + 200 + 150
    });
  });
});
