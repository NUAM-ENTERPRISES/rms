"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    const candidateId = 'cmk8luq2i0012q446xepmqdm7';
    const assignment = await prisma.candidateRecruiterAssignment.findFirst({
        where: {
            candidateId,
            isActive: true,
        },
        select: {
            recruiterId: true,
        },
    });
    console.log('Assignment found:', assignment);
    const allAssignments = await prisma.candidateRecruiterAssignment.findMany({
        where: { candidateId }
    });
    console.log('All assignments:', allAssignments);
    await prisma.$disconnect();
}
main();
//# sourceMappingURL=test-check-assignment.js.map