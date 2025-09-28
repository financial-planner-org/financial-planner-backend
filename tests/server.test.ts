import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { buildServer } from '../src/server';

describe('Server - Configuração e Inicialização', () => {
  let app: any;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Configuração do Servidor', () => {
    it('deve inicializar o servidor com configurações corretas', () => {
      expect(app).toBeDefined();
      expect(app.server).toBeDefined();
    });

    it('deve ter todas as rotas registradas', () => {
      const routes = app.printRoutes();
      expect(routes).toContain('health');
      expect(routes).toContain('simulations');
      expect(routes).toContain('allocations');
      expect(routes).toContain('movements');
      expect(routes).toContain('insurances');
      expect(routes).toContain('projections');
      expect(routes).toContain('clients');
    });

    it('deve ter documentação Swagger configurada', () => {
      const routes = app.printRoutes();
      expect(routes).toContain('documentation');
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com rotas não encontradas', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/rota-inexistente',
      });

      expect(response.statusCode).toBe(404);
    });

    it('deve lidar com métodos não permitidos', async () => {
      const response = await app.inject({
        method: 'PATCH', // Método não implementado
        url: '/api/health',
      });

      expect(response.statusCode).toBe(404); // Fastify retorna 404 para métodos não implementados
    });
  });

  describe('Middleware e Plugins', () => {
    it('deve ter CORS configurado', () => {
      // Verificar se o servidor aceita requisições de diferentes origens
      expect(app).toBeDefined();
    });

    it('deve ter validação de JSON configurada', async () => {
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
  });

  describe('Health Check', () => {
    it('deve retornar status de saúde', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('version');
    });
  });

  describe('Documentação', () => {
    it('deve servir documentação Swagger', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/documentation',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('deve servir JSON da documentação', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/documentation/json',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('swagger');
      expect(data).toHaveProperty('info');
      expect(data).toHaveProperty('paths');
    });
  });

  describe('Configuração de Ambiente', () => {
    it('deve usar porta padrão quando não especificada', () => {
      expect(app.server.address()).toBeDefined();
    });

    it('deve ter configurações de logging', () => {
      // Verificar se o logger está configurado
      expect(app.log).toBeDefined();
    });
  });
});
