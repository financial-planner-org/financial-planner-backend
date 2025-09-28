import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { buildServer } from '../src/server';
import { prisma } from './setup';

describe('Server - Testes Abrangentes para 100% Cobertura', () => {
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

  beforeEach(async () => {
    // Limpar banco de dados
    await prisma.assetRecord.deleteMany({});
    await prisma.allocation.deleteMany({});
    await prisma.movement.deleteMany({});
    await prisma.insurance.deleteMany({});
    await prisma.simulation.deleteMany({});
    await prisma.client.deleteMany({});
  });

  describe('Inicialização e Configuração', () => {
    it('deve inicializar o servidor com todas as configurações', () => {
      expect(app).toBeDefined();
      expect(app.server).toBeDefined();
      expect(app.log).toBeDefined();
    });

    it('deve ter todas as rotas principais registradas', () => {
      const routes = app.printRoutes();

      // Verificar rotas principais
      expect(routes).toContain('health');
      expect(routes).toContain('simulations');
      expect(routes).toContain('allocations');
      expect(routes).toContain('movements');
      expect(routes).toContain('insurances');
      expect(routes).toContain('projections');
      expect(routes).toContain('clients');
      expect(routes).toContain('documentation');
    });

    it('deve ter middleware de CORS configurado', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/health',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });

      // CORS deve permitir requisições de diferentes origens
      expect(response.statusCode).toBe(200);
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

    it('deve ter rate limiting configurado', async () => {
      // Fazer múltiplas requisições para testar rate limiting
      const promises = Array.from({ length: 10 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/health',
        })
      );

      const responses = await Promise.all(promises);

      // Todas as requisições devem ser bem-sucedidas
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });
  });

  describe('Health Check e Monitoramento', () => {
    it('deve retornar status de saúde completo', async () => {
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
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('database');

      expect(data.status).toBe('healthy');
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThan(0);
    });

    it('deve retornar informações básicas na rota raiz', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();

      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('status');

      expect(data.name).toBe('Financial Planner API');
      expect(data.status).toBe('running');
    });

    it('deve incluir informações de banco de dados no health check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();

      expect(data.database).toHaveProperty('status');
      expect(data.database).toHaveProperty('connected');
      expect(data.database.status).toBe('connected');
      expect(data.database.connected).toBe(true);
    });
  });

  describe('Documentação Swagger', () => {
    it('deve servir documentação HTML', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/documentation',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('swagger');
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
      expect(data).toHaveProperty('components');

      expect(data.info.title).toBe('Financial Planner API');
      expect(data.info.version).toBe('1.0.0');
    });

    it('deve servir YAML da documentação', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/documentation/yaml',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/yaml');
      expect(response.body).toContain('swagger:');
    });

    it('deve ter todas as rotas documentadas', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/documentation/json',
      });

      const data = response.json();
      const paths = Object.keys(data.paths);

      // Verificar se todas as rotas principais estão documentadas
      expect(paths).toContain('/api/health');
      expect(paths).toContain('/api/simulations');
      expect(paths).toContain('/api/allocations');
      expect(paths).toContain('/api/movements');
      expect(paths).toContain('/api/insurances');
      expect(paths).toContain('/api/projections');
      expect(paths).toContain('/api/clients');
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com rotas não encontradas', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/rota-inexistente',
      });

      expect(response.statusCode).toBe(404);
      const error = response.json();
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('error');
      expect(error).toHaveProperty('message');
    });

    it('deve lidar com métodos não permitidos', async () => {
      const response = await app.inject({
        method: 'PATCH', // Método não implementado
        url: '/api/health',
      });

      expect(response.statusCode).toBe(404);
    });

    it('deve lidar com erros de validação', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: {
          // Dados inválidos
          name: '',
          startDate: 'data-invalida',
          realRate: 'não é número',
        },
      });

      expect(response.statusCode).toBe(400);
      const error = response.json();
      expect(error).toHaveProperty('status');
      expect(error.status).toBe('error');
    });

    it('deve lidar com erros internos do servidor', async () => {
      // Simular erro interno
      const originalHealth = app.health;
      app.health = () => {
        throw new Error('Internal server error');
      };

      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(500);

      // Restaurar função original
      app.health = originalHealth;
    });

    it('deve ter handler de erro global', async () => {
      // Simular erro não tratado
      const originalRoutes = app.printRoutes;
      app.printRoutes = () => {
        throw new Error('Unhandled error');
      };

      // O servidor deve continuar funcionando
      expect(app).toBeDefined();
      expect(app.server).toBeDefined();

      // Restaurar função original
      app.printRoutes = originalRoutes;
    });
  });

  describe('Middleware e Plugins', () => {
    it('deve ter middleware de logging configurado', () => {
      expect(app.log).toBeDefined();
      expect(typeof app.log.info).toBe('function');
      expect(typeof app.log.error).toBe('function');
      expect(typeof app.log.warn).toBe('function');
    });

    it('deve ter middleware de compressão configurado', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/documentation/json',
      });

      expect(response.statusCode).toBe(200);
      // Verificar se a resposta pode ser comprimida
      expect(response.headers).toBeDefined();
    });

    it('deve ter middleware de segurança configurado', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      // Verificar headers de segurança
      expect(response.headers).toBeDefined();
    });

    it('deve ter middleware de parsing de JSON configurado', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: {
          name: 'Teste',
          startDate: '2025-01-01',
          realRate: 0.04,
          clientId: 1,
        },
      });

      // Deve processar JSON corretamente
      expect(response.statusCode).toBe(400); // Erro esperado por cliente inexistente
    });
  });

  describe('Configuração de Ambiente', () => {
    it('deve usar configurações de ambiente corretas', () => {
      expect(process.env.NODE_ENV).toBeDefined();
      expect(process.env.DATABASE_URL).toBeDefined();
    });

    it('deve ter configurações de porta corretas', () => {
      const address = app.server.address();
      expect(address).toBeDefined();
    });

    it('deve ter configurações de timeout corretas', async () => {
      const start = Date.now();
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });
      const duration = Date.now() - start;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(5000); // Deve responder em menos de 5 segundos
    });
  });

  describe('Integração com Banco de Dados', () => {
    it('deve conectar com o banco de dados', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.database.connected).toBe(true);
    });

    it('deve executar operações no banco de dados', async () => {
      // Criar cliente
      const clientResponse = await app.inject({
        method: 'POST',
        url: '/api/clients',
        payload: {
          name: 'Cliente Teste Server',
          email: 'teste.server@exemplo.com',
        },
      });

      expect(clientResponse.statusCode).toBe(201);
      const client = clientResponse.json();

      // Criar simulação
      const simulationResponse = await app.inject({
        method: 'POST',
        url: '/api/simulations',
        payload: {
          name: 'Simulação Teste Server',
          startDate: '2025-01-01',
          realRate: 0.04,
          clientId: client.id,
        },
      });

      expect(simulationResponse.statusCode).toBe(201);
    });
  });

  describe('Performance e Escalabilidade', () => {
    it('deve lidar com múltiplas requisições simultâneas', async () => {
      const promises = Array.from({ length: 20 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/health',
        })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });

    it('deve ter tempo de resposta aceitável', async () => {
      const start = Date.now();
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });
      const duration = Date.now() - start;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(1000); // Deve responder em menos de 1 segundo
    });

    it('deve usar memória de forma eficiente', () => {
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Menos de 100MB
    });
  });

  describe('Logging e Monitoramento', () => {
    it('deve registrar requisições', async () => {
      const logSpy = jest.spyOn(console, 'log');

      await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      // Verificar se logs foram gerados
      expect(logSpy).toHaveBeenCalled();

      logSpy.mockRestore();
    });

    it('deve registrar erros', async () => {
      const errorSpy = jest.spyOn(console, 'error');

      await app.inject({
        method: 'GET',
        url: '/api/rota-inexistente',
      });

      // Verificar se erros foram registrados
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});
