'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
const client_1 = require('@prisma/client');
const bcrypt = __importStar(require('bcrypt'));
const prisma = new client_1.PrismaClient();
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
    permissions: [
      'read:all',
      'write:assigned_teams',
      'manage:users',
      'read:users',
      'read:teams',
      'read:settings',
      'manage:projects',
    ],
  },
  {
    name: 'Team Head',
    description: 'Team Head - Access to assigned teams',
    permissions: [
      'read:assigned_teams',
      'write:assigned_teams',
      'manage:candidates',
      'read:projects',
      'write:projects',
      'read:clients',
      'write:clients',
    ],
  },
  {
    name: 'Team Lead',
    description: 'Team Lead - Task monitoring and assigned recruiters',
    permissions: [
      'read:assigned_teams',
      'write:assigned_teams',
      'read:projects',
      'read:candidates',
      'read:teams',
      'read:interviews',
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
const allPermissions = [
  'read:all',
  'write:all',
  'manage:all',
  'read:users',
  'write:users',
  'manage:users',
  'read:teams',
  'write:teams',
  'manage:teams',
  'read:assigned_teams',
  'write:assigned_teams',
  'read:projects',
  'write:projects',
  'manage:projects',
  'read:assigned_projects',
  'write:assigned_projects',
  'read:candidates',
  'write:candidates',
  'manage:candidates',
  'read:assigned_candidates',
  'write:assigned_candidates',
  'read:documents',
  'write:documents',
  'verify:documents',
  'manage:documents',
  'read:processing',
  'write:processing',
  'manage:processing',
  'manage:recruiters',
  'read:roles',
  'write:roles',
  'manage:roles',
  'read:clients',
  'write:clients',
  'manage:clients',
  'read:interviews',
  'write:interviews',
  'manage:interviews',
  'read:analytics',
  'write:analytics',
  'manage:analytics',
  'read:settings',
  'write:settings',
  'manage:settings',
  'read:audit',
  'write:audit',
  'manage:audit',
];
async function main() {
  console.log('🌱 Starting database seeding...');
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
  const testUsers = [
    {
      email: 'director@affiniks.com',
      name: 'Sarah Director',
      password: 'director123',
      role: 'Director',
    },
    {
      email: 'manager@affiniks.com',
      name: 'Mike Manager',
      password: 'manager123',
      role: 'Manager',
    },
    {
      email: 'teamhead@affiniks.com',
      name: 'Lisa Team Head',
      password: 'teamhead123',
      role: 'Team Head',
    },
    {
      email: 'teamlead@affiniks.com',
      name: 'David Team Lead',
      password: 'teamlead123',
      role: 'Team Lead',
    },
    {
      email: 'recruiter@affiniks.com',
      name: 'Emma Recruiter',
      password: 'recruiter123',
      role: 'Recruiter',
    },
    {
      email: 'docs@affiniks.com',
      name: 'Alex Documentation',
      password: 'docs123',
      role: 'Documentation Executive',
    },
    {
      email: 'processing@affiniks.com',
      name: 'Jordan Processing',
      password: 'processing123',
      role: 'Processing Executive',
    },
  ];
  for (const userData of testUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        password: hashedPassword,
      },
      create: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
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
  console.log('🏥 Creating sample clients...');
  const healthcareClient = await prisma.client.upsert({
    where: { id: 'healthcare-client-id' },
    update: {
      name: 'City General Hospital',
      type: 'HEALTHCARE_ORGANIZATION',
      pointOfContact: 'Dr. John Smith',
      email: 'contact@citygeneral.com',
      phone: '+1234567890',
      address: '123 Medical Center Dr, Healthcare City, HC 12345',
      facilityType: 'HOSPITAL',
      facilitySize: 'LARGE',
      locations: ['Healthcare City', 'Medical District'],
      relationshipType: 'DIRECT_CLIENT',
      commissionRate: 0,
      paymentTerms: 'Net 30',
    },
    create: {
      id: 'healthcare-client-id',
      name: 'City General Hospital',
      type: 'HEALTHCARE_ORGANIZATION',
      pointOfContact: 'Dr. John Smith',
      email: 'contact@citygeneral.com',
      phone: '+1234567890',
      address: '123 Medical Center Dr, Healthcare City, HC 12345',
      facilityType: 'HOSPITAL',
      facilitySize: 'LARGE',
      locations: ['Healthcare City', 'Medical District'],
      relationshipType: 'DIRECT_CLIENT',
      commissionRate: 0,
      paymentTerms: 'Net 30',
    },
  });
  const individualClient = await prisma.client.upsert({
    where: { id: 'individual-client-id' },
    update: {
      name: 'Sarah Johnson',
      type: 'INDIVIDUAL',
      pointOfContact: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1987654321',
      profession: 'Registered Nurse',
      organization: 'Metro Medical Center',
      relationship: 'CURRENT_EMPLOYEE',
      relationshipType: 'REFERRAL',
      commissionRate: 10.0,
    },
    create: {
      id: 'individual-client-id',
      name: 'Sarah Johnson',
      type: 'INDIVIDUAL',
      pointOfContact: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1987654321',
      profession: 'Registered Nurse',
      organization: 'Metro Medical Center',
      relationship: 'CURRENT_EMPLOYEE',
      relationshipType: 'REFERRAL',
      commissionRate: 10.0,
    },
  });
  const agencyClient = await prisma.client.upsert({
    where: { id: 'agency-client-id' },
    update: {
      name: 'Regional Staffing Solutions',
      type: 'SUB_AGENCY',
      pointOfContact: 'Mike Wilson',
      email: 'mike@regionalstaffing.com',
      phone: '+1555123456',
      address: '456 Business Ave, Corporate City, CC 67890',
      agencyType: 'REGIONAL',
      specialties: ['Healthcare', 'Nursing', 'Administrative'],
      relationshipType: 'PARTNERSHIP',
      commissionRate: 25.0,
      paymentTerms: 'Net 45',
    },
    create: {
      id: 'agency-client-id',
      name: 'Regional Staffing Solutions',
      type: 'SUB_AGENCY',
      pointOfContact: 'Mike Wilson',
      email: 'mike@regionalstaffing.com',
      phone: '+1555123456',
      address: '456 Business Ave, Corporate City, CC 67890',
      agencyType: 'REGIONAL',
      specialties: ['Healthcare', 'Nursing', 'Administrative'],
      relationshipType: 'PARTNERSHIP',
      commissionRate: 25.0,
      paymentTerms: 'Net 45',
    },
  });
  const externalClient = await prisma.client.upsert({
    where: { id: 'external-client-id' },
    update: {
      name: 'LinkedIn Healthcare Jobs',
      type: 'EXTERNAL_SOURCE',
      pointOfContact: 'LinkedIn Team',
      email: 'healthcare@linkedin.com',
      sourceType: 'SOCIAL_MEDIA',
      sourceName: 'LinkedIn',
      acquisitionMethod: 'ORGANIC',
      sourceNotes: 'Organic leads from LinkedIn healthcare job postings',
      relationshipType: 'EXTERNAL_SOURCE',
    },
    create: {
      id: 'external-client-id',
      name: 'LinkedIn Healthcare Jobs',
      type: 'EXTERNAL_SOURCE',
      pointOfContact: 'LinkedIn Team',
      email: 'healthcare@linkedin.com',
      sourceType: 'SOCIAL_MEDIA',
      sourceName: 'LinkedIn',
      acquisitionMethod: 'ORGANIC',
      sourceNotes: 'Organic leads from LinkedIn healthcare job postings',
      relationshipType: 'EXTERNAL_SOURCE',
    },
  });
  console.log('✅ Database seeding completed successfully!');
  console.log('\n🔑 Test Users Created:');
  console.log(`👑 CEO: admin@affiniks.com / ${adminPassword}`);
  console.log(`👔 Director: director@affiniks.com / director123`);
  console.log(`📊 Manager: manager@affiniks.com / manager123`);
  console.log(`👥 Team Head: teamhead@affiniks.com / teamhead123`);
  console.log(`🎯 Team Lead: teamlead@affiniks.com / teamlead123`);
  console.log(`🔍 Recruiter: recruiter@affiniks.com / recruiter123`);
  console.log(`📄 Documentation: docs@affiniks.com / docs123`);
  console.log(`⚙️ Processing: processing@affiniks.com / processing123`);
  console.log('\n🎯 Each user has their respective role permissions!');
}
main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
//# sourceMappingURL=seed.js.map
