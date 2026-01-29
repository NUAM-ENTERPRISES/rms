"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🔁 Migrating candidate status: working -> Deployed');
    const working = await prisma.candidateStatus.findFirst({
        where: { statusName: { equals: 'working', mode: 'insensitive' } },
    });
    if (!working) {
        console.log('No "working" status found. Nothing to do.');
        return;
    }
    const deployed = await prisma.candidateStatus.findFirst({
        where: { statusName: { equals: 'deployed', mode: 'insensitive' } },
    });
    if (!deployed) {
        await prisma.candidateStatus.update({
            where: { id: working.id },
            data: { statusName: 'Deployed' },
        });
        await prisma.candidateStatusHistory.updateMany({
            where: { statusNameSnapshot: { equals: 'working', mode: 'insensitive' } },
            data: { statusNameSnapshot: 'Deployed' },
        });
        console.log(`Renamed existing status id=${working.id} -> 'Deployed'`);
        return;
    }
    console.log(`Found existing deployed id=${deployed.id} and working id=${working.id}. Merging...`);
    await prisma.$transaction(async (tx) => {
        await tx.candidate.updateMany({
            where: { currentStatusId: working.id },
            data: { currentStatusId: deployed.id },
        });
        await tx.candidateStatusHistory.updateMany({
            where: { statusId: working.id },
            data: { statusId: deployed.id },
        });
        await tx.candidateStatusHistory.updateMany({
            where: { statusNameSnapshot: { equals: 'working', mode: 'insensitive' } },
            data: { statusNameSnapshot: 'Deployed' },
        });
        await tx.candidateStatus.delete({ where: { id: working.id } });
    });
    console.log('Migration complete: all references moved to Deployed and "working" row removed');
}
main()
    .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=rename-working-to-deployed.js.map