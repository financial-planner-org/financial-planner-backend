// Importa o Fastify e o provedor de tipos Zod
import Fastify from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import swaggerPlugin from './plugins/swagger';
import healthRoute from './routes/health';
import simulationsRoute from './routes/simulations';

// Função que constrói e configura o servidor
export async function buildServer() {
    // Cria uma instância do Fastify com logger ativado
    // e configura o Zod como provedor de tipos
    const app = Fastify({ 
        logger: true 
    }).withTypeProvider<ZodTypeProvider>();

    // Registra os plugins (como o Swagger)
    await app.register(swaggerPlugin);
    
    // Registra as rotas
    await app.register(healthRoute, { prefix: '/api' });
    await app.register(simulationsRoute, { prefix: '/api' });

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
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    })();
}