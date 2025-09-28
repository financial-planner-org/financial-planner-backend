const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Configurar CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));

app.use(express.json());

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend funcionando!' });
});

// Rota de simulações (mock)
app.get('/api/simulations', (req, res) => {
    res.json([
        {
            id: 1,
            name: 'Plano Original',
            startDate: '2025-01-01',
            realRate: 0.04,
            status: 'ATIVO',
            clientId: 1
        },
        {
            id: 2,
            name: 'Situação Atual',
            startDate: new Date().toISOString().split('T')[0],
            realRate: 0.04,
            status: 'SITUACAO_ATUAL',
            clientId: 1
        }
    ]);
});

// Rota de clientes (mock)
app.get('/api/clients', (req, res) => {
    res.json([
        {
            id: 1,
            name: 'Cliente Teste',
            email: 'cliente@teste.com',
            phone: '(11) 99999-9999',
            isActive: true
        }
    ]);
});

app.listen(PORT, () => {
    console.log(`🚀 Backend rodando na porta ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📋 Simulações: http://localhost:${PORT}/api/simulations`);
});
