"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function verifyStatuses() {
    const statuses = await prisma.candidateProjectStatus.findMany({
        orderBy: { id: 'asc' },
        select: {
            id: true,
            statusName: true,
            label: true,
            stage: true,
        },
    });
    console.log('\n✅ Candidate Project Status Table:');
    console.log('='.repeat(80));
    console.table(statuses);
    console.log(`\nTotal: ${statuses.length} statuses`);
}
verifyStatuses()
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=verify-statuses.js.map