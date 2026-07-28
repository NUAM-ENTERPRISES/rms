import { PrismaClient } from '@prisma/client';
import { PERMISSION_CATALOG_DESCRIPTIONS } from './permission-catalog-descriptions';

type RoleSeed = {
  name: string;
  description: string;
  permissions: string[];
};

const ACTION_LABELS: Record<string, string> = {
  read: 'View',
  write: 'Edit',
  manage: 'Manage',
  nominate: 'Nominate',
  approve: 'Approve',
  reject: 'Reject',
  shortlist: 'Shortlist',
  transfer: 'Transfer',
  transfer_back: 'Transfer back',
  verify: 'Verify',
  schedule: 'Schedule',
  assign: 'Assign',
  handle: 'Handle',
  request: 'Request',
  conduct: 'Conduct',
  edit: 'Edit',
  delete: 'Delete',
};

function humanizeResource(resource: string): string {
  return resource.replace(/_/g, ' ').replace(/-/g, ' ');
}

function permissionDescription(key: string): string {
  if (PERMISSION_CATALOG_DESCRIPTIONS[key]) {
    return PERMISSION_CATALOG_DESCRIPTIONS[key];
  }

  if (key === '*') {
    return 'Complete access to all features in the system';
  }

  const [action, resource] = key.includes(':') ? key.split(':') : ['', key];
  const verb = ACTION_LABELS[action] ?? humanizeResource(action);
  const resourceLabel = humanizeResource(resource || key);
  return `${verb} ${resourceLabel}`;
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
        isSystem: true,
      },
      create: {
        name: roleData.name,
        description: roleData.description,
        isSystem: true,
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
