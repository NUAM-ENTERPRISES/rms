import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupCREPermissions() {
  console.log('🧹 Cleaning up old CRE permissions...');

  // Get CRE role
  const creRole = await prisma.role.findUnique({
    where: { name: 'CRE' },
  });

  if (!creRole) {
    console.log('❌ CRE role not found');
    return;
  }

  console.log(`✅ Found CRE role: ${creRole.id}`);

  // Permissions to REMOVE (old ones with wrong format)
  const permissionsToRemove = [
    'candidates:read',
    'candidates:write',
    'candidates:edit',
    'candidates:status',
    'candidates:assign',
    'candidates:notes',
    'candidates:qualifications',
    'notifications:read',
    'write:candidates', // Also remove create permission
    'delete:candidates', // Also remove delete permission
  ];

  // Find and remove these permissions from CRE role
  for (const permKey of permissionsToRemove) {
    const permission = await prisma.permission.findUnique({
      where: { key: permKey },
    });

    if (permission) {
      // Remove from role
      await prisma.rolePermission.deleteMany({
        where: {
          roleId: creRole.id,
          permissionId: permission.id,
        },
      });
      console.log(`✅ Removed permission: ${permKey}`);
    }
  }

  // Verify final permissions
  const finalPermissions = await prisma.rolePermission.findMany({
    where: { roleId: creRole.id },
    include: {
      permission: true,
    },
  });

  console.log('\n✅ Cleanup completed!');
  console.log('───────────────────────────────────────');
  console.log('Remaining CRE permissions:');
  finalPermissions.forEach((rp) => {
    console.log(`  - ${rp.permission.key}: ${rp.permission.description}`);
  });
  console.log('───────────────────────────────────────\n');
}

// Run if executed directly
if (require.main === module) {
  cleanupCREPermissions()
    .then(() => {
      console.log('✅ Cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
