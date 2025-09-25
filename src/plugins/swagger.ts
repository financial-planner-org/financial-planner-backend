import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';

export default fp(async (app) => {
	await app.register(swagger, {
		routePrefix: '/documentation',
		swagger: {
			info: {
				title: 'Financial Planner API',
				version: '0.1.0'
			}
		},
		exposeRoute: true
	});
});