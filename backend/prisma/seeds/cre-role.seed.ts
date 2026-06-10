import { PrismaClient } from '@prisma/client';
import { ROLE_NAMES } from '../../src/common/constants/role-ids';

const prisma = new PrismaClient();

export async function seedCRERole() {
  console.log('🌱 Seeding Operations Role and Permissions...');

  const operationsRole = await prisma.role.upsert({
    where: { name: ROLE_NAMES.OPERATIONS },
    update: {
      description: 'Operations team - handles escalated RNR candidates',
    },
    create: {
      name: ROLE_NAMES.OPERATIONS,
      description: 'Operations team - handles escalated RNR candidates',
    },
  });

  console.log(`✅ Operations Role created/updated: ${operationsRole.id}`);

  const operationsPermissions = [
    { key: 'read:candidates', description: 'View candidates' },
    { key: 'write:candidates', description: 'Create candidates' },
    { key: 'manage:candidates', description: 'Manage candidates (full access)' },
    { key: 'update:candidates', description: 'Update candidates' },
    { key: 'transfer_back:candidates', description: 'Can transfer candidate back to previous recruiter' },
    { key: 'read:documents', description: 'Read candidate documents' },
    { key: 'read:notifications', description: 'View notifications' },
    { key: 'read:operations_call_history', description: 'View Operations call log history for any Operations-handled candidate' },
  ];

  for (const perm of operationsPermissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: {
        key: perm.key,
        description: perm.description,
      },
    });
  }

  console.log(`✅ Created/Updated ${operationsPermissions.length} permissions for Operations role`);

  for (const perm of operationsPermissions) {
    const permission = await prisma.permission.findUnique({
      where: { key: perm.key },
    });

    if (permission) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: operationsRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: operationsRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log(`✅ Assigned ${operationsPermissions.length} permissions to Operations role`);

  let operationsUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'operations@affiniks.com' },
        { email: 'cre@affiniks.com' },
        { countryCode: '+91', mobileNumber: '9988776655' },
      ],
    },
  });

  if (operationsUser) {
    operationsUser = await prisma.user.update({
      where: { id: operationsUser.id },
      data: {
        email: 'operations@affiniks.com',
        name: 'Operations User',
        countryCode: '+91',
        mobileNumber: '9988776655',
      },
    });
  } else {
    operationsUser = await prisma.user.create({
      data: {
        email: 'operations@affiniks.com',
        password: '$2b$10$2zD38atLNjqCY.dDy1V0GOTtY9YTnFk2RreS5Fa8qJdujLTUZRqOW',
        name: 'Operations User',
        countryCode: '+91',
        mobileNumber: '9988776655',
      },
    });
  }

  console.log(`✅ Operations User created/updated: ${operationsUser.id} (${operationsUser.email})`);

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: operationsUser.id,
        roleId: operationsRole.id,
      },
    },
    update: {},
    create: {
      userId: operationsUser.id,
      roleId: operationsRole.id,
    },
  });

  console.log(`✅ Assigned Operations role to user ${operationsUser.email}`);

  const rnrSettings = await prisma.systemConfig.findUnique({
    where: { key: 'RNR_SETTINGS' },
  });

  if (rnrSettings && rnrSettings.value) {
    const currentSettings = rnrSettings.value as any;
    const updatedSettings = {
      ...currentSettings,
      creAssignment: {
        ...currentSettings.creAssignment,
        creRoleId: operationsRole.id,
      },
    };

    await prisma.systemConfig.update({
      where: { key: 'RNR_SETTINGS' },
      data: { value: updatedSettings },
    });

    console.log(`✅ Updated RNR_SETTINGS with Operations role ID`);
  }

  console.log('\n✅ Operations Role seeding completed successfully!');
  console.log('───────────────────────────────────────');
  console.log(`Role Name: ${operationsRole.name}`);
  console.log(`Role ID: ${operationsRole.id}`);
  console.log(`Permissions: ${operationsPermissions.length} (candidate access only)`);
  console.log(`Sample User: ${operationsUser.email}`);
  console.log('───────────────────────────────────────\n');
}

if (require.main === module) {
  seedCRERole()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
