// Importa o Fastify e o provedor de tipos Zod
import Fastify from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import swaggerPlugin from './plugins/swagger';
import cors from '@fastify/cors';

// Importa as rotas
import healthRoute from './routes/health';
import simulationsRoute from './routes/simulations';
import allocationsRoute from './routes/allocations';
import movementsRoute from './routes/movements';
import insurancesRoute from './routes/insurances';
import projectionRoute from './routes/projections';

import clientsRoute from './routes/clients';

// Função que constrói e configura o servidor
export async function buildServer() {
  // Cria uma instância do Fastify com logger ativado
  // e configura o Zod como provedor de tipos
  const app = Fastify({
    logger: false,
    // Aumenta o limite de payload para uploads maiores
    bodyLimit: 1048576 * 10, // 10MB
    // Configura o CORS para aceitar requisições de qualquer origem em desenvolvimento
    // Em produção, especifique as origens permitidas
    ...(process.env.NODE_ENV !== 'production' && {
      ajv: {
        customOptions: {
          removeAdditional: 'all',
          coerceTypes: true,
          useDefaults: true,
        },
      },
    }),
  }).withTypeProvider<ZodTypeProvider>();

  // Registra o plugin de CORS para permitir requisições do frontend
  await app.register(cors, {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Registra os plugins (como o Swagger)
  await app.register(swaggerPlugin);

  // Registra as rotas com prefixo /api
  await app.register(healthRoute, { prefix: '/api' });
  await app.register(simulationsRoute, { prefix: '/api' });
  await app.register(allocationsRoute, { prefix: '/api' });
  await app.register(movementsRoute, { prefix: '/api' });
  await app.register(insurancesRoute, { prefix: '/api' });
  await app.register(projectionRoute, { prefix: '/api' });
  await app.register(clientsRoute, { prefix: '/api' });

  // Rota de boas-vindas
  app.get('/', { schema: { hide: true } }, async () => {
    return {
      name: 'Financial Planner API',
      version: '1.0.0',
      documentation: '/documentation',
      status: 'online',
      timestamp: new Date().toISOString(),
    };
  });

  // Manipulador de erros global
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    // Erros de validação
    if (error.validation) {
      return reply.status(400).send({
        status: 'error',
        message: 'Erro de validação',
        errors: error.validation,
      });
    }
    // Outros erros
    return reply.status(error.statusCode || 500).send({
      status: 'error',
      message: error.message || 'Erro interno do servidor',
    });
  });

  return app;
}

// Se este arquivo for executado diretamente (não importado)
if (require.main === module) {
  (async () => {
    const app = await buildServer();
    try {
      // Define a porta a partir da variável de ambiente ou usa 3001 como padrão
      const port = Number(process.env.PORT) || 3001;
      // Inicia o servidor
      await app.listen({ port, host: '0.0.0.0' });
      console.log(`Servidor rodando em http://localhost:${port}`);
      console.log(`Documentação da API disponível em http://localhost:${port}/documentation`);
    } catch (err) {
      console.error('Erro ao iniciar o servidor:', err);
      process.exit(1);
    }
  })();
}
