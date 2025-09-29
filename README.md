# Financial Planner Backend

Backend para o sistema de planejamento financeiro, construído com Node.js, Fastify e TypeScript.

## 🚀 Começando

### Pré-requisitos

- Node.js 18 ou superior
- npm 9 ou superior
- Docker (opcional, para banco de dados)

### Instalação

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente (veja `.env.example`)
4. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

## 🛠️ Tecnologias

- **Node.js** - Ambiente de execução JavaScript
- **Fastify** - Framework web rápido e de baixo custo
- **TypeScript** - Superset tipado do JavaScript
- **Prisma** - ORM para Node.js e TypeScript
- **PostgreSQL** - Banco de dados relacional
- **Zod** - Validação de esquema
- **Jest** - Testes unitários e de integração
- **ESLint** & **Prettier** - Linting e formatação de código

## 📦 Estrutura do Projeto

```
src/
├── config/         # Configurações do aplicativo
├── database/       # Configurações e modelos do banco de dados
│   └── prisma.service.ts  # Cliente Prisma
├── plugins/        # Plugins do Fastify (Swagger, etc.)
├── prisma/         # Configurações do Prisma
│   ├── migrations/ # Migrações do banco de dados
│   └── schema.prisma # Schema do banco de dados
├── routes/         # Definições de rotas
│   ├── health.ts   # Rota de verificação de saúde
│   └── simulations.ts # Rotas de simulações
├── services/       # Lógica de negócios
│   └── simulation.service.ts # Serviço de simulações
└── server.ts       # Ponto de entrada da aplicação
```

## 🌐 Rotas da API

### Saúde
- `GET /api/health` - Verifica se a API está funcionando
  - Resposta: `{ "status": "ok" }`

### Simulações
- `POST /api/simulations` - Cria uma nova simulação
  - Corpo da requisição:
    ```json
    {
      "name": "Minha Simulação",
      "initialAmount": 1000,
      "monthlyContribution": 100,
      "months": 12,
      "annualInterestRate": 0.1
    }
    ```
  - Validação: Todos os campos são obrigatórios e devem seguir as regras de validação

- `GET /api/simulations/:id` - Obtém uma simulação pelo ID
  - Parâmetros de URL: `id` (string)
  - Resposta: Detalhes da simulação

## 📚 Documentação da API

Acesse a documentação interativa da API em:
http://localhost:3001/documentation

## 🧪 Testando a API

### Usando cURL

1. Verifique a saúde da API:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. Crie uma nova simulação:
   ```bash
   curl -X POST http://localhost:3001/api/simulations \
     -H "Content-Type: application/json" \
     -d '{"name": "Minha Simulação", "initialAmount": 1000, "monthlyContribution": 100, "months": 12, "annualInterestRate": 0.1}'
   ```

3. Obtenha uma simulação pelo ID (substitua `:id` pelo ID retornado na criação):
   ```bash
   curl http://localhost:3001/api/simulations/:id
   ```
## 🗃️ Banco de Dados

### Modelos Principais

#### Simulation
- `id`: Identificador único
- `name`: Nome da simulação
- `startDate`: Data de início
- `realRate`: Taxa real
- `status`: Status (Vivo/Morto/Inválido)
- `baseId`: Referência à simulação base (para versões)

#### Allocation
- `id`: Identificador único
- `type`: Tipo (financeira/imobilizada)
- `name`: Nome da alocação
- `value`: Valor
- `startDate`: Data de início (opcional)
- `installments`: Número de parcelas (opcional)
- `interestRate`: Taxa de juros (opcional)

#### Movement
- `id`: Identificador único
- `type`: Tipo (renda/despesa)
- `value`: Valor
- `frequency`: Frequência (única/mensal/anual)
- `startDate`: Data de início
- `endDate`: Data de término (opcional)

#### Insurance
- `id`: Identificador único
- `name`: Nome do seguro
- `startDate`: Data de início
- `durationMonths`: Duração em meses
- `premium`: Valor do prêmio
- `insuredValue`: Valor segurado

### Migrações

Para criar uma nova migração após alterações no schema:

