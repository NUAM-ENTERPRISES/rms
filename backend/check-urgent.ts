import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

async function main() {
  const page = 1;
  const limit = 12;
  const skip = (page - 1) * limit;
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  const where = {
    deadline: {
      gte: now,
      lte: nextWeek,
    },
    status: 'active',
  };

  console.log('where', where);

  const count = await prisma.project.count({ where });
  console.log('Count:', count);

  const projects = await prisma.project.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
  console.log('Projects length:', projects.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
