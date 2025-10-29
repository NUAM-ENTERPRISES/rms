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
const fs = __importStar(require('fs'));
const path = __importStar(require('path'));
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
      'nominate:candidates',
      'approve:candidates',
      'reject:candidates',
      'read:projects',
      'write:projects',
      'read:clients',
      'write:clients',
      'read:documents',
      'schedule:interviews',
      'read:interviews',
      'write:interviews',
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
      'write:candidates',
      'nominate:candidates',
      'read:teams',
      'read:interviews',
      'schedule:interviews',
      'manage:recruiters',
      'read:documents',
    ],
  },
  {
    name: 'Recruiter',
    description: 'Recruiter - Candidate handling',
    permissions: [
      'read:candidates',
      'read:assigned_candidates',
      'write:candidates',
      'manage:candidates',
      'nominate:candidates',
      'read:projects',
      'read:documents',
      'write:documents',
      'read:interviews',
      'schedule:interviews',
      'write:interviews',
    ],
  },
  {
    name: 'Documentation Executive',
    description: 'Documentation Team - Document verification',
    permissions: [
      'read:documents',
      'write:documents',
      'verify:documents',
      'request:resubmission',
      'approve:candidates',
      'reject:candidates',
      'read:candidates',
      'write:candidates',
      'read:projects',
      'read:interviews',
      'schedule:interviews',
      'write:interviews',
    ],
  },
  {
    name: 'Processing Executive',
    description: 'Processing department - Post-selection workflows',
    permissions: [
      'read:processing',
      'write:processing',
      'manage:processing',
      'read:candidates',
      'write:candidates',
      'read:interviews',
      'schedule:interviews',
      'write:interviews',
    ],
  },
  {
    name: 'System Admin',
    description:
      'System Administrator - Full system access and user management',
    permissions: ['*'],
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
  'nominate:candidates',
  'approve:candidates',
  'reject:candidates',
  'read:documents',
  'write:documents',
  'verify:documents',
  'manage:documents',
  'request:resubmission',
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
  'schedule:interviews',
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
async function seedCountries() {
  console.log('🌍 Seeding countries...');
  try {
    const countriesPath = path.join(__dirname, '..', 'countries.json');
    const countriesData = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
    let createdCount = 0;
    let updatedCount = 0;
    for (const country of countriesData) {
      const result = await prisma.country.upsert({
        where: { code: country.code },
        update: {
          name: country.name,
          region: country.region,
          callingCode: country.callingCode || '',
          currency: country.currency || 'N/A',
          timezone: country.timezone || 'UTC',
          isActive: true,
        },
        create: {
          code: country.code,
          name: country.name,
          region: country.region,
          callingCode: country.callingCode || '',
          currency: country.currency || 'N/A',
          timezone: country.timezone || 'UTC',
          isActive: true,
        },
      });
      if (result.createdAt === result.updatedAt) {
        createdCount++;
      } else {
        updatedCount++;
      }
    }
    console.log(
      `✅ Countries seeded: ${createdCount} created, ${updatedCount} updated`,
    );
  } catch (error) {
    console.error('❌ Error seeding countries:', error);
    throw error;
  }
}
async function seedRoleCatalog() {
  console.log('🏥 Seeding healthcare roles catalog...');
  try {
    const rolesPath = path.join(__dirname, 'seeds', 'role-catalog.json');
    const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
    let createdCount = 0;
    let updatedCount = 0;
    for (const role of rolesData) {
      const result = await prisma.roleCatalog.upsert({
        where: { slug: role.slug },
        update: {
          name: role.name,
          category: role.category,
          subCategory: role.subCategory,
          isClinical: role.isClinical,
          description: role.description,
          isActive: true,
        },
        create: {
          name: role.name,
          slug: role.slug,
          category: role.category,
          subCategory: role.subCategory,
          isClinical: role.isClinical,
          description: role.description,
          isActive: true,
        },
      });
      if (result.createdAt === result.updatedAt) {
        createdCount++;
      } else {
        updatedCount++;
      }
    }
    console.log(
      `✅ Role catalog seeded: ${createdCount} created, ${updatedCount} updated`,
    );
  } catch (error) {
    console.error('❌ Error seeding role catalog:', error);
    throw error;
  }
}
async function seedQualifications() {
  console.log('🎓 Seeding qualifications catalog...');
  try {
    const qualificationsPath = path.join(
      __dirname,
      'seeds',
      'qualifications.json',
    );
    const qualificationsData = JSON.parse(
      fs.readFileSync(qualificationsPath, 'utf8'),
    );
    let createdCount = 0;
    let updatedCount = 0;
    for (const qualification of qualificationsData) {
      const result = await prisma.qualification.upsert({
        where: { name: qualification.name },
        update: {
          shortName: qualification.shortName,
          level: qualification.level,
          field: qualification.field,
          program: qualification.program,
          description: qualification.description,
          isActive: true,
        },
        create: {
          name: qualification.name,
          shortName: qualification.shortName,
          level: qualification.level,
          field: qualification.field,
          program: qualification.program,
          description: qualification.description,
          isActive: true,
        },
      });
      if (result.createdAt === result.updatedAt) {
        createdCount++;
      } else {
        updatedCount++;
      }
    }
    console.log(
      `✅ Qualifications seeded: ${createdCount} created, ${updatedCount} updated`,
    );
  } catch (error) {
    console.error('❌ Error seeding qualifications:', error);
    throw error;
  }
}
async function seedQualificationAliases() {
  console.log('🔗 Seeding qualification aliases...');
  try {
    const aliasesPath = path.join(
      __dirname,
      'seeds',
      'qualification-aliases.json',
    );
    const aliasesData = JSON.parse(fs.readFileSync(aliasesPath, 'utf8'));
    let createdCount = 0;
    for (const aliasData of aliasesData) {
      const qualification = await prisma.qualification.findFirst({
        where: { shortName: aliasData.qualificationShortName },
      });
      if (qualification) {
        try {
          await prisma.qualificationAlias.create({
            data: {
              qualificationId: qualification.id,
              alias: aliasData.alias,
              isCommon: aliasData.isCommon,
            },
          });
          createdCount++;
        } catch (error) {
          if (!error.message.includes('Unique constraint')) {
            console.warn(
              `Warning: Could not create alias "${aliasData.alias}":`,
              error.message,
            );
          }
        }
      } else {
        console.warn(
          `Warning: Qualification not found for shortName: ${aliasData.qualificationShortName}`,
        );
      }
    }
    console.log(`✅ Qualification aliases seeded: ${createdCount} created`);
  } catch (error) {
    console.error('❌ Error seeding qualification aliases:', error);
    throw error;
  }
}
async function seedRoleRecommendedQualifications() {
  console.log('🎯 Seeding role recommended qualifications...');
  try {
    const recommendationsPath = path.join(
      __dirname,
      'seeds',
      'role-recommended-qualifications.json',
    );
    const recommendationsData = JSON.parse(
      fs.readFileSync(recommendationsPath, 'utf8'),
    );
    let createdCount = 0;
    for (const recommendation of recommendationsData) {
      const role = await prisma.roleCatalog.findFirst({
        where: { slug: recommendation.roleSlug },
      });
      const qualification = await prisma.qualification.findFirst({
        where: { shortName: recommendation.qualificationShortName },
      });
      if (role && qualification) {
        try {
          await prisma.roleRecommendedQualification.create({
            data: {
              roleId: role.id,
              qualificationId: qualification.id,
              weight: recommendation.weight,
              isPreferred: recommendation.isPreferred,
              notes: recommendation.notes,
            },
          });
          createdCount++;
        } catch (error) {
          if (!error.message.includes('Unique constraint')) {
            console.warn(
              `Warning: Could not create recommendation:`,
              error.message,
            );
          }
        }
      } else {
        console.warn(
          `Warning: Role or qualification not found for: ${recommendation.roleSlug} -> ${recommendation.qualificationShortName}`,
        );
      }
    }
    console.log(
      `✅ Role recommended qualifications seeded: ${createdCount} created`,
    );
  } catch (error) {
    console.error('❌ Error seeding role recommended qualifications:', error);
    throw error;
  }
}
async function main() {
  console.log('🌱 Starting database seeding...');
  await seedCountries();
  await seedRoleCatalog();
  await seedQualifications();
  await seedQualificationAliases();
  await seedRoleRecommendedQualifications();
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
        id: 'mhvfuykewhjnhgsevcj',
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
      countryCode: '+91',
      mobileNumber: '9876543210',
    },
    create: {
      email: 'admin@affiniks.com',
      name: 'System Administrator',
      password: hashedPassword,
      countryCode: '+91',
      mobileNumber: '9876543210',
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
      email: 'sysadmin@affiniks.com',
      name: 'Alex System Admin',
      password: 'sysadmin123',
      countryCode: '+91',
      phone: '9876543222',
      role: 'System Admin',
    },
  ];
  for (const userData of testUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        password: hashedPassword,
        countryCode: userData.countryCode,
        mobileNumber: userData.phone,
      },
      create: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        countryCode: userData.countryCode,
        mobileNumber: userData.phone,
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
    const eligibleRolesForTeamMembership = [
      'Team Lead',
      'Recruiter',
      'Documentation Executive',
      'Processing Executive',
    ];
    if (eligibleRolesForTeamMembership.includes(userData.role)) {
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
  console.log('\n🔑 Test Users Created (Login with Phone + Password):');
  console.log(`👑 CEO: +919876543210 / ${adminPassword} (admin@affiniks.com)`);
  console.log(
    `👔 Director: +919876543211 / director123 (director@affiniks.com)`,
  );
  console.log(`📊 Manager: +919876543212 / manager123 (manager@affiniks.com)`);
  console.log(
    `👥 Team Head: +919876543213 / teamhead123 (teamhead@affiniks.com)`,
  );
  console.log(
    `🎯 Team Lead: +919876543214 / teamlead123 (teamlead@affiniks.com)`,
  );
  console.log(
    `🔍 Recruiter 1: +919876543215 / recruiter123 (recruiter1@affiniks.com)`,
  );
  console.log(
    `🔍 Recruiter 2: +919876543216 / recruiter123 (recruiter2@affiniks.com)`,
  );
  console.log(
    `🔍 Recruiter 3: +919876543217 / recruiter123 (recruiter3@affiniks.com)`,
  );
  console.log(
    `🔍 Recruiter 4: +919876543218 / recruiter123 (recruiter4@affiniks.com)`,
  );
  console.log(
    `🔍 Recruiter 5: +919876543219 / recruiter123 (recruiter5@affiniks.com)`,
  );
  console.log(`📄 Documentation: +919876543220 / docs123 (docs@affiniks.com)`);
  console.log(
    `⚙️ Processing: +919876543221 / processing123 (processing@affiniks.com)`,
  );
  console.log(
    `🔧 System Admin: +919876543222 / sysadmin123 (sysadmin@affiniks.com)`,
  );
  console.log('\n🎯 Each user has their respective role permissions!');
  console.log(
    '👥 Only eligible roles (Team Lead, Recruiter, Documentation Executive, Processing Executive) are assigned to the Default Team!',
  );
  console.log(
    '🔒 Higher roles (CEO, Director, Manager, Team Head, System Admin) are not team members and can manage teams!',
  );
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
