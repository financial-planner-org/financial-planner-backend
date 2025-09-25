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
- **Zod** - Validação de esquema
- **Jest** - Testes unitários e de integração
- **ESLint** & **Prettier** - Linting e formatação de código

## 📦 Estrutura do Projeto

```
src/
├── config/         # Configurações do aplicativo
├── plugins/        # Plugins do Fastify (Swagger, etc.)
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
