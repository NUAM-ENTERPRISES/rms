import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create roles
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

  console.log('📝 Creating roles...');
  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData,
    });
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  console.log('👤 Creating default admin user...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@affiniks.com' },
    update: {},
    create: {
      email: 'admin@affiniks.com',
      name: 'System Administrator',
      password: hashedPassword,
      roleId: (await prisma.role.findUnique({ where: { name: 'CEO' } }))!.id,
    },
  });

  // Create a default team
  console.log('👥 Creating default team...');
  let defaultTeam = await prisma.team.findFirst({
    where: { name: 'Default Team' },
  });

  if (!defaultTeam) {
    defaultTeam = await prisma.team.create({
      data: {
        name: 'Default Team',
        managerId: adminUser.id,
      },
    });
  }

  // Create a sample client
  console.log('🏢 Creating sample client...');
  let sampleClient = await prisma.client.findFirst({
    where: { name: 'Sample Hospital' },
  });

  if (!sampleClient) {
    sampleClient = await prisma.client.create({
      data: {
        name: 'Sample Hospital',
        type: 'hospital',
        pointOfContact: 'Dr. John Smith',
        email: 'hr@samplehospital.com',
        phone: '+1-555-0123',
      },
    });
  }

  console.log('✅ Database seeding completed successfully!');
  console.log('📧 Default admin credentials:');
  console.log('   Email: admin@affiniks.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
