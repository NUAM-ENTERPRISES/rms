import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCRERole() {
  console.log('🌱 Seeding CRE Role and Permissions...');

  // 1. Create CRE Role
  const creRole = await prisma.role.upsert({
    where: { name: 'CRE' },
    update: {
      description: 'Candidate Relationship Executive - Handles escalated RNR candidates',
    },
    create: {
      name: 'CRE',
      description: 'Candidate Relationship Executive - Handles escalated RNR candidates',
    },
  });

  console.log(`✅ CRE Role created/updated: ${creRole.id}`);

  // 2. Define CRE Permissions (Candidate access only - read and manage assigned candidates)
  const crePermissions = [
    // Candidate Permissions
    { key: 'read:candidates', description: 'View candidates' },
    { key: 'manage:candidates', description: 'Manage candidates (full access)' },
    { key: 'update:candidates', description: 'Update candidates' },
    { key: 'transfer_back:candidates', description: 'Can transfer candidate back to previous recruiter' },
    
    // View their own notifications
    { key: 'read:notifications', description: 'View notifications' },
  ];

  // 3. Create permissions if they don't exist
  for (const perm of crePermissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: {
        key: perm.key,
        description: perm.description,
      },
    });
  }

  console.log(`✅ Created/Updated ${crePermissions.length} permissions for CRE role`);

  // 4. Assign permissions to CRE role
  for (const perm of crePermissions) {
    const permission = await prisma.permission.findUnique({
      where: { key: perm.key },
    });

    if (permission) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: creRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: creRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log(`✅ Assigned ${crePermissions.length} permissions to CRE role`);

  // 5. Create a sample CRE user (optional - you can skip this if you want to manually create users)
  const creUser = await prisma.user.upsert({
    where: { email: 'cre@affiniks.com' },
    update: {
      name: 'CRE User',
    },
    create: {
      email: 'cre@affiniks.com',
      password: '$2b$10$2zD38atLNjqCY.dDy1V0GOTtY9YTnFk2RreS5Fa8qJdujLTUZRqOW', // Password: cre123
      name: 'CRE User',
      countryCode: '+91',
      mobileNumber: '9988776655',
    },
  });

  console.log(`✅ CRE User created/updated: ${creUser.id} (${creUser.email})`);

  // 6. Assign CRE role to user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: creUser.id,
        roleId: creRole.id,
      },
    },
    update: {},
    create: {
      userId: creUser.id,
      roleId: creRole.id,
    },
  });

  console.log(`✅ Assigned CRE role to user ${creUser.email}`);

  // 7. Update SystemConfig with CRE role ID
  const rnrSettings = await prisma.systemConfig.findUnique({
    where: { key: 'RNR_SETTINGS' },
  });

  if (rnrSettings && rnrSettings.value) {
    const currentSettings = rnrSettings.value as any;
    const updatedSettings = {
      ...currentSettings,
      creAssignment: {
        ...currentSettings.creAssignment,
        creRoleId: creRole.id,
      },
    };

    await prisma.systemConfig.update({
      where: { key: 'RNR_SETTINGS' },
      data: { value: updatedSettings },
    });

    console.log(`✅ Updated RNR_SETTINGS with CRE role ID`);
  }

  console.log('\n✅ CRE Role seeding completed successfully!');
  console.log('───────────────────────────────────────');
  console.log(`Role Name: ${creRole.name}`);
  console.log(`Role ID: ${creRole.id}`);
  console.log(`Permissions: ${crePermissions.length} (candidate access only)`);
  console.log(`Sample User: ${creUser.email}`);
  console.log('───────────────────────────────────────\n');
}

// Run if executed directly
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
