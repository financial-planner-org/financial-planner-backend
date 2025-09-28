import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
// import { randomBytes } from 'crypto';
import { join } from 'path';
import { config } from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env.test
config({ path: join(__dirname, '../.env') });

// Usa a URL do banco de dados do arquivo .env
const testDatabaseUrl = process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('DATABASE_URL não está definido no arquivo .env');
}

console.log(`Usando banco de dados: ${testDatabaseUrl}`);

// Cria uma nova instância do Prisma Client para testes
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl,
    },
  },
  log: process.env.NODE_ENV === 'test' ? [] : ['query', 'info', 'warn', 'error'],
});

// Hooks globais do Jest
beforeAll(async () => {
  // Geração do Prisma Client movida para fora dos testes
  // para evitar problemas de permissão

  // Executa as migrações no banco de dados de teste
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
    stdio: 'inherit',
  });

  // Conecta ao banco de dados
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  try {
    // Obtém todas as tabelas do schema público
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'prisma_%'
      AND tablename NOT LIKE '_prisma_%';`;

    // Desativa temporariamente as restrições de chave estrangeira
    await prisma.$executeRaw`SET session_replication_role = 'replica'`;

    // Limpa todas as tabelas
    for (const { tablename } of tables) {
      if (tablename) {
        try {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
          // Reinicia as sequências para evitar problemas com IDs
          await prisma.$executeRawUnsafe(`ALTER SEQUENCE "${tablename}_id_seq" RESTART WITH 1`);
        } catch (error) {
          console.warn(`Erro ao limpar a tabela ${tablename}:`, error);
        }
      }
    }

    // Reativa as restrições de chave estrangeira
    await prisma.$executeRaw`SET session_replication_role = 'origin'`;
  } catch (error) {
    console.error('Erro ao limpar o banco de dados de teste:', error);
    throw error;
  }
});
// Exporta o Prisma Client para uso nos testes
export { prisma };