```bash
npx prisma migrate dev --name descricao_da_mudanca
```

### Prisma Studio

Para visualizar e gerenciar os dados diretamente:

```bash
npx prisma studio
```

## 🧪 Testes Automatizados (Jest + Supertest)

O projeto utiliza o Jest como framework de testes, com suporte a testes unitários e de integração. Para implementação, seguimos as melhores práticas de teste automatizado.

### Configuração Inicial

1. Instale as dependências necessárias:
   ```bash
   npm install jest ts-jest @types/jest supertest @types/supertest --save-dev
   ```

2. Inicialize a configuração do Jest com TypeScript:
   ```bash
   npx ts-jest config:init
   ```

3. Certifique-se que seu `jest.config.js` contenha:
   ```javascript
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
     testMatch: ['**/tests/**/*.test.ts'],
     collectCoverage: true,
     coverageDirectory: 'coverage',
     coverageReporters: ['text', 'lcov'],
     setupFilesAfterEnv: ['./tests/setup.ts']
   };
   ```

### Estrutura de Pastas

```
tests/
├── routes/               # Testes de rotas da API
│   ├── allocations.test.ts  # Testes da rota de alocações
│   ├── health.test.ts      # Testes da rota de saúde
│   └── simulations.test.ts # Testes da rota de simulações
└── services/             # Testes de serviços
    └── simulation.test.ts  # Testes do serviço de simulação
setup.ts                  # Configuração global dos testes
```

### Comandos

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage

# Executar testes de integração
npm test -- tests/integration/

# Executar testes unitários
npm test -- tests/unit/

# Executar um arquivo de teste específico
npm test -- tests/unit/services/simulation.service.test.ts
```

### Exemplos de Testes

#### 1. Teste Unitário para Cálculo de Projeção

```typescript
// tests/unit/services/projection.service.test.ts
import { calculateProjection } from '../../../src/services/projection.service';

const mockSimulationData = () => ({
  initialTotal: 100000,
  annualContribution: 12000,
  years: 10,
  realRate: 0.04, // 4% ao ano
  status: 'VIVO' // Pode ser 'VIVO', 'MORTO' ou 'INVALIDO'
});

describe('Projection Service', () => {
  it('deve manter valores constantes com taxa zero', () => {
    const data = mockSimulationData();
    const result = calculateProjection({ ...data, realRate: 0 });
    
    expect(result.totalByYear[2023]).toBeCloseTo(data.initialTotal);
    expect(result.totalByYear[2024]).toBeCloseTo(
      data.initialTotal + data.annualContribution
    );
  });

  it('deve calcular corretamente a projeção para status VIVO', () => {
    const data = mockSimulationData();
    const result = calculateProjection(data);
    
    // Verifica se o valor projetado é maior que o inicial
    expect(result.totalByYear[2033]).toBeGreaterThan(data.initialTotal);
  });

  it('deve aplicar regras específicas para status MORTO', () => {
    const data = { ...mockSimulationData(), status: 'MORTO' };
    const result = calculateProjection(data);
    
    // Verifica se as regras específicas para falecido foram aplicadas
    expect(result.monthlyExpenses).toBeLessThan(
      mockSimulationData().monthlyExpenses
    );
  });
});
```

#### 2. Teste de Integração para a API

```typescript
// tests/integration/api/projections.test.ts
import { buildServer } from '../../../src/server';
import { prisma } from '../../../src/config/database';

let app;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('POST /api/projections', () => {
  let simulation;
  
  beforeAll(async () => {
    // Cria uma simulação de teste
    simulation = await prisma.simulation.create({
      data: {
        name: 'Test Simulation',
        startDate: new Date(),
        realRate: 0.04,
        status: 'ATIVO'
      }
    });
  });

  afterAll(async () => {
    // Limpa os dados de teste
    await prisma.simulation.deleteMany();
  });

  it('deve calcular a projeção com sucesso', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/projections',
      payload: {
        simulationId: simulation.id,
        status: 'VIVO'
      }
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);
    
    expect(result).toHaveProperty('totalByYear');
    expect(result).toHaveProperty('annualContributions');
    expect(result).toHaveProperty('annualReturns');
    
    // Verifica se a projeção tem os anos esperados
    const currentYear = new Date().getFullYear();
    expect(result.totalByYear).toHaveProperty(currentYear.toString());
    expect(result.totalByYear).toHaveProperty((currentYear + 10).toString());
  });
});
```

#### 3. Teste de Serviço

```typescript
// tests/unit/services/simulation.service.test.ts
import { simulationService } from '../../../src/services/simulation.service';
import { prisma } from '../../../src/config/database';

