import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

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
      'read:assigned_candidates',
      'write:candidates',
      'nominate:candidates',
      'read:projects',
      'read:documents',
      'write:documents',
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
      'read:projects',
    ],
  },
  {
    name: 'Processing Executive',
    description: 'Processing department - Post-selection workflows',
    permissions: ['read:processing', 'write:processing', 'manage:processing'],
  },
  {
    name: 'System Admin',
    description:
      'System Administrator - Full system access and user management',
    permissions: ['*'],
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
  'nominate:candidates',
  'approve:candidates',
  'reject:candidates',

  // Document management
  'read:documents',
  'write:documents',
  'verify:documents',
  'manage:documents',
  'request:resubmission',

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
  'schedule:interviews',

  // Analytics
  'read:analytics',
  'write:analytics',
  'manage:analytics',

  // Settings
  'read:settings',
  'write:settings',
  'manage:settings',

  // Audit
  'read:audit',
  'write:audit',
  'manage:audit',
];

// Load countries data
interface CountryData {
  code: string;
  name: string;
  region: string;
  callingCode: string | null;
  currency?: string;
  timezone: string | null;
}

async function seedCountries() {
  console.log('🌍 Seeding countries...');

  try {
    const countriesPath = path.join(__dirname, '..', 'countries.json');
    const countriesData: CountryData[] = JSON.parse(
      fs.readFileSync(countriesPath, 'utf8'),
    );

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

// Healthcare roles catalog seeding functions
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
      // Find qualification by shortName
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
          // Skip if alias already exists (unique constraint)
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
      // Find role by slug
      const role = await prisma.roleCatalog.findFirst({
        where: { slug: recommendation.roleSlug },
      });

      // Find qualification by shortName
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
          // Skip if recommendation already exists (unique constraint)
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

  // Seed countries first
  await seedCountries();

  // Seed healthcare roles catalog
  await seedRoleCatalog();
  await seedQualifications();
  await seedQualificationAliases();
  await seedRoleRecommendedQualifications();

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
        id: 'mhvfuykewhjnhgsevcj',
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
      countryCode: '+91',
      phone: '9876543210',
    },
    create: {
      email: 'admin@affiniks.com',
      name: 'System Administrator',
      password: hashedPassword,
      countryCode: '+91',
      phone: '9876543210',
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

  // Create test users for each role
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
      email: 'recruiter@affiniks.com',
      name: 'Emma Recruiter',
      password: 'recruiter123',
      countryCode: '+91',
      phone: '9876543215',
      role: 'Recruiter',
    },
    {
      email: 'docs@affiniks.com',
      name: 'Alex Documentation',
      password: 'docs123',
      countryCode: '+91',
      phone: '9876543216',
      role: 'Documentation Executive',
    },
    {
      email: 'processing@affiniks.com',
      name: 'Jordan Processing',
      password: 'processing123',
      countryCode: '+91',
      phone: '9876543217',
      role: 'Processing Executive',
    },
    {
      email: 'sysadmin@affiniks.com',
      name: 'Alex System Admin',
      password: 'sysadmin123',
      countryCode: '+91',
      phone: '9876543218',
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
        phone: userData.phone,
      },
      create: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        countryCode: userData.countryCode,
        phone: userData.phone,
      },
    });

    // Get the role
    const role = await prisma.role.findUnique({
      where: { name: userData.role },
    });

    if (role) {
      // Assign role to user
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

    // Assign user to default team
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

  // Create sample clients for each type
  console.log('🏥 Creating sample clients...');

  // Healthcare Organization
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

  // Individual Referrer
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

  // Sub-Agency
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

  // External Source
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
    `🔍 Recruiter: +919876543215 / recruiter123 (recruiter@affiniks.com)`,
  );
  console.log(`📄 Documentation: +919876543216 / docs123 (docs@affiniks.com)`);
  console.log(
    `⚙️ Processing: +919876543217 / processing123 (processing@affiniks.com)`,
  );
  console.log(
    `🔧 System Admin: +919876543218 / sysadmin123 (sysadmin@affiniks.com)`,
  );
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
