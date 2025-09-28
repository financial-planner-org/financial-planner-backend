import prisma from '../prisma/client';

export const findAllSimulations = async () => {
  return prisma.simulation.findMany({
    include: { allocations: true, movements: true, insurances: true, versions: true, base: true },
  });
};

export const findSimulationById = async (id: number) => {
  return prisma.simulation.findUnique({
    where: { id },
    include: { allocations: { include: { records: true } }, movements: true, insurances: true },
  });
};

/**
 * Duplica uma simulação com todos os dados relacionados dentro de uma transação.
 * Retorna a nova simulação criada.
 */
export const duplicateSimulation = async (simulationId: number) => {
  const original = await findSimulationById(simulationId);
  if (!original) throw new Error('Simulation not found');

  // Prepare payloads para criação
  const newSimulationData = {
    name: `${original.name} (copy)`,
    startDate: original.startDate,
    realRate: original.realRate,
    status: original.status,
    baseId: original.baseId ?? original.id, // marcar versão para referência
    clientId: original.clientId,
  };

  // Executa transação para criar simulação e os relacionamentos
  const result = await prisma.$transaction(async tx => {
    const createdSim = await tx.simulation.create({ data: newSimulationData });

    // Criar allocations e records em paralelo
    for (const alloc of original.allocations) {
      const createdAlloc = await tx.allocation.create({
        data: {
          simulationId: createdSim.id,
          type: alloc.type,
          name: alloc.name,
          value: alloc.value,
          startDate: alloc.startDate ?? undefined,
          installments: alloc.installments ?? undefined,
          interestRate: alloc.interestRate ?? undefined,
        },
      });

      // records
      if (alloc.records && alloc.records.length > 0) {
        const recordsData = alloc.records.map(r => ({
          allocationId: createdAlloc.id,
          date: r.date,
          value: r.value,
        }));
        await tx.assetRecord.createMany({ data: recordsData });
      }
    }

    // movements
    for (const mv of original.movements) {
      await tx.movement.create({
        data: {
          simulationId: createdSim.id,
          type: mv.type,
          value: mv.value,
          frequency: mv.frequency,
          startDate: mv.startDate,
          endDate: mv.endDate ?? undefined,
          description: mv.description || '',
        },
      });
    }

    // insurances
    for (const ins of original.insurances) {
      await tx.insurance.create({
        data: {
          simulationId: createdSim.id,
          name: ins.name,
          startDate: ins.startDate,
          durationMonths: ins.durationMonths,
          premium: ins.premium,
          insuredValue: ins.insuredValue,
          type: ins.type,
        },
      });
    }

    return createdSim;
  });

  return result;
};
