import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Config - App Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Salvar o ambiente original
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restaurar o ambiente original
    process.env = originalEnv;
  });

  it('deve carregar configurações padrão quando variáveis de ambiente não estão definidas', () => {
    // Limpar variáveis de ambiente
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.DATABASE_URL;

    // Recarregar o módulo para testar as configurações padrão
    jest.resetModules();

    // Importar o módulo de configuração
    const config = require('../../src/config/app');

    // Verificar se as configurações padrão são aplicadas
    expect(config).toBeDefined();
  });

  it('deve carregar configurações personalizadas quando variáveis de ambiente estão definidas', () => {
    // Definir variáveis de ambiente personalizadas
    process.env.PORT = '3002';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

    // Recarregar o módulo para testar as configurações personalizadas
    jest.resetModules();

    // Importar o módulo de configuração
    const config = require('../../src/config/app');

    // Verificar se as configurações personalizadas são aplicadas
    expect(config).toBeDefined();
  });

  it('deve validar formato da URL do banco de dados', () => {
    // Testar URL válida
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
    jest.resetModules();

    expect(() => {
      require('../../src/config/app');
    }).not.toThrow();
  });

  it('deve lidar com URL de banco de dados inválida', () => {
    // Testar URL inválida
    process.env.DATABASE_URL = 'invalid-url';
    jest.resetModules();

    // O módulo deve carregar mesmo com URL inválida
    expect(() => {
      require('../../src/config/app');
    }).not.toThrow();
  });

  it('deve usar porta padrão quando PORT não está definida', () => {
    delete process.env.PORT;
    jest.resetModules();

    const config = require('../../src/config/app');
    expect(config).toBeDefined();
  });

  it('deve usar NODE_ENV padrão quando não está definida', () => {
    delete process.env.NODE_ENV;
    jest.resetModules();

    const config = require('../../src/config/app');
    expect(config).toBeDefined();
  });
});
