#!/bin/bash

echo "🚀 Iniciando Financial Planner Backend com dados de exemplo..."

# Verificar se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Verificar se o docker-compose está disponível
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose não encontrado. Instalando..."
    exit 1
fi

echo "📦 Instalando dependências..."
npm install

echo "🗄️ Configurando banco de dados..."
# Resetar e aplicar migrações
npx prisma migrate reset --force

echo "🌱 Populando banco com dados de exemplo..."
npm run db:seed

echo "🔨 Compilando TypeScript..."
npm run build

echo "🚀 Iniciando servidor..."
npm run dev
