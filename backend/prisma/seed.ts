// Load environment variables from .env when running ts-node scripts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { seedSystemConfig } from './seeds/system-config.seed';
import { seedCRERole } from './seeds/cre-role.seed';
import { seedCandidateProjectWorkflow } from './seeds/seed-candidate-project-status';
import { seedRoleCatalog } from './seeds/role-catalog.seed';
import { seedCountryDocuments } from './seeds/country-documents.seed';

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
      'transfer:candidates',
      'transfer_back:candidates',
      'transfer:processing',
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
      'transfer_back:candidates',
      'read:projects',
      'write:projects',
      'read:clients',
      'write:clients',
      'read:documents',
      'schedule:interviews',
      'read:interviews',
      'write:interviews',
      'read:screenings',
      'read:interview_templates',
      'read:training',
      'manage:training',
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
      'transfer:candidates',
      'transfer_back:candidates',
    ],
  },
  {
    name: 'Recruiter',
    description:
      'Recruiter - Candidate handling, document management and basic candidate management',
    permissions: [
      'read:candidates',
      'read:assigned_candidates',
      'write:candidates',
      'manage:candidates',
      'nominate:candidates',
      'read:projects',
      // 'read:interviews',
      // Document-related permissions
      'read:documents',
      'write:documents',
      'verify:documents',
      'manage:documents',
      'request:resubmission',
      // Candidate decision permissions relevant to document flow
      'approve:candidates',
      'reject:candidates',
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
    ],
  },
  {
    name: 'Processing Executive',
    description: 'Processing department - Post-selection workflows',
    permissions: [
      'read:processing',
      'write:processing',
      'manage:processing',
      'read:projects',
      'read:candidates',
      'write:candidates',
      'read:interviews',
      'schedule:interviews',
      'write:interviews',
    ],
  },
  {
    name: 'Interview Coordinator',
    description:
      'Interview Coordinator - Conducts screenings and assigns training',
    permissions: [
      'read:candidates',
      'write:candidates',
      'manage:candidates',
      'read:users',
      'read:projects',
      'read:interviews',
      'write:interviews',
      'manage:interviews',
      'schedule:interviews',
      'read:screenings',
      'write:screenings',
      'manage:screenings',
      'conduct:screenings',
      'read:interview_templates',
      'write:interview_templates',
      'manage:interview_templates',
      'read:training',
      'write:training',
      'manage:training',
      'assign:training',
      'read:documents',
    ],
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
  'transfer:candidates',
  'transfer_back:candidates',

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

  // Screening Interview & Training management
  'read:screenings',
  'write:screenings',
  'manage:screenings',
  'conduct:screenings',
  'read:interview_templates',
  'write:interview_templates',
  'manage:interview_templates',
  'read:training',
  'write:training',
  'manage:training',
  'assign:training',

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

// Healthcare roles catalog is implemented in prisma/seeds/role-catalog.seed.ts

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
  // Role recommended qualifications seeding disabled (depends on role slugs)
  console.log('⚠️ Role recommended qualifications seeding is currently disabled');
}

async function seedReligions() {
  console.log('🕉️ Seeding religions...');

  const religions = [
    'Hinduism',
    'Islam',
    'Christianity',
    'Sikhism',
    'Buddhism',
    'Jainism',
    'Zoroastrianism',
    'Judaism',
    'Baháʼí Faith',
    'Other',
    'No Religion',
    'Prefer not to say',
  ];

  for (const religionName of religions) {
    await prisma.religion.upsert({
      where: { name: religionName },
      update: {},
      create: {
        name: religionName,
        isActive: true,
      },
    });
  }

  console.log(`✅ Religions seeded: ${religions.length} created/updated`);
}

