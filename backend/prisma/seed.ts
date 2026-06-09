import { PrismaClient } from '@prisma/client';
import { seedProfessionTypes } from './seeds/profession-types.seed';
import { seedUserProfessionScopes } from './seeds/user-profession-scopes.seed';

const prisma = new PrismaClient();

async function main() {
  await seedProfessionTypes(prisma);
  await seedUserProfessionScopes(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
