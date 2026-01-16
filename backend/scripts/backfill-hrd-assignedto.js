"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function backfill() {
    console.log('Backfilling HRD reminders with missing assignedTo...');
    const reminders = await prisma.hRDReminder.findMany({ where: { assignedTo: null } });
    console.log(`Found ${reminders.length} reminders with empty assignedTo`);
    let updated = 0;
    for (const r of reminders) {
        const step = await prisma.processingStep.findUnique({ where: { id: r.processingStepId }, include: { processingCandidate: true } });
        const fallback = step?.assignedTo || step?.processingCandidate?.assignedProcessingTeamUserId || null;
        if (fallback) {
            await prisma.hRDReminder.update({ where: { id: r.id }, data: { assignedTo: fallback } });
            console.log(`Updated reminder ${r.id} assignedTo => ${fallback}`);
            updated++;
        }
        else {
            console.log(`No fallback found for reminder ${r.id} (processingStepId=${r.processingStepId})`);
        }
    }
    console.log(`Backfill complete. Updated ${updated} reminders.`);
}
backfill()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=backfill-hrd-assignedto.js.map