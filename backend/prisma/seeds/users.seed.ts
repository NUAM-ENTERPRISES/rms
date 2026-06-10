import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const DEFAULT_TEAM_ID = 'mhvfuykewhjnhgsevcj';

const ELIGIBLE_TEAM_ROLES = [
  'Team Lead',
  'Recruiter',
  'Documentation Executive',
  'Processing Executive',
] as const;

const TEST_USERS = [
  {
    email: 'director@affiniks.com',
    name: 'Sarah Director',
    password: 'director123',
    countryCode: '+91',
    phone: '9876543211',
    role: 'Director',
  },
  {
    email: 'manager@affiniks.com',
    name: 'Mike Manager',
    password: 'manager123',
    countryCode: '+91',
    phone: '9876543212',
    role: 'Manager',
  },
  {
    email: 'processingmanager1@affiniks.com',
    name: 'Sivam',
    password: 'processingmanager123',
    countryCode: '+91',
    phone: '9876543243',
    role: 'Processing Manager',
  },
  {
    email: 'recruitermanager1@affiniks.com',
    name: 'Jemi',
    password: 'recruitermanager123',
    countryCode: '+91',
    phone: '9876543244',
    role: 'Recruiter Manager',
  },
  {
    email: 'teamhead@affiniks.com',
    name: 'Lisa Team Head',
    password: 'teamhead123',
    countryCode: '+91',
    phone: '9876543213',
    role: 'Team Head',
  },
  {
    email: 'teamlead@affiniks.com',
    name: 'David Team Lead',
    password: 'teamlead123',
    countryCode: '+91',
    phone: '9876543214',
    role: 'Team Lead',
  },
  {
    email: 'recruiter1@affiniks.com',
    name: 'Emma Recruiter',
    password: 'recruiter123',
    countryCode: '+91',
    phone: '9876543215',
    role: 'Recruiter',
  },
  {
    email: 'recruiter2@affiniks.com',
    name: 'John Recruiter',
    password: 'recruiter123',
    countryCode: '+91',
    phone: '9876543216',
    role: 'Recruiter',
  },
  {
    email: 'recruiter3@affiniks.com',
    name: 'Sarah Recruiter',
    password: 'recruiter123',
    countryCode: '+91',
    phone: '9876543217',
    role: 'Recruiter',
  },
  {
    email: 'recruiter4@affiniks.com',
    name: 'Mike Recruiter',
    password: 'recruiter123',
    countryCode: '+91',
    phone: '9876543218',
    role: 'Recruiter',
  },
  {
    email: 'recruiter5@affiniks.com',
    name: 'Lisa Recruiter',
    password: 'recruiter123',
    countryCode: '+91',
    phone: '9876543219',
    role: 'Recruiter',
  },
  {
    email: 'docs@affiniks.com',
    name: 'Alex Documentation',
    password: 'docs123',
    countryCode: '+91',
    phone: '9876543220',
    role: 'Documentation Executive',
  },
  {
    email: 'processing@affiniks.com',
    name: 'Jordan Processing',
    password: 'processing123',
    countryCode: '+91',
    phone: '9876543221',
    role: 'Processing Executive',
  },
  {
    email: 'processing1@affiniks.com',
    name: 'Michael Processing',
    password: 'processing123',
    countryCode: '+91',
    phone: '9876543231',
    role: 'Processing Executive',
  },
  {
    email: 'processing2@affiniks.com',
    name: 'Sarah Processing',
    password: 'processing123',
    countryCode: '+91',
    phone: '9876543232',
    role: 'Processing Executive',
  },
  {
    email: 'processing3@affiniks.com',
    name: 'Robert Processing',
    password: 'processing123',
    countryCode: '+91',
    phone: '9876543233',
    role: 'Processing Executive',
  },
  {
    email: 'processing4@affiniks.com',
    name: 'Emily Processing',
    password: 'processing123',
    countryCode: '+91',
    phone: '9876543234',
    role: 'Processing Executive',
  },
  {
    email: 'coordinator@affiniks.com',
    name: 'Rachel Interview Coordinator',
    password: 'coordinator123',
    countryCode: '+91',
    phone: '9876543223',
    role: 'Interview Coordinator',
  },
  {
    email: 'trainer@affiniks.com',
    name: 'Tom Trainer',
    password: 'trainer123',
    countryCode: '+91',
    phone: '9876543224',
    role: 'Screening Trainer',
  },
  {
    email: 'trainer2@affiniks.com',
    name: 'Priya Trainer',
    password: 'trainer123',
    countryCode: '+91',
    phone: '9876543240',
    role: 'Screening Trainer',
  },
  {
    email: 'trainer3@affiniks.com',
    name: 'Arun Trainer',
    password: 'trainer123',
    countryCode: '+91',
    phone: '9876543241',
    role: 'Screening Trainer',
  },
  {
    email: 'sysadmin@affiniks.com',
    name: 'Alex System Admin',
    password: 'sysadmin123',
    countryCode: '+91',
    phone: '9876543222',
    role: 'System Admin',
  },
  {
    email: 'agentcoordinator@affiniks.com',
    name: 'Alex Agent Coordinator',
    password: 'client123',
    countryCode: '+91',
    phone: '9876543242',
    role: 'Agent Coordinator',
  },
  {
    email: 'projectcoordinator@affiniks.com',
    name: 'Sam Project Coordinator',
    password: 'projectcoordinator123',
    countryCode: '+91',
    phone: '9876543245',
    role: 'Project Coordinator',
  },
] as const;

