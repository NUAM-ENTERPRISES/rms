
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const candidate = Object.keys(prisma.candidate);
  console.log('Candidate fields:', candidate);
  
  // Try to use expectedMinSalary in a type-safe way if possible
  // or just check the schema metadata if we can
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
