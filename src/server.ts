import Fastify from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import swaggerPlugin from './plugins/swagger';
import healthRoute from './routes/health';

export async function buildServer() {
	// cria app com suporte a Zod como type provider
	const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

	// registra plugins/rotas
	await app.register(swaggerPlugin);
	await app.register(healthRoute); // prefix definido na própria rota se desejado

	return app;
}

if (require.main === module) {
	(async () => {
		const app = await buildServer();
		try {
			const port = Number(process.env.PORT) || 3001;
			await app.listen({ port, host: '0.0.0.0' });
			app.log.info(`Server listening on http://0.0.0.0:${port}`);
		} catch (err) {
			app.log.error(err);
			process.exit(1);
		}
	})();
}