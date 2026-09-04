import { PrismaClient } from '@prisma/client';

/**
 * Rename legacy system role display names before upserts.
 * If both old and new exist, merge userRoles onto the new role and delete the old.
 */
const ROLE_RENAMES: ReadonlyArray<{ from: string; to: string }> = [
  { from: 'CEO', to: 'Managing Director' },
  { from: 'Recruiter', to: 'Recruitment Executive' },
  { from: 'Documents Control Executive', to: 'Document Control Executive' },
  { from: 'Operations', to: 'Operations Executive' },
  { from: 'Recruiter Manager', to: 'Recruitment Lead' },
  { from: 'Recruitment Team Lead', to: 'Recruitment Lead' },
  { from: 'Processing Manager', to: 'Processing Lead' },
  { from: 'Processing Team Lead', to: 'Processing Lead' },
];

export async function renameLegacySystemRoles(prisma: PrismaClient) {
  console.log('🔄 Renaming legacy system roles...');

  for (const { from, to } of ROLE_RENAMES) {
    const existing = await prisma.role.findUnique({ where: { name: from } });
    if (!existing) continue;

    const target = await prisma.role.findUnique({ where: { name: to } });

    if (!target) {
      await prisma.role.update({
        where: { id: existing.id },
        data: { name: to },
      });
      console.log(`  ✅ Renamed role "${from}" → "${to}"`);
      continue;
    }

    const userRoles = await prisma.userRole.findMany({
      where: { roleId: existing.id },
    });
    for (const ur of userRoles) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: { userId: ur.userId, roleId: target.id },
        },
        update: {},
        create: { userId: ur.userId, roleId: target.id },
      });
    }
    await prisma.userRole.deleteMany({ where: { roleId: existing.id } });
    await prisma.rolePermission.deleteMany({ where: { roleId: existing.id } });
    await prisma.screeningTemplate.updateMany({
      where: { roleId: existing.id },
      data: { roleId: target.id },
    });
    await prisma.role.delete({ where: { id: existing.id } });
    console.log(
      `  ✅ Merged legacy role "${from}" into "${to}" (${userRoles.length} users)`,
    );
  }
}
