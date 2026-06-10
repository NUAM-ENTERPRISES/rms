import { PrismaClient } from '@prisma/client';

const RECRUITER_ROLE_NAME = 'Recruiter';

export async function seedUserProfessionScopes(prisma: PrismaClient) {
  console.log('Seeding user profession scopes...');

  const professionTypes = await prisma.professionType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  if (professionTypes.length === 0) {
    console.warn('No profession types found; skipping user profession scope seed');
    return;
  }

  const nurseType = professionTypes.find((type) => type.name === 'nurse');
  if (!nurseType) {
    throw new Error('Nurse profession type is required for user profession scope seed');
  }

  const allTypeIds = professionTypes.map((type) => type.id);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      userRoles: {
        select: {
          role: { select: { name: true } },
        },
      },
    },
  });

  for (const user of users) {
    const isRecruiter = user.userRoles.some(
      (userRole) => userRole.role.name === RECRUITER_ROLE_NAME,
    );
    const targetIds = isRecruiter ? [nurseType.id] : allTypeIds;

    await prisma.userProfessionScope.deleteMany({ where: { userId: user.id } });
    if (targetIds.length > 0) {
      await prisma.userProfessionScope.createMany({
        data: targetIds.map((professionTypeId) => ({
          userId: user.id,
          professionTypeId,
        })),
      });
    }
  }

  console.log(`User profession scopes seeded for ${users.length} users`);
}
