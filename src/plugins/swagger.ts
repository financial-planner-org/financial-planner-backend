import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// Configuração simplificada do Swagger
export default fp(async app => {
  // Configuração básica do Swagger
  await app.register(swagger, {
    swagger: {
      info: {
        title: 'Financial Planner API',
        description: 'API para planejamento financeiro com simulações de investimentos',
        version: '0.1.0',
      },
      host: 'localhost:3001',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  });

  // Configuração da UI do Swagger
  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  });
});
