import { FastifyInstance, FastifyReply } from 'fastify';

/**
 * Interface para a resposta de saúde da API
 */
interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
  version: string;
}

/**
 * Módulo de rotas de verificação de saúde da API
 *
 * Este módulo fornece endpoints para verificar o status de saúde da aplicação,
 *
 * @module HealthRoutes
 * @param {FastifyInstance} app - Instância do Fastify
 * @returns {Promise<void>}
 */
export default async function healthRoutes(app: FastifyInstance): Promise<void> {
  /**
   * @route GET /health
   * @description Verifica o status de saúde da aplicação
   * @operationId getHealth
   * @tags Saúde
   *
   * @example
   * // Exemplo de resposta
   * {
   *   "status": "ok",
   *   "timestamp": "2023-01-01T12:00:00.000Z",
   *   "uptime": 1234.56,
   *   "version": "1.0.0"
   * }
   */
  app.get<{ Reply: HealthResponse }>(
    '/health',
    {
      schema: {
        summary: 'Verifica o status de saúde da aplicação',
        description: 'Retorna o status atual da aplicação, incluindo tempo de atividade e versão.',
        tags: ['Saúde'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok'] },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number' },
              version: { type: 'string' },
            },
            required: ['status', 'timestamp', 'uptime', 'version'],
            additionalProperties: false,
          },
        },
      },
    },
    // O parâmetro request não é utilizado, mas é necessário para a assinatura da função
    async (_, reply: FastifyReply): Promise<HealthResponse> => {
      const response: HealthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '0.0.0',
      };

      return reply.send(response);
    }
  );
}
