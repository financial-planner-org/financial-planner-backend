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
<http://localhost:3001/documentation>

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

### Schema Atual (PostgreSQL 15 + Prisma ORM)

#### Modelos Implementados

##### **Client** (Modelo Base)

```prisma
model Client {
  id          Int          @id @default(autoincrement())
  name        String
  email       String       @unique
  phone       String?
  address     String?
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  simulations Simulation[]
}
```

##### **Simulation** (Simulações e Versões)

```prisma
model Simulation {
  id          Int          @id @default(autoincrement())
  name        String
  startDate   DateTime
  realRate    Float
  status      String
  baseId      Int?         // Para controle de versões
  clientId    Int          // Relacionamento com Cliente
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  description String?
  
  // Relacionamentos
  client      Client       @relation(fields: [clientId], references: [id])
  base        Simulation?  @relation("SimulationVersions", fields: [baseId], references: [id])
  versions    Simulation[] @relation("SimulationVersions")
  allocations Allocation[]
  insurances  Insurance[]
  movements   Movement[]
}
```

##### **Allocation** (Alocações Financeiras e Imobiliárias)

```prisma
model Allocation {
  id           Int           @id @default(autoincrement())
  simulationId Int
  type         String        // "FINANCEIRA" ou "IMOBILIZADA"
  name         String
  value        Float
  startDate    DateTime?     // Para financiamentos
  installments Int?          // Número de parcelas (financiamento)
  interestRate Float?        // Taxa de juros (financiamento)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  // Relacionamentos
  simulation   Simulation    @relation(fields: [simulationId], references: [id])
  records      AssetRecord[] // Histórico de valores
}
```

##### **AssetRecord** (Registros Históricos de Ativos)

```prisma
model AssetRecord {
  id           Int        @id @default(autoincrement())
  allocationId Int
  date         DateTime   @default(now())
  value        Float
  notes        String?    // Observações do registro
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  allocation   Allocation @relation(fields: [allocationId], references: [id])
}
```

##### **Movement** (Movimentações Financeiras)

```prisma
model Movement {
  id           Int        @id @default(autoincrement())
  simulationId Int
  type         String     // "ENTRADA" ou "SAIDA"
  value        Float
  description  String
  frequency    String     // "UNICA", "MENSAL", "ANUAL"
  startDate    DateTime
  endDate      DateTime?  // Opcional para movimentações contínuas
  category     String?    // Categoria da movimentação
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  simulation   Simulation @relation(fields: [simulationId], references: [id])
}
```

##### **Insurance** (Seguros de Vida e Invalidez)

```prisma
model Insurance {
  id             Int        @id @default(autoincrement())
  simulationId   Int
  name           String
  type           String     // "VIDA" ou "INVALIDEZ"
  startDate      DateTime
  durationMonths Int
  premium        Float      // Prêmio mensal
  insuredValue   Float      // Valor segurado
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  
  simulation     Simulation @relation(fields: [simulationId], references: [id])
}
```

### Migrações Implementadas

#### **Histórico de Migrações:**

1. **`20250925164536_init`** - Schema inicial
2. **`20250925172543_add_description_and_isactive_fields`** - Campos adicionais
3. **`20250926012718_init`** - Reinicialização
4. **`20250926020959_add_user_id_to_simulation`** - Campo user_id
5. **`20250926023150_update_simulation_model`** - Atualização do modelo
6. **`20250926032921_remove_user_id_from_simulation`** - Remoção do user_id
7. **`20250926230145_add_client_relation`** - Relacionamento com cliente
8. **`20250929103341_add_client_model`** - Modelo Client completo

#### **Comandos de Migração:**

```bash
# Criar nova migração
npx prisma migrate dev --name descricao_da_mudanca

# Aplicar migrações pendentes
npx prisma migrate deploy

# Reset do banco (desenvolvimento)
npx prisma migrate reset

# Gerar cliente Prisma
npx prisma generate
```

### Prisma Studio

```bash
# Visualizar e gerenciar dados
npx prisma studio
```

**URL**: <http://localhost:5555>

### Relacionamentos Implementados

#### **Hierarquia de Dados:**

```
Client (1) ──── (N) Simulation
    │
    └─── Simulation (1) ──── (N) Allocation
    │                           │
    │                           └─── Allocation (1) ──── (N) AssetRecord
    │
    ├─── Simulation (1) ──── (N) Movement
    │
    └─── Simulation (1) ──── (N) Insurance

Simulation (1) ──── (N) Simulation (Versões)
```

#### **Controle de Versões:**

- **`baseId`**: Referência à simulação original
- **`status`**: Controla se é "SITUACAO_ATUAL" ou "ATIVO"
- **Versões legadas**: Simulações com `baseId` não nulo
- **Histórico completo**: Todas as versões mantidas para auditoria

## 🧪 Testes Automatizados (Jest + Supertest)

