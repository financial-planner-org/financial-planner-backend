import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server';

describe('Health Check - Validação de Saúde da API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Construir servidor para teste
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    // Fechar servidor após testes
    await app.close();
  });

  describe('GET /api/health', () => {
    it('deve retornar status 200 e informações de saúde da API', async () => {
      // Testar endpoint de saúde da API
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      const responseData = response.json();
      expect(responseData).toHaveProperty('status', 'ok');
    });
  });

  describe('GET /', () => {
    it('deve retornar informações básicas da API', async () => {
      // Testar endpoint raiz da API
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('online');
    });
  });

  describe('Documentação Swagger', () => {
    it('deve servir documentação da API em /documentation', async () => {
      // Testar se a documentação Swagger está disponível
      const response = await app.inject({
        method: 'GET',
        url: '/documentation',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });
  });
});
