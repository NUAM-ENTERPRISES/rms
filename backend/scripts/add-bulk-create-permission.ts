/**
 * One-off: add the `bulk_create:candidates` permission and attach it to the
 * full-access roles (CEO, Director, Manager) without re-running the full seed.
 *
 * Run: npx ts-node scripts/add-bulk-create-permission.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSION_KEY = 'bulk_create:candidates';
const PERMISSION_DESCRIPTION = 'Bulk create candidates from resume upload';
const FULL_ACCESS_ROLES = ['CEO', 'Director', 'Manager'];

async function main() {
  const permission = await prisma.permission.upsert({
    where: { key: PERMISSION_KEY },
    update: { description: PERMISSION_DESCRIPTION },
    create: { key: PERMISSION_KEY, description: PERMISSION_DESCRIPTION },
  });
  console.log(`Permission ready: ${permission.key}`);

  for (const roleName of FULL_ACCESS_ROLES) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.warn(`Role not found, skipping: ${roleName}`);
      continue;
    }

    const existing = await prisma.rolePermission.findFirst({
      where: { roleId: role.id, permissionId: permission.id },
    });
    if (existing) {
      console.log(`Already linked: ${roleName}`);
      continue;
    }

    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
    console.log(`Linked ${PERMISSION_KEY} to ${roleName}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