O projeto implementa uma suíte completa de testes seguindo os requisitos do case: **Jest + Supertest com cobertura acima de 80%**, organizados dentro da pasta `tests/` imitando a arquitetura dos arquivos. **Prioridade especial nos testes do motor de projeção patrimonial**.

### Estrutura de Testes Implementada

```
tests/
├── routes/                           # Testes de Integração das Rotas
│   ├── health-check.test.ts          # Validação de Saúde da API
│   ├── clients-crud.test.ts          # CRUD Completo de Clientes
│   ├── simulations-management.test.ts # Gerenciamento de Simulações e Versões
│   ├── allocations-management.test.ts # Gerenciamento de Alocações
│   ├── movements-timeline.test.ts    # CRUD e Timeline de Movimentações
│   └── insurances-management.test.ts # Gerenciamento de Seguros
└── services/                         # Testes de Serviços (Lógica de Negócio)
    ├── projection-engine.test.ts     # Motor de Projeção (PRIORIDADE)
    ├── simulation-service.test.ts    # Serviço de Simulações
    └── client-service.test.ts        # Serviço de Clientes
```

### Configuração Implementada

**Jest Config (`jest.config.ts`):**

```typescript
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
     testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  reporters: ['default', 'jest-junit'],
     collectCoverage: true,
     coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
   };
   ```

### Comandos de Teste

```bash
# Executar todos os testes
npm test

# Executar testes com cobertura
npm run test:coverage

# Executar testes de rotas específicas
npm test -- tests/routes/

# Executar testes de serviços específicos
npm test -- tests/services/

# Executar teste específico do motor de projeção (PRIORIDADE)
npm test -- tests/services/projection-engine.test.ts

# Executar testes em modo watch
npm run test:watch
```

### Cobertura de Testes por Funcionalidade

#### ✅ **Motor de Projeção Patrimonial** (Prioridade do Case)

- **Endpoint de projeção**: ID da simulação + status (Vivo/Morto)
- **Projeção ano a ano até 2060**: 35 anos completos
- **Taxa real composta**: 4% padrão, configurável via input
- **Ponto inicial da simulação**: registro mais recente anterior à data
- **Status de vida**: VIVO/MORTO/INVÁLIDO com regras específicas
- **Projeção sem seguros**: opção includeInsurances

#### ✅ **Gerenciamento de Simulações**

- CRUD completo de simulações
- Duplicação de simulações (nova versão)
- Criação de "Situação Atual"
- Verificação de status e permissões
- Validação de versões legadas

#### ✅ **Gerenciamento de Clientes**

- CRUD completo de clientes
- Validação de email único
- Clientes ativos/inativos
- Validações de dados

#### ✅ **Gerenciamento de Alocações**

- Alocações financeiras e imobiliárias
- Registros históricos de valores
- Financiamento para imóveis
- Timeline de evolução dos ativos

#### ✅ **Timeline de Movimentações**

- CRUD de movimentações (entrada/saída)
- Frequências: única, mensal, anual
- Timeline encadeada de transações
- Cenários especiais de sobreposição

#### ✅ **Gerenciamento de Seguros**

- Seguros de vida e invalidez
- Cálculo de valor total segurado
- Múltiplos seguros por simulação
- Validações de prêmio e duração

### Exemplos de Testes Implementados

#### 1. Teste do Motor de Projeção (Prioridade do Case)

```typescript
// tests/services/projection-engine.test.ts
describe('Motor de Projeção Patrimonial - Testes Prioritários', () => {
  describe('Cálculo de Valores Iniciais - Ponto Inicial da Simulação', () => {
    it('deve considerar o registro mais recente anterior à data da simulação', async () => {
      const { projectionService } = await import('../../src/routes/projections');
      
      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 5,
        includeInsurances: true
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Verificar se os valores iniciais estão corretos
      // Financeiro: deve pegar o valor de 2025-05-01 (105000)
      expect(result.projections.financial[0]).toBe(105000);
      
      // Imobiliário: deve pegar o valor de 2025-04-01 (530000)
      expect(result.projections.realEstate[0]).toBe(530000);
    });

    it('deve calcular projeção para 35 anos (até 2060)', async () => {
      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'VIVO' as const,
        realReturnRate: 0.04,
        projectionYears: 35, // Até 2060
        includeInsurances: true
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Deve ter 35 anos de projeção
      expect(result.years).toHaveLength(35);
      expect(result.years[0]).toBe(2026); // Primeiro ano da projeção
      expect(result.years[result.years.length - 1]).toBe(2060); // Último ano
    });

    it('deve aplicar regras específicas para status MORTO', async () => {
      const projectionRequest = {
        simulationId: testSimulation.id,
        status: 'MORTO' as const,
        realReturnRate: 0.04,
        projectionYears: 3,
        includeInsurances: true
      };

      const result = await projectionService.calculateProjection(projectionRequest);

      // Para MORTO, os seguros devem ser reduzidos pela metade no primeiro ano
      expect(result.projections.insurance[0]).toBeCloseTo(800000 * 0.5, -2);
    });
  });
});
```

