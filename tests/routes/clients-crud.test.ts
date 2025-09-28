import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server';
import { prisma } from '../setup';

describe('Clientes - CRUD Completo e Validações', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpar banco de dados antes de cada teste
    await prisma.client.deleteMany({});
  });

  describe('POST /api/clients - Criar Cliente', () => {
    it('deve criar um novo cliente com dados válidos', async () => {
      // Testar criação de cliente com dados completos
      const clientData = {
        name: 'João Silva',
        email: 'joao.silva@exemplo.com',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/clients',
        payload: clientData,
      });

      expect(response.statusCode).toBe(201);
      const createdClient = response.json();
      expect(createdClient.name).toBe(clientData.name);
      expect(createdClient.email).toBe(clientData.email);
      expect(createdClient).toHaveProperty('id');
      expect(createdClient).toHaveProperty('createdAt');
      expect(createdClient).toHaveProperty('updatedAt');
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      // Testar validação com dados inválidos
      const invalidData = {
        name: '', // Nome vazio
        email: 'email-invalido', // Email inválido
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/clients',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      const error = response.json();
      expect(error).toHaveProperty('status');
      expect(error.status).toBe('error');
    });

    it('deve retornar erro 500 para email duplicado', async () => {
      // Criar primeiro cliente
      await prisma.client.create({
        data: {
          name: 'Cliente Original',
          email: 'duplicado@exemplo.com',
        },
      });

      // Tentar criar segundo cliente com mesmo email
      const duplicateData = {
        name: 'Cliente Duplicado',
        email: 'duplicado@exemplo.com',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/clients',
        payload: duplicateData,
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('GET /api/clients - Listar Clientes', () => {
    it('deve retornar lista vazia quando não há clientes', async () => {
      // Testar listagem quando não há dados
      const response = await app.inject({
        method: 'GET',
        url: '/api/clients',
      });

      expect(response.statusCode).toBe(200);
      const clients = response.json();
      expect(Array.isArray(clients)).toBe(true);
      expect(clients).toHaveLength(0);
    });

    it('deve retornar todos os clientes cadastrados', async () => {
      // Criar clientes de teste
      const client1 = await prisma.client.create({
        data: {
          name: 'Cliente 1',
          email: 'cliente1@exemplo.com',
        },
      });

      const client2 = await prisma.client.create({
        data: {
          name: 'Cliente 2',
          email: 'cliente2@exemplo.com',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/clients',
      });

      expect(response.statusCode).toBe(200);
      const clients = response.json();
      expect(clients).toHaveLength(2);
      expect(clients.map((c: any) => c.id)).toContain(client1.id);
      expect(clients.map((c: any) => c.id)).toContain(client2.id);
    });
  });

  describe('GET /api/clients/:id - Buscar Cliente por ID', () => {
    it('deve retornar cliente existente pelo ID', async () => {
      // Criar cliente de teste
      const client = await prisma.client.create({
        data: {
          name: 'Cliente Teste',
          email: 'teste@exemplo.com',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/clients/${client.id}`,
      });

      expect(response.statusCode).toBe(200);
      const foundClient = response.json();
      expect(foundClient.id).toBe(client.id);
      expect(foundClient.name).toBe(client.name);
      expect(foundClient.email).toBe(client.email);
    });

    it('deve retornar erro 404 para cliente inexistente', async () => {
      // Testar busca de cliente que não existe
      const response = await app.inject({
        method: 'GET',
        url: '/api/clients/99999',
      });

      expect(response.statusCode).toBe(404);
      const error = response.json();
      expect(error).toHaveProperty('status');
      expect(error.status).toBe('error');
    });
  });

  describe('PUT /api/clients/:id - Atualizar Cliente', () => {
    it('deve atualizar cliente existente com dados válidos', async () => {
      // Criar cliente de teste
      const client = await prisma.client.create({
        data: {
          name: 'Cliente Original',
          email: 'original@exemplo.com',
        },
      });

      const updateData = {
        name: 'Cliente Atualizado',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/clients/${client.id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const updatedClient = response.json();
      expect(updatedClient.name).toBe(updateData.name);
      expect(updatedClient.email).toBe(client.email); // Email não alterado
    });

    it('deve retornar erro 404 para cliente inexistente', async () => {
      const updateData = {
        name: 'Cliente Inexistente',
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/clients/99999',
        payload: updateData,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/clients/:id - Deletar Cliente', () => {
    it('deve deletar cliente existente', async () => {
      // Criar cliente de teste
      const client = await prisma.client.create({
        data: {
          name: 'Cliente para Deletar',
          email: 'deletar@exemplo.com',
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/clients/${client.id}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result).toHaveProperty('deleted');
      expect(result.deleted).toBe(true);

      // Verificar se cliente foi realmente deletado
      const deletedClient = await prisma.client.findUnique({
        where: { id: client.id },
      });
      expect(deletedClient).toBeNull();
    });

    it('deve retornar erro 404 para cliente inexistente', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/clients/99999',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
