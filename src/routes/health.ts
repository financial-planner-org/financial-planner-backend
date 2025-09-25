import { FastifyInstance } from 'fastify';

export default async function (app: FastifyInstance) {
	app.get('/health', async () => ({ status: 'ok' }));
}