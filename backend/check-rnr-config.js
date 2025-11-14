"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkConfig() {
    const config = await prisma.systemConfig.findUnique({
        where: { key: 'RNR_SETTINGS' },
    });
    if (config) {
        console.log('\n✅ RNR_SETTINGS found in database:');
        console.log('─────────────────────────────────────');
        console.log('Key:', config.key);
        console.log('Description:', config.description);
        console.log('\nSettings:');
        console.log(JSON.stringify(config.value, null, 2));
        console.log('─────────────────────────────────────\n');
    }
    else {
        console.log('❌ RNR_SETTINGS not found in database');
    }
    await prisma.$disconnect();
}
checkConfig();
//# sourceMappingURL=check-rnr-config.js.map