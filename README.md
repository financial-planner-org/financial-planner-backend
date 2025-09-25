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
├── controllers/    # Controladores da aplicação
├── errors/         # Classes de erro personalizadas
├── interfaces/     # Interfaces TypeScript
├── middlewares/    # Middlewares do Fastify
├── plugins/        # Plugins do Fastify
├── repositories/   # Camada de acesso a dados
├── routes/         # Definições de rotas
├── schemas/        # Esquemas de validação com Zod
├── services/       # Lógica de negócios
├── types/          # Tipos TypeScript
└── utils/          # Utilitários
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

## 📝 Documentação da API

A documentação da API está disponível em `/documentation` quando o servidor estiver em execução.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas alterações (`git commit -m 'Add some AmazingFeature'`)
4. Faça o push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
