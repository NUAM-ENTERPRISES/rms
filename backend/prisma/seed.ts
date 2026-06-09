import { PrismaClient } from '@prisma/client';
import { seedProfessionTypes } from './seeds/profession-types.seed';

const prisma = new PrismaClient();

async function main() {
  await seedProfessionTypes(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
