import request from 'supertest';
import { buildServer } from '../../src/server';

describe('Health Check', () => {
  let app: any;

  beforeAll(async () => {
    // Inicia o servidor antes dos testes
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    // Fecha o servidor após os testes
    await app.close();
  });

  it('GET /api/health deve retornar 200 OK', async () => {
    const response = await request(app.server)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      version: expect.any(String)
    });
  });

  it('GET /rota-que-nao-existe deve retornar 404', async () => {
    const response = await request(app.server)
      .get('/rota-que-nao-existe')
      .expect(404);

    expect(response.body).toHaveProperty('error');
    // Verifica se a mensagem de erro contém 'Not Found' ou 'não encontrada'
    expect(response.body.error).toMatch(/Not Found|não encontrada|não encontrado/i);
  });
});