describe('Simulation Service', () => {
  afterEach(async () => {
    // Limpar dados após cada teste
    await prisma.simulation.deleteMany();
  });

  describe('createSimulation', () => {
    it('deve criar uma simulação com sucesso', async () => {
      const input = {
        name: 'Test Simulation',
        description: 'Test Description',
        realRate: 0.1,
        status: 'ATIVO',
        startDate: new Date().toISOString()
      };

      const result = await simulationService.createSimulation(input);
      
      expect(result).toMatchObject({
        name: input.name,
        description: input.description,
        realRate: input.realRate,
        status: 'ATIVO'
      });
    });
  });
});
```

### Testes de Integração

```typescript
// tests/integration/api/simulations.test.ts
import { buildServer } from '../../../src/server';
import { prisma } from '../../../src/config/database';

let app;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('POST /api/simulations', () => {
  afterEach(async () => {
    await prisma.simulation.deleteMany();
  });

  it('deve criar uma nova simulação', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/simulations',
      payload: {
        name: 'Test Simulation',
        realRate: 0.1,
        status: 'ATIVO',
        startDate: new Date().toISOString()
      }
    });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toMatchObject({
      name: 'Test Simulation',
      realRate: 0.1,
      status: 'ATIVO'
    });
  });
});
```

### Boas Práticas

1. **Nomes Descritivos**: Use nomes descritivos para testes e suítes de teste.
2. **Arrange-Act-Assert**: Siga o padrão AAA (Arrange, Act, Assert) para organizar os testes.
3. **Testes Isolados**: Cada teste deve ser independente e não depender do estado de outros testes.
4. **Mock de Dependências**: Use mocks para isolar o código em teste de suas dependências.
5. **Cobertura de Código**: Mantenha uma cobertura de código alta (acima de 80%).

### Integração Contínua (GitHub Actions)

O projeto inclui um workflow do GitHub Actions (`.github/workflows/test.yml`) configurado para:

1. Executar em cada push para as branches principais e pull requests
2. Configurar Node.js e cache de dependências
3. Instalar dependências
4. Executar linting e formatação
5. Executar testes com cobertura
6. Enviar relatório para o Codecov

Exemplo de configuração:

```yaml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Run tests
        run: npm run test:ci
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test?schema=public
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          file: ./coverage/lcov.info
          fail_ci_if_error: false
```

### Cobertura de Código

O projeto utiliza o `jest --coverage` para gerar relatórios de cobertura. A meta é manter pelo menos 80% de cobertura de código.

Para verificar a cobertura localmente:

```bash
# Gerar relatório de cobertura
npm run test:coverage

# Visualizar relatório (abre no navegador)
npx serve coverage/lcov-report
```

O relatório inclui:
- Cobertura de linhas, funções e branches
- Arquivos com baixa cobertura
- Tendência de cobertura ao longo do tempo

### Boas Práticas de Teste

1. **Nomes Descritivos**: Use nomes que descrevam o comportamento esperado
2. **Testes Isolados**: Cada teste deve ser independente
3. **AAA Pattern**: Siga o padrão Arrange-Act-Assert
4. **Mocks**: Use mocks para dependências externas
5. **Fábricas de Teste**: Crie funções auxiliares para dados de teste
6. **Testes Determinísticos**: Evite dependência de dados externos ou aleatórios

## 🔄 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```env
NODE_ENV=development
PORT=3000
```


## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas alterações (`git commit -m 'Add some AmazingFeature'`)
4. Faça o push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
