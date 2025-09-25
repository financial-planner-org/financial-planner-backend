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

## 🧪 Testes

```bash
# Executar testes
npm test

# Executar testes em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

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
