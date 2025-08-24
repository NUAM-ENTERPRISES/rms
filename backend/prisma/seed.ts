import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Authoritative role set as specified in the task
const roles = [
  {
    name: 'CEO',
    description: 'Chief Executive Officer - Full system access',
    permissions: ['*'],
  },
  {
    name: 'Director',
    description: 'Director - Full system access',
    permissions: ['*'],
  },
  {
    name: 'Manager',
    description: 'Manager - Access to multiple teams',
    permissions: ['read:all', 'write:assigned_teams', 'manage:users'],
  },
  {
    name: 'Team Head',
    description: 'Team Head - Access to assigned teams',
    permissions: [
      'read:assigned_teams',
      'write:assigned_teams',
      'manage:candidates',
    ],
  },
  {
    name: 'Team Lead',
    description: 'Team Lead - Task monitoring and assigned recruiters',
    permissions: [
      'read:assigned_teams',
      'write:candidates',
      'manage:recruiters',
    ],
  },
  {
    name: 'Recruiter',
    description: 'Recruiter - Candidate handling',
    permissions: [
      'read:assigned_candidates',
      'write:candidates',
      'read:projects',
    ],
  },
  {
    name: 'Documentation Executive',
    description: 'Documentation Team - Document verification',
    permissions: ['read:documents', 'write:documents', 'verify:documents'],
  },
  {
    name: 'Processing Executive',
    description: 'Processing department - Post-selection workflows',
    permissions: ['read:processing', 'write:processing', 'manage:processing'],
  },
];

// All possible permissions (expand '*' to all known permissions)
const allPermissions = [
  // Global permissions
  'read:all',
  'write:all',
  'manage:all',

  // User management
  'read:users',
  'write:users',
  'manage:users',

  // Team management
  'read:teams',
  'write:teams',
  'manage:teams',
  'read:assigned_teams',
  'write:assigned_teams',

  // Project management
  'read:projects',
  'write:projects',
  'manage:projects',
  'read:assigned_projects',
  'write:assigned_projects',

  // Candidate management
  'read:candidates',
  'write:candidates',
  'manage:candidates',
  'read:assigned_candidates',
  'write:assigned_candidates',

  // Document management
  'read:documents',
  'write:documents',
  'verify:documents',
  'manage:documents',

  // Processing management
  'read:processing',
  'write:processing',
  'manage:processing',

  // Recruiter management
  'manage:recruiters',

  // Role management
  'read:roles',
  'write:roles',
  'manage:roles',

  // Client management
  'read:clients',
  'write:clients',
  'manage:clients',

  // Interview management
  'read:interviews',
  'write:interviews',
  'manage:interviews',

  // Analytics
  'read:analytics',
  'write:analytics',
];

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create permissions
  console.log('📝 Creating permissions...');
  for (const permissionKey of allPermissions) {
    await prisma.permission.upsert({
      where: { key: permissionKey },
      update: {},
      create: {
        key: permissionKey,
        description: `Permission to ${permissionKey.replace(':', ' ')}`,
      },
    });
  }

  // Create roles and their permissions
  console.log('👥 Creating roles and permissions...');
  for (const roleData of roles) {
    // Create or update role
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

    // Clear existing permissions for this role
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Add permissions to role
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

  // Create default team
  console.log('🏢 Creating default team...');
  let defaultTeam = await prisma.team.findFirst({
    where: { name: 'Default Team' },
  });

  if (!defaultTeam) {
    defaultTeam = await prisma.team.create({
      data: {
        id: 'default-team-id',
        name: 'Default Team',
      },
    });
  }

  // Create bootstrap admin user (CEO)
  console.log('👑 Creating bootstrap admin user...');
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@affiniks.com' },
    update: {
      name: 'System Administrator',
      password: hashedPassword,
    },
    create: {
      email: 'admin@affiniks.com',
      name: 'System Administrator',
      password: hashedPassword,
    },
  });

  // Assign CEO role to admin user
  const ceoRole = await prisma.role.findUnique({
    where: { name: 'CEO' },
  });

  if (ceoRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: ceoRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: ceoRole.id,
      },
    });
  }

  // Assign admin user to default team
  await prisma.userTeam.upsert({
    where: {
      userId_teamId: {
        userId: adminUser.id,
        teamId: defaultTeam.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      teamId: defaultTeam.id,
    },
  });

  // Create sample client
  console.log('🏥 Creating sample client...');
  const sampleClient = await prisma.client.upsert({
    where: { id: 'sample-client-id' },
    update: {
      name: 'Sample Hospital',
      type: 'hospital',
      pointOfContact: 'Dr. John Smith',
      email: 'contact@samplehospital.com',
      phone: '+1234567890',
      address: '123 Medical Center Dr, Healthcare City, HC 12345',
    },
    create: {
      id: 'sample-client-id',
      name: 'Sample Hospital',
      type: 'hospital',
      pointOfContact: 'Dr. John Smith',
      email: 'contact@samplehospital.com',
      phone: '+1234567890',
      address: '123 Medical Center Dr, Healthcare City, HC 12345',
    },
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`🔑 Admin user: admin@affiniks.com / ${adminPassword}`);
  console.log(`👑 Admin role: CEO (full system access)`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
