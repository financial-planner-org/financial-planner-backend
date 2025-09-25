import { FastifyInstance } from 'fastify';

// Exporta uma função que recebe a instância do Fastify
// e registra a rota /health
export default async function (app: FastifyInstance) {
    // Define uma rota GET /health que retorna { status: 'ok' }
    app.get('/health', async () => ({ status: 'ok' }));
}