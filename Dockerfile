FROM node:20

WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia todo o código fonte
COPY . .

# Executa o build do TypeScript
RUN npm run build

# Expõe a porta 3001
EXPOSE 3001

# Comando para iniciar o servidor
CMD ["node", "dist/server.js"]