async function seedStates() {
  console.log('🗺️ Seeding Indian states...');

  const indianStates = [
    { name: 'Andhra Pradesh', code: 'AP' },
    { name: 'Arunachal Pradesh', code: 'AR' },
    { name: 'Assam', code: 'AS' },
    { name: 'Bihar', code: 'BR' },
    { name: 'Chhattisgarh', code: 'CG' },
    { name: 'Goa', code: 'GA' },
    { name: 'Gujarat', code: 'GJ' },
    { name: 'Haryana', code: 'HR' },
    { name: 'Himachal Pradesh', code: 'HP' },
    { name: 'Jharkhand', code: 'JH' },
    { name: 'Karnataka', code: 'KA' },
    { name: 'Kerala', code: 'KL' },
    { name: 'Madhya Pradesh', code: 'MP' },
    { name: 'Maharashtra', code: 'MH' },
    { name: 'Manipur', code: 'MN' },
    { name: 'Meghalaya', code: 'ML' },
    { name: 'Mizoram', code: 'MZ' },
    { name: 'Nagaland', code: 'NL' },
    { name: 'Odisha', code: 'OR' },
    { name: 'Punjab', code: 'PB' },
    { name: 'Rajasthan', code: 'RJ' },
    { name: 'Sikkim', code: 'SK' },
    { name: 'Tamil Nadu', code: 'TN' },
    { name: 'Telangana', code: 'TG' },
    { name: 'Tripura', code: 'TR' },
    { name: 'Uttar Pradesh', code: 'UP' },
    { name: 'Uttarakhand', code: 'UK' },
    { name: 'West Bengal', code: 'WB' },
    { name: 'Andaman and Nicobar Islands', code: 'AN' },
    { name: 'Chandigarh', code: 'CH' },
    { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DH' },
    { name: 'Delhi', code: 'DL' },
    { name: 'Jammu and Kashmir', code: 'JK' },
    { name: 'Ladakh', code: 'LA' },
    { name: 'Lakshadweep', code: 'LD' },
    { name: 'Puducherry', code: 'PY' },
  ];

  for (const state of indianStates) {
    await prisma.state.upsert({
      where: { code: state.code },
      update: {},
      create: {
        name: state.name,
        code: state.code,
        countryCode: 'IN', // India
        isActive: true,
      },
    });
  }

  console.log(`✅ States seeded: ${indianStates.length} created/updated`);
}

async function seedCandidateProjectStatuses() {
  console.log('🌱 Seeding candidate project statuses...');

  const candidateProjectStatuses = [
    {
      statusName: 'nominated',
      label: 'Nominated',
      description: 'Candidate has been nominated for the project',
      stage: 'nomination',
      isTerminal: false,
      color: 'blue',
    },
    {
      statusName: 'pending_documents',
      label: 'Pending Documents',
      description: 'Waiting for candidate to submit required documents',
      stage: 'documents',
      isTerminal: false,
      color: 'yellow',
    },
    {
      statusName: 'documents_submitted',
      label: 'Documents Submitted',
      description: 'Candidate has submitted all required documents',
      stage: 'documents',
      isTerminal: false,
      color: 'blue',
    },
    {
      statusName: 'verification_in_progress',
      label: 'Verification In Progress',
      description: 'Documents are being verified',
      stage: 'documents',
      isTerminal: false,
      color: 'orange',
    },
    {
      statusName: 'documents_verified',
      label: 'Documents Verified',
      description: 'All documents have been verified successfully',
      stage: 'documents',
      isTerminal: false,
      color: 'green',
    },
    {
      statusName: 'approved',
      label: 'Approved',
      description: 'Candidate has been approved for interview',
      stage: 'approval',
      isTerminal: false,
      color: 'green',
    },
    {
      statusName: 'interview_scheduled',
      label: 'Interview Scheduled',
      description: 'Interview has been scheduled',
      stage: 'interview',
      isTerminal: false,
      color: 'purple',
    },
    {
      statusName: 'interview_completed',
      label: 'Interview Completed',
      description: 'Interview has been completed, awaiting results',
      stage: 'interview',
      isTerminal: false,
      color: 'purple',
    },
    {
      statusName: 'interview_passed',
      label: 'Interview Passed',
      description: 'Candidate has passed the interview',
      stage: 'interview',
      isTerminal: false,
      color: 'green',
    },
    {
      statusName: 'selected',
      label: 'Selected',
      description: 'Candidate has been selected for the position',
      stage: 'selection',
      isTerminal: false,
      color: 'green',
    },
    {
      statusName: 'processing',
      label: 'Processing',
      description: 'Candidate is in processing phase (visa, medical, etc.)',
      stage: 'processing',
      isTerminal: false,
      color: 'orange',
    },
    {
      statusName: 'hired',
      label: 'Hired',
      description: 'Candidate has been successfully hired',
      stage: 'final',
      isTerminal: true,
      color: 'green',
    },
    {
      statusName: 'rejected_documents',
      label: 'Rejected - Documents',
      description: 'Candidate rejected due to document issues',
      stage: 'rejected',
      isTerminal: true,
      color: 'red',
    },
    {
      statusName: 'rejected_interview',
      label: 'Rejected - Interview',
      description: 'Candidate did not pass the interview',
      stage: 'rejected',
      isTerminal: true,
      color: 'red',
    },
    {
      statusName: 'rejected_selection',
      label: 'Rejected - Selection',
      description: 'Candidate was not selected after interview',
      stage: 'rejected',
      isTerminal: true,
      color: 'red',
    },
    {
      statusName: 'withdrawn',
      label: 'Withdrawn',
      description: 'Candidate has withdrawn from the process',
      stage: 'withdrawn',
      isTerminal: true,
      color: 'gray',
    },
    {
      statusName: 'on_hold',
      label: 'On Hold',
      description: 'Candidate application is temporarily on hold',
      stage: 'on_hold',
      isTerminal: false,
      color: 'yellow',
    },
  ];

  for (const status of candidateProjectStatuses) {
    await prisma.candidateProjectStatus.upsert({
      where: { statusName: status.statusName },
      update: {
        label: status.label,
        description: status.description,
        stage: status.stage,
        isTerminal: status.isTerminal,
        color: status.color,
      },
      create: status,
    });
  }

  const count = await prisma.candidateProjectStatus.count();
  console.log(`✅ Successfully seeded ${count} candidate project statuses`);

  // Display summary by stage
  const stages = await prisma.candidateProjectStatus.groupBy({
    by: ['stage'],
    _count: {
      id: true,
    },
  });

  console.log('\n📊 Status breakdown by stage:');
  stages.forEach((stage) => {
    console.log(`   ${stage.stage}: ${stage._count.id} statuses`);
  });
}

async function seedCandidateStatus() {
  console.log('🧾 Seeding candidate statuses...');

  const statuses = [
    'Untouched',
    'Interested',
    'Not Interested',
    'Not Eligible',
    'Other Enquiry',
    'Future',
    'On Hold',
    'RNR',
    'Qualified',
    'Working',
  ];

  for (const statusName of statuses) {
    await prisma.candidateStatus.upsert({
      where: { statusName: statusName },
      update: {},
      create: {
        statusName: statusName,
      },
    });
  }

  console.log(
    `✅ Candidate statuses seeded: ${statuses.length} created/updated`,
  );
}

async function seedScreeningTemplates() {
  console.log('📋 Seeding screening checklist templates...');
  try {
    // Get sample roles to create templates for
    // role catalog no longer exposes `slug` in the schema; match by `name`
    const registeredNurse = await prisma.roleCatalog.findFirst({
      where: { name: { contains: 'Registered Nurse' } },
    });
    const doctor = await prisma.roleCatalog.findFirst({
      where: { name: { contains: 'Doctor' } },
    });

    if (!registeredNurse && !doctor) {
      console.log('⚠️  No roles found, skipping template seeding');
      return;
    }

    const templates: Array<{
      roleId: string;
      category: string;
      criterion: string;
      order: number;
    }> = [];

    // Registered Nurse Templates
    if (registeredNurse) {
      templates.push(
        // Technical Skills
        {
          roleId: registeredNurse.id,
          category: 'technical_skills',
          criterion: 'Medication Administration Knowledge',
          order: 1,
        },
        {
          roleId: registeredNurse.id,
          category: 'technical_skills',
          criterion: 'Vital Signs Monitoring',
          order: 2,
        },
        {
          roleId: registeredNurse.id,
          category: 'technical_skills',
          criterion: 'IV Line Management',
          order: 3,
        },
        {
          roleId: registeredNurse.id,
          category: 'technical_skills',
          criterion: 'Wound Care Procedures',
          order: 4,
        },
        // Communication
        {
          roleId: registeredNurse.id,
          category: 'communication',
          criterion: 'Patient Communication Skills',
          order: 5,
        },
        {
          roleId: registeredNurse.id,
          category: 'communication',
          criterion: 'Team Collaboration',
          order: 6,
        },
        {
          roleId: registeredNurse.id,
          category: 'communication',
          criterion: 'Documentation Skills',
          order: 7,
        },
        // Professionalism
        {
          roleId: registeredNurse.id,
          category: 'professionalism',
          criterion: 'Professional Appearance',
          order: 8,
        },
        {
          roleId: registeredNurse.id,
          category: 'professionalism',
          criterion: 'Punctuality and Reliability',
          order: 9,
        },
        {
          roleId: registeredNurse.id,
          category: 'professionalism',
          criterion: 'Ethical Decision Making',
          order: 10,
        },
      );
    }

    // Doctor Templates (if exists)
    if (doctor) {
      templates.push(
        {
          roleId: doctor.id,
          category: 'technical_skills',
          criterion: 'Diagnostic Skills',
          order: 1,
        },
        {
          roleId: doctor.id,
          category: 'technical_skills',
          criterion: 'Treatment Planning',
          order: 2,
        },
        {
          roleId: doctor.id,
          category: 'communication',
          criterion: 'Patient Consultation Skills',
          order: 3,
        },
        {
          roleId: doctor.id,
          category: 'professionalism',
          criterion: 'Medical Ethics',
          order: 4,
        },
      );
    }

    // Convert the flat list of criteria into a template + items structure
    // New schema uses ScreeningTemplate and ScreeningTemplateItem
    // We create (or upsert) one template per role and then upsert its items
    let createdItemCount = 0;

    // group items by roleId
    const itemsByRole = templates.reduce(
      (acc: Record<string, typeof templates>, t) => {
        acc[t.roleId] = acc[t.roleId] || [];
        acc[t.roleId].push(t);
        return acc;
      },
      {} as Record<string, typeof templates>,
    );

    for (const roleId of Object.keys(itemsByRole)) {
      const role = roleId === registeredNurse?.id ? registeredNurse : doctor;
      const name = `${role?.name ?? 'Default'} Mock Interview Template`;

      const templateRecord = await prisma.screeningTemplate.upsert({
        where: { roleId_name: { roleId, name } },
        update: {
          isActive: true,
          description: `Auto-generated default template for ${role?.name ?? roleId}`,
        },
        create: {
          roleId,
          name,
          description: `Auto-generated default template for ${role?.name ?? roleId}`,
          isActive: true,
        },
      });

      // upsert items for this template
      for (const item of itemsByRole[roleId]) {
        await prisma.screeningTemplateItem.upsert({
          where: {
            templateId_category_criterion: {
              templateId: templateRecord.id,
              category: item.category,
              criterion: item.criterion,
            },
          },
          update: { order: item.order },
          create: {
            templateId: templateRecord.id,
            category: item.category,
            criterion: item.criterion,
            order: item.order,
          },
        });

        createdItemCount++;
      }
    }

    console.log(
      `✅ Screening templates seeded: ${createdItemCount} template items created/updated`,
    );
  } catch (error) {
    console.error('❌ Error seeding screening templates:', error);
    throw error;
  }
}

// (seedScreeningTemplates is implemented above)

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seed countries first
  await seedCountries();

  // Seed religions
  await seedReligions();

  // Seed states
  await seedStates();

  // Seed candidate statuses
  await seedCandidateStatus();

  // Seed candidate project statuses
  await seedCandidateProjectStatuses();

  // Project roles seeding removed
  // Seed healthcare roles catalog
  await seedRoleCatalog();
  await seedQualifications();
  await seedQualificationAliases();
  // seedRoleRecommendedQualifications depends on role slugs, disabled for now
  // await seedRoleRecommendedQualifications();

  // Seed system configuration
  await seedSystemConfig();

  // Seed CRE role and permissions
  await seedCRERole();

  // Seed screening interview templates
  await seedScreeningTemplates();

  // Seed candidate project workflow
  await seedCandidateProjectWorkflow();

  // Seed country document requirements
  await seedCountryDocuments(prisma);

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

    // Only assign eligible roles to default team (Team Lead and below)
    const eligibleRolesForTeamMembership = [
      'Team Lead',
      'Recruiter',
      'Documentation Executive',
      'Processing Executive',
    ];

    if (eligibleRolesForTeamMembership.includes(userData.role)) {
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
    `🎤 Interview Coordinator: +919876543223 / coordinator123 (coordinator@affiniks.com)`,
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