#### 2. Teste de Integração de Rotas

```typescript
// tests/routes/simulations-management.test.ts
describe('Simulações - Gerenciamento Completo e Versões', () => {
  describe('POST /api/simulations/:id/duplicate - Duplicar Simulação', () => {
    it('deve duplicar simulação existente com novo nome', async () => {
      const duplicateData = {
        name: 'Simulação Duplicada'
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/simulations/${originalSimulation.id}/duplicate`,
        payload: duplicateData
      });

      expect(response.statusCode).toBe(201);
      const duplicatedSimulation = response.json();
      expect(duplicatedSimulation.name).toBe(duplicateData.name);
      expect(duplicatedSimulation.baseId).toBe(originalSimulation.id);
    });
  });

  describe('POST /api/simulations/:id/current-situation - Criar Situação Atual', () => {
    it('deve criar situação atual a partir de simulação existente', async () => {
    const response = await app.inject({
      method: 'POST',
        url: `/api/simulations/${baseSimulation.id}/current-situation`
      });

      expect(response.statusCode).toBe(201);
      const currentSituation = response.json();
      expect(currentSituation.status).toBe('SITUACAO_ATUAL');
      expect(currentSituation.name).toContain(baseSimulation.name);
    });
  });
});
```

#### 3. Teste de Serviços

```typescript
// tests/services/simulation-service.test.ts
describe('Serviço de Simulações - Lógica de Negócio', () => {
  describe('createSimulation - Criar Simulação', () => {
    it('deve criar uma simulação com sucesso', async () => {
      const input: CreateSimulationInput = {
        name: 'Minha Primeira Simulação',
        description: 'Descrição da simulação',
        realRate: 0.1,
        status: 'ATIVO',
        startDate: new Date().toISOString(),
        clientId: testClient.id
      };

      const result = await simulationService.createSimulation(input);
      
      expect(result).toMatchObject({
        name: input.name,
        description: input.description,
        realRate: input.realRate,
        status: input.status,
        clientId: input.clientId
      });
      expect(result.id).toBeDefined();
  });
});

  describe('Verificação de Status e Permissões', () => {
    it('deve verificar se simulação pode ser editada', async () => {
      const canEditEditable = await simulationService.canEditSimulation(editableSimulation.id);
      const canEditCurrent = await simulationService.canEditSimulation(currentSituation.id);

      expect(canEditEditable).toBe(true);
      expect(canEditCurrent).toBe(false);
    });
  });
});
```

### Conformidade com Requisitos do Case

#### ✅ **Requisitos Técnicos Atendidos:**

- **Jest + Supertest**: Framework de testes implementado
- **Cobertura acima de 80%**: Meta estabelecida e monitorada
- **Organização em pasta `tests/`**: Estrutura imitando arquitetura dos arquivos
- **Prioridade nos testes do motor de projeção**: Conforme dica do case

#### ✅ **Funcionalidades Obrigatórias Testadas:**

- **Projeção Patrimonial**: Endpoint, taxa real composta, projeção até 2060
- **Alocações**: Financeiras, imobiliárias, registros históricos
- **Movimentações**: CRUD, timeline encadeada, frequências
- **Seguros**: Vida, invalidez, cálculos de valor
- **Simulações**: Versões, situação atual, permissões

#### ✅ **Estrutura de Testes Implementada:**

- **8 arquivos de teste** organizados por funcionalidade
- **Testes de integração** para todas as rotas da API
- **Testes de serviços** para lógica de negócio
- **Comentários em português** em todos os arquivos
- **Nomes descritivos** seguindo padrões do case

### Setup de Testes

**Arquivo `tests/setup.ts`:**

```typescript
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Configuração do banco de dados de teste
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Hooks globais para limpeza de dados
beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  // Limpeza automática após cada teste
  await prisma.assetRecord.deleteMany({});
  await prisma.allocation.deleteMany({});
  await prisma.movement.deleteMany({});
  await prisma.insurance.deleteMany({});
  await prisma.simulation.deleteMany({});
  await prisma.client.deleteMany({});
});

export { prisma };
```

### Execução dos Testes

```bash
# Executar todos os testes com cobertura
npm run test:coverage

# Executar testes específicos do motor de projeção
npm test -- tests/services/projection-engine.test.ts

# Executar testes de rotas
npm test -- tests/routes/

# Executar testes de serviços
npm test -- tests/services/
```

### Relatório de Cobertura

O projeto gera relatórios de cobertura em múltiplos formatos:

- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **Texto**: Console durante execução

**Meta de Cobertura**: Acima de 80% (conforme requisito do case)

## 🔄 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