export async function seedUsers(prisma: PrismaClient): Promise<{ adminPassword: string }> {
  console.log('🏢 Creating default team...');
  let defaultTeam = await prisma.team.findFirst({
    where: { name: 'Default Team' },
  });
  if (!defaultTeam) {
    defaultTeam = await prisma.team.create({
      data: {
        id: DEFAULT_TEAM_ID,
        name: 'Default Team',
      },
    });
  }

  console.log('👑 Creating bootstrap admin user...');
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@affiniks.com' },
    update: {
      name: 'System Administrator',
      password: hashedAdminPassword,
      countryCode: '+91',
      mobileNumber: '9876543210',
      notificationSoundMuted: false,
    },
    create: {
      email: 'admin@affiniks.com',
      name: 'System Administrator',
      password: hashedAdminPassword,
      countryCode: '+91',
      mobileNumber: '9876543210',
      notificationSoundMuted: false,
    },
  });

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

  console.log('👥 Creating test users for each role...');
  for (const userData of TEST_USERS) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        password: hashedPassword,
        countryCode: userData.countryCode,
        mobileNumber: userData.phone,
        notificationSoundMuted: false,
      },
      create: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        countryCode: userData.countryCode,
        mobileNumber: userData.phone,
        notificationSoundMuted: false,
      },
    });

    const role = await prisma.role.findUnique({
      where: { name: userData.role },
    });
    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    if (ELIGIBLE_TEAM_ROLES.includes(userData.role as (typeof ELIGIBLE_TEAM_ROLES)[number])) {
      await prisma.userTeam.upsert({
        where: {
          userId_teamId: {
            userId: user.id,
            teamId: defaultTeam.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          teamId: defaultTeam.id,
        },
      });
    }
  }

  console.log(`✅ Seeded ${TEST_USERS.length} test users + admin (${TEST_USERS.length + 1} total)`);

  return { adminPassword };
}

export function logSeedUserCredentials(adminPassword: string) {
  console.log('✅ Database seeding completed successfully!');
  console.log('\n🔑 Test Users Created (Login with Phone + Password):');
  console.log(`👑 CEO: +919876543210 / ${adminPassword} (admin@affiniks.com)`);
  console.log('👔 Director: +919876543211 / director123 (director@affiniks.com)');
  console.log('📊 Manager: +919876543212 / manager123 (manager@affiniks.com)');
  console.log(
    '⚙️ Processing Manager: +919876543243 / processingmanager123 (processingmanager1@affiniks.com)',
  );
  console.log(
    '📋 Recruiter Manager: +919876543244 / recruitermanager123 (recruitermanager1@affiniks.com)',
  );
  console.log('👥 Team Head: +919876543213 / teamhead123 (teamhead@affiniks.com)');
  console.log('🎯 Team Lead: +919876543214 / teamlead123 (teamlead@affiniks.com)');
  console.log('🔍 Recruiters 1–5: +919876543215–219 / recruiter123');
  console.log('📄 Documentation: +919876543220 / docs123 (docs@affiniks.com)');
  console.log('⚙️ Processing 1–5: +919876543221, +919876543231–234 / processing123');
  console.log('🎤 Interview Coordinator: +919876543223 / coordinator123 (coordinator@affiniks.com)');
  console.log('🎓 Screening Trainers: +919876543224, +919876543240–241 / trainer123');
  console.log('🔧 System Admin: +919876543222 / sysadmin123 (sysadmin@affiniks.com)');
  console.log('🤝 Agent Coordinator: +919876543242 / client123 (agentcoordinator@affiniks.com)');
  console.log(
    '📁 Project Coordinator: +919876543245 / projectcoordinator123 (projectcoordinator@affiniks.com)',
  );
  console.log('📞 Operations: +919987766655 (operations@affiniks.com)');
  console.log('\n🎯 Each user has their respective role permissions!');
  console.log(
    '👥 Team members: Team Lead, Recruiters, Documentation Executive, Processing Executives',
  );
}
