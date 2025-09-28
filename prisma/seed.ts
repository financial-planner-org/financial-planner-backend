import { PrismaClient } from '@prisma/client';
import { process } from 'process';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Limpar dados existentes
    await prisma.assetRecord.deleteMany();
    await prisma.insurance.deleteMany();
    await prisma.movement.deleteMany();
    await prisma.allocation.deleteMany();
    await prisma.simulation.deleteMany();
    await prisma.client.deleteMany();

    // Criar 5 clientes baseados nas imagens fornecidas
    const clients = await Promise.all([
        prisma.client.create({
            data: {
                name: 'Matheus Silveira',
                email: 'matheus.silveira@email.com',
                phone: '(11) 99999-8888',
                address: 'Vila Olímpia, São Paulo/SP',
                isActive: true
            }
        }),
        prisma.client.create({
            data: {
                name: 'Pedro Magalhães',
                email: 'pedro.magalhaes@email.com',
                phone: '(11) 88888-7777',
                address: 'Jardins, São Paulo/SP',
                isActive: true
            }
        }),
        prisma.client.create({
            data: {
                name: 'Larissa Alves',
                email: 'larissa.alves@email.com',
                phone: '(11) 77777-6666',
                address: 'Moema, São Paulo/SP',
                isActive: true
            }
        }),
        prisma.client.create({
            data: {
                name: 'Fernando Coelho',
                email: 'fernando.coelho@email.com',
                phone: '(11) 66666-5555',
                address: 'Itaim Bibi, São Paulo/SP',
                isActive: true
            }
        }),
        prisma.client.create({
            data: {
                name: 'Débora Matto',
                email: 'debora.matto@email.com',
                phone: '(11) 55555-4444',
                address: 'Pinheiros, São Paulo/SP',
                isActive: true
            }
        })
    ]);

    const client = clients[0]; // Matheus Silveira como cliente principal
    console.log('✅ Clientes criados:', clients.map(c => c.name).join(', '));

    // Criar simulações para Matheus Silveira (cliente principal)
    const originalPlan = await prisma.simulation.create({
        data: {
            name: 'Plano Original',
            startDate: new Date('2025-01-01'),
            realRate: 0.04,
            status: 'ATIVO',
            clientId: client.id,
            description: 'Plano original de investimentos'
        }
    });

    const currentSituation = await prisma.simulation.create({
        data: {
            name: 'Situação atual 05/2025',
            startDate: new Date('2025-05-01'),
            realRate: 0.04,
            status: 'SITUACAO_ATUAL',
            clientId: client.id,
            baseId: originalPlan.id,
            description: 'Situação atual baseada no plano original'
        }
    });

    const realized = await prisma.simulation.create({
        data: {
            name: 'Realizado',
            startDate: new Date('2025-01-01'),
            realRate: 0.04,
            status: 'REALIZADO',
            clientId: client.id,
            description: 'Dados realizados até o momento'
        }
    });

    // Criar simulações para Pedro Magalhães
    const pedroOriginal = await prisma.simulation.create({
        data: {
            name: 'Plano original',
            startDate: new Date('2025-02-01'),
            realRate: 0.04,
            status: 'ATIVO',
            clientId: clients[1].id,
            description: 'Plano original do cliente Pedro'
        }
    });

    const pedroAposentadoria = await prisma.simulation.create({
        data: {
            name: 'Adiantar aposentadoria 3 anos',
            startDate: new Date('2025-03-01'),
            realRate: 0.04,
            status: 'ATIVO',
            clientId: clients[1].id,
            description: 'Simulação com aposentadoria antecipada'
        }
    });

    const pedroPraia = await prisma.simulation.create({
        data: {
            name: 'Aposentadoria na praia',
            startDate: new Date('2025-04-01'),
            realRate: 0.04,
            status: 'ATIVO',
            clientId: clients[1].id,
            description: 'Simulação para aposentadoria na praia'
        }
    });

    // Criar simulações para Larissa Alves
    const larissaOriginal = await prisma.simulation.create({
        data: {
            name: 'Plano Original',
            startDate: new Date('2025-01-15'),
            realRate: 0.045,
            status: 'ATIVO',
            clientId: clients[2].id,
            description: 'Plano original da cliente Larissa'
        }
    });

    // Criar simulações para Fernando Coelho
    const fernandoOriginal = await prisma.simulation.create({
        data: {
            name: 'Plano Original',
            startDate: new Date('2025-02-15'),
            realRate: 0.035,
            status: 'ATIVO',
            clientId: clients[3].id,
            description: 'Plano original do cliente Fernando'
        }
    });

    // Criar simulações para Débora Matto
    const deboraOriginal = await prisma.simulation.create({
        data: {
            name: 'Plano Original',
            startDate: new Date('2025-03-01'),
            realRate: 0.05,
            status: 'ATIVO',
            clientId: clients[4].id,
            description: 'Plano original da cliente Débora'
        }
    });

    console.log('✅ Simulações criadas para todos os clientes');

    // Criar alocações para Matheus Silveira (baseado nas imagens)
    const cdbItau = await prisma.allocation.create({
        data: {
            type: 'FINANCIAL',
            name: 'CDB Banco Itaú',
            initialValue: 1000000,
            currentValue: 1000000,
            initialDate: new Date('2024-06-20'),
            simulationId: originalPlan.id
        }
    });

    const cdbC6 = await prisma.allocation.create({
        data: {
            type: 'FINANCIAL',
            name: 'CDB Banco C6',
            initialValue: 1000000,
            currentValue: 1000000,
            initialDate: new Date('2023-06-20'),
            simulationId: originalPlan.id
        }
    });

    const apartamentoVilaOlimpia = await prisma.allocation.create({
        data: {
            type: 'IMMOBILIZED',
            name: 'Apartamento Vila Olímpia',
            initialValue: 148666, // Valor atual pago
            currentValue: 148666,
            initialDate: new Date('2024-07-01'),
            installments: 200,
            interestRate: 0.08,
            simulationId: originalPlan.id
        }
    });

    const loja = await prisma.allocation.create({
        data: {
            type: 'IMMOBILIZED',
            name: 'Loja',
            initialValue: 1800000,
            currentValue: 1800000,
            initialDate: new Date('2023-04-20'),
            simulationId: originalPlan.id
        }
    });

    // Criar alocações para Pedro Magalhães
    await prisma.allocation.createMany({
        data: [
            {
                type: 'FINANCIAL',
                name: 'Tesouro Selic 2029',
                amount: 500000,
                currentValue: 500000,
                initialDate: new Date('2024-01-15'),
                simulationId: pedroOriginal.id
            },
            {
                type: 'IMMOBILIZED',
                name: 'Casa em Santos',
                amount: 800000,
                currentValue: 800000,
                initialDate: new Date('2023-08-10'),
                simulationId: pedroOriginal.id
            }
        ]
    });

    // Criar alocações para Larissa Alves
    await prisma.allocation.createMany({
        data: [
            {
                type: 'FINANCIAL',
                name: 'CDB XP Investimentos',
                amount: 750000,
                startDate: new Date('2024-03-20'),
                simulationId: larissaOriginal.id
            },
            {
                type: 'IMMOBILIZED',
                name: 'Apartamento Moema',
                amount: 1200000,
                startDate: new Date('2023-11-15'),
                simulationId: larissaOriginal.id
            }
        ]
    });

    // Criar alocações para Fernando Coelho
    await prisma.allocation.createMany({
        data: [
            {
                type: 'FINANCIAL',
                name: 'LCI Banco do Brasil',
                amount: 600000,
                startDate: new Date('2024-05-10'),
                simulationId: fernandoOriginal.id
            },
            {
                type: 'IMMOBILIZED',
                name: 'Escritório Itaim Bibi',
                amount: 900000,
                startDate: new Date('2023-09-05'),
                simulationId: fernandoOriginal.id
            }
        ]
    });

    // Criar alocações para Débora Matto
    await prisma.allocation.createMany({
        data: [
            {
                type: 'FINANCIAL',
                name: 'Fundo DI',
                amount: 400000,
                startDate: new Date('2024-02-28'),
                simulationId: deboraOriginal.id
            },
            {
                type: 'IMMOBILIZED',
                name: 'Loja Pinheiros',
                amount: 650000,
                startDate: new Date('2023-12-01'),
                simulationId: deboraOriginal.id
            }
        ]
    });

    console.log('✅ Alocações criadas para todos os clientes');

    // Criar registros de alocação para histórico
    await prisma.assetRecord.createMany({
        data: [
            // CDB Itaú - registros mensais
            {
                allocationId: cdbItau.id,
                date: new Date('2024-06-20'),
                amount: 1000000,
                notes: 'Investimento inicial'
            },
            {
                allocationId: cdbItau.id,
                date: new Date('2024-12-20'),
                amount: 1050000,
                notes: 'Atualização semestral'
            },
            {
                allocationId: cdbItau.id,
                date: new Date('2025-06-10'),
                amount: 1100000,
                notes: 'Última atualização'
            },
            // CDB C6 - registros
            {
                allocationId: cdbC6.id,
                date: new Date('2023-06-20'),
                amount: 1000000,
                notes: 'Investimento inicial'
            },
            {
                allocationId: cdbC6.id,
                date: new Date('2024-08-10'),
                amount: 1080000,
                notes: 'Atualização anual'
            },
            // Apartamento Vila Olímpia - parcelas pagas
            {
                allocationId: apartamentoVilaOlimpia.id,
                date: new Date('2024-07-01'),
                amount: 148666,
                notes: '14 parcelas pagas de 200'
            },
            // Loja - atualização única
            {
                allocationId: loja.id,
                date: new Date('2023-04-20'),
                amount: 1800000,
                notes: 'Atualização única'
            }
        ]
    });

    console.log('✅ Registros de alocação criados');

    // Criar movimentações para Matheus Silveira (baseado nas imagens)
    await prisma.movement.createMany({
        data: [
            // Herança
            {
                type: 'INCOME',
                amount: 220000,
                title: 'Herança',
                frequency: 'UNIQUE',
                startDate: new Date('2023-07-09'),
                endDate: new Date('2023-07-22'),
                category: 'HERANCA',
                simulationId: originalPlan.id
            },
            // Comissão
            {
                type: 'INCOME',
                amount: 500000,
                title: 'Comissão',
                frequency: 'ANNUAL',
                startDate: new Date('2023-07-09'),
                endDate: new Date('2023-07-22'),
                category: 'COMISSAO',
                simulationId: originalPlan.id
            },
            // Custo do filho
            {
                type: 'EXPENSE',
                amount: 1500,
                title: 'Custo do filho',
                frequency: 'MONTHLY',
                startDate: new Date('2023-07-09'),
                endDate: new Date('2043-07-22'),
                category: 'DEPENDENTE',
                simulationId: originalPlan.id
            },
            // Salário CLT
            {
                type: 'INCOME',
                amount: 15000,
                title: 'Salário CLT',
                frequency: 'MONTHLY',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2030-12-31'),
                category: 'SALARIO',
                simulationId: originalPlan.id
            },
            // Salário autônomo (primeiro período)
            {
                type: 'INCOME',
                amount: 5000,
                title: 'Salário autônomo',
                frequency: 'MONTHLY',
                startDate: new Date('2030-01-01'),
                endDate: new Date('2035-12-31'),
                category: 'SALARIO',
                simulationId: originalPlan.id
            },
            // Salário autônomo (segundo período)
            {
                type: 'INCOME',
                amount: 35000,
                title: 'Salário autônomo',
                frequency: 'MONTHLY',
                startDate: new Date('2035-01-01'),
                endDate: new Date('2045-12-31'),
                category: 'SALARIO',
                simulationId: originalPlan.id
            },
            // Despesas mensais
            {
                type: 'EXPENSE',
                amount: 8000,
                title: 'Custo de vida',
                frequency: 'MONTHLY',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2030-12-31'),
                category: 'CUSTO_VIDA',
                simulationId: originalPlan.id
            },
            {
                type: 'EXPENSE',
                amount: 12000,
                title: 'Custo de vida',
                frequency: 'MONTHLY',
                startDate: new Date('2030-01-01'),
                endDate: new Date('2040-12-31'),
                category: 'CUSTO_VIDA',
                simulationId: originalPlan.id
            },
            {
                type: 'EXPENSE',
                amount: 20000,
                title: 'Custo de vida',
                frequency: 'MONTHLY',
                startDate: new Date('2040-01-01'),
                endDate: new Date('2045-12-31'),
                category: 'CUSTO_VIDA',
                simulationId: originalPlan.id
            },
            {
                type: 'EXPENSE',
                amount: 10000,
                title: 'Custo de vida',
                frequency: 'MONTHLY',
                startDate: new Date('2045-01-01'),
                endDate: new Date('2050-12-31'),
                category: 'CUSTO_VIDA',
                simulationId: originalPlan.id
            },
            {
                type: 'EXPENSE',
                amount: 15000,
                title: 'Custo de vida',
                frequency: 'MONTHLY',
                startDate: new Date('2050-01-01'),
                endDate: new Date('2060-12-31'),
                category: 'CUSTO_VIDA',
                simulationId: originalPlan.id
            }
        ]
    });

    // Criar movimentações para Pedro Magalhães
    await prisma.movement.createMany({
        data: [
            {
                type: 'INCOME',
                amount: 12000,
                title: 'Salário',
                frequency: 'MONTHLY',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2035-12-31'),
                category: 'SALARIO',
                simulationId: pedroOriginal.id
            },
            {
                type: 'EXPENSE',
                amount: 6000,
                title: 'Custo de vida',
                frequency: 'MONTHLY',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2060-12-31'),
                category: 'CUSTO_VIDA',
                simulationId: pedroOriginal.id
            }
        ]
    });

    // Criar movimentações para Larissa Alves
    await prisma.movement.createMany({
        data: [
            {
                type: 'INCOME',
                amount: 18000,
                title: 'Salário',
                frequency: 'MONTHLY',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2040-12-31'),
                category: 'SALARIO',
                simulationId: larissaOriginal.id
            },
            {
                type: 'EXPENSE',
                amount: 10000,
                title: 'Custo de vida',
                frequency: 'MONTHLY',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2060-12-31'),
                category: 'CUSTO_VIDA',
                simulationId: larissaOriginal.id
            }
        ]
    });

    // Criar movimentações para Fernando Coelho
    await prisma.movement.createMany({
        data: [
            {
                type: 'INCOME',
                amount: 20000,
                title: 'Salário',
                frequency: 'MONTHLY',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2045-12-31'),
                category: 'SALARIO',
                simulationId: fernandoOriginal.id
            },
            {
                type: 'EXPENSE',
                amount: 12000,
                title: 'Custo de vida',
                frequency: 'MONTHLY',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2060-12-31'),
                category: 'CUSTO_VIDA',
                simulationId: fernandoOriginal.id
            }
        ]
    });

    // Criar movimentações para Débora Matto
    await prisma.movement.createMany({
        data: [
            {
                type: 'INCOME',
                amount: 16000,
                title: 'Salário',
                frequency: 'MONTHLY',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2038-12-31'),
                category: 'SALARIO',
                simulationId: deboraOriginal.id
            },
            {
                type: 'EXPENSE',
                amount: 8000,
                title: 'Custo de vida',
                frequency: 'MONTHLY',
                startDate: new Date('2025-01-01'),
                endDate: new Date('2060-12-31'),
                category: 'CUSTO_VIDA',
                simulationId: deboraOriginal.id
            }
        ]
    });

    console.log('✅ Movimentações criadas para todos os clientes');

    // Criar seguros para Matheus Silveira (baseado nas imagens)
    await prisma.insurance.createMany({
        data: [
            {
                type: 'LIFE',
                name: 'Seguro de Vida Familiar',
                startDate: new Date('2025-01-01'),
                duration: 180, // 15 anos
                premium: 120,
                insuredValue: 500000,
                simulationId: originalPlan.id
            },
            {
                type: 'DISABILITY',
                name: 'Seguro de Invalidez',
                startDate: new Date('2025-01-01'),
                duration: 60, // 5 anos
                premium: 300,
                insuredValue: 100000,
                simulationId: originalPlan.id
            }
        ]
    });

    // Criar seguros para outros clientes
    await prisma.insurance.createMany({
        data: [
            // Pedro Magalhães
            {
                type: 'LIFE',
                name: 'Seguro de Vida',
                startDate: new Date('2025-02-01'),
                duration: 120, // 10 anos
                premium: 200,
                insuredValue: 300000,
                simulationId: pedroOriginal.id
            },
            // Larissa Alves
            {
                type: 'LIFE',
                name: 'Seguro de Vida',
                startDate: new Date('2025-01-15'),
                duration: 240, // 20 anos
                premium: 150,
                insuredValue: 400000,
                simulationId: larissaOriginal.id
            },
            {
                type: 'DISABILITY',
                name: 'Seguro de Invalidez',
                startDate: new Date('2025-01-15'),
                duration: 120, // 10 anos
                premium: 250,
                insuredValue: 200000,
                simulationId: larissaOriginal.id
            },
            // Fernando Coelho
            {
                type: 'LIFE',
                name: 'Seguro de Vida',
                startDate: new Date('2025-02-15'),
                duration: 180, // 15 anos
                premium: 180,
                insuredValue: 350000,
                simulationId: fernandoOriginal.id
            },
            // Débora Matto
            {
                type: 'LIFE',
                name: 'Seguro de Vida',
                startDate: new Date('2025-03-01'),
                duration: 300, // 25 anos
                premium: 100,
                insuredValue: 250000,
                simulationId: deboraOriginal.id
            }
        ]
    });

    console.log('✅ Seguros criados para todos os clientes');

    console.log('🎉 Seed concluído com sucesso!');
    console.log('\n📊 Dados criados:');
    console.log(`- Clientes: 5 (Matheus Silveira, Pedro Magalhães, Larissa Alves, Fernando Coelho, Débora Matto)`);
    console.log(`- Simulações: 8 (3 para Matheus + 1 para cada outro cliente)`);
    console.log(`- Alocações: 12 (4 para Matheus + 2 para cada outro cliente)`);
    console.log(`- Registros de alocação: 7 (histórico de alocações)`);
    console.log(`- Movimentações: 15 (11 para Matheus + 2 para cada outro cliente)`);
    console.log(`- Seguros: 7 (2 para Matheus + 1-2 para cada outro cliente)`);
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });