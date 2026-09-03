/**
 * One-off: add the candidate import permissions and attach them to the
 * full-access roles (CEO, Director, Manager) without re-running the full seed.
 *
 * `import:candidates` is additionally granted to Recruiter, since recruiters
 * upload their own sheet. `ai_classify:candidate_documents` is not, because
 * splitting a merged PDF writes documents onto a profile.
 *
 * Run: npx ts-node scripts/add-candidate-import-permissions.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FULL_ACCESS_ROLES = ['CEO', 'Director', 'Manager'];

const PERMISSIONS: Array<{
  key: string;
  description: string;
  roles: string[];
}> = [
  {
    key: 'import:candidates',
    description: 'Import candidates from recruiter Excel or CSV sheets',
    roles: [...FULL_ACCESS_ROLES, 'Recruiter'],
  },
  {
    key: 'ai_classify:candidate_documents',
    description:
      'Upload merged candidate PDFs and split them into documents using AI',
    roles: [...FULL_ACCESS_ROLES],
  },
];

async function main() {
  for (const { key, description, roles } of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
    console.log(`Permission ready: ${permission.key}`);

    for (const roleName of roles) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        console.warn(`Role not found, skipping: ${roleName}`);
        continue;
      }

      const existing = await prisma.rolePermission.findFirst({
        where: { roleId: role.id, permissionId: permission.id },
      });
      if (existing) {
        console.log(`Already linked: ${key} -> ${roleName}`);
        continue;
      }

      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      });
      console.log(`Linked ${key} to ${roleName}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
