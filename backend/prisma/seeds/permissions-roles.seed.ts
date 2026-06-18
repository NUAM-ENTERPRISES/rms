import { PrismaClient } from '@prisma/client';

type RoleSeed = {
  name: string;
  description: string;
  permissions: string[];
};

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'read:original_document_intake':
    'View original document intake register and collections',
  'write:original_document_intake':
    'Create and manage original document intake collections',
  'read:courier_management': 'View courier management register and legs',
  'write:courier_management': 'Create and manage courier legs',
};

function permissionDescription(key: string): string {
  return (
    PERMISSION_DESCRIPTIONS[key] ??
    `Permission to ${key.replace(':', ' ')}`
  );
}

export async function seedPermissionsAndRoles(
  prisma: PrismaClient,
  roles: RoleSeed[],
  allPermissions: string[],
) {
  console.log('📝 Creating permissions...');
  for (const permissionKey of allPermissions) {
    const description = permissionDescription(permissionKey);
    await prisma.permission.upsert({
      where: { key: permissionKey },
      update: { description },
      create: {
        key: permissionKey,
        description,
      },
    });
  }

  console.log('👥 Creating roles and permissions...');
  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        description: roleData.description,
      },
      create: {
        name: roleData.name,
        description: roleData.description,
      },
    });

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    const permissionsToAdd = roleData.permissions.includes('*')
      ? allPermissions
      : roleData.permissions;

    for (const permissionKey of permissionsToAdd) {
      const permission = await prisma.permission.findUnique({
        where: { key: permissionKey },
      });
      if (permission) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
  }
}
