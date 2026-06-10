import { PrismaClient } from '@prisma/client';
import { seedProfessionTypes } from './seeds/profession-types.seed';
import { seedUserProfessionScopes } from './seeds/user-profession-scopes.seed';

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
    description: 'Manager - Full system access',
    permissions: ['*'],
  },
  {
    name: 'Processing Manager',
    description: 'Processing Manager - Manager access focused on processing',
    permissions: [
      'read:processing',
      'write:processing',
      'manage:processing',
      'transfer:processing',
      'read:candidates',
      'write:candidates',
      'manage:candidates',
      'approve:candidates',
      'reject:candidates',
      'shortlist:candidates',
      'read:projects',
      'write:projects',
      'manage:projects',
      'read:documents',
      'write:documents',
      'verify:documents',
      'manage:documents',
      'request:resubmission',
      'read:interviews',
      'write:interviews',
      'schedule:interviews',
      'read:screenings',
      'read:interview_templates',
      'read:training',
      'read:users',
      'read:teams',
      'read:assigned_teams',
      'read:analytics',
      'read:roles',
    ],
  },
  {
    name: 'Recruiter Manager',
    description:
      'Recruiter Manager - Manager scope without processing and administration',
    permissions: [
      'read:projects',
      'write:projects',
      'manage:projects',
      'read:candidates',
      'write:candidates',
      'manage:candidates',
      'read:assigned_candidates',
      'write:assigned_candidates',
      'nominate:candidates',
      'approve:candidates',
      'reject:candidates',
      'shortlist:candidates',
      'transfer:candidates',
      'transfer_back:candidates',
      'manage:recruiters',
      'read:recruiters',
      'write:recruiters',
      'read:teams',
      'write:teams',
      'manage:teams',
      'read:assigned_teams',
      'write:assigned_teams',
      'read:clients',
      'write:clients',
      'manage:clients',
      'read:documents',
      'write:documents',
      'verify:documents',
      'manage:documents',
      'request:resubmission',
      'read:interviews',
      'write:interviews',
      'manage:interviews',
      'schedule:interviews',
      'read:screenings',
      'read:interview_templates',
      'read:training',
      'read:analytics',
      'read:admin-dashboard',
      'read:users',
      'manage:users',
      'read:system_config',
      'read:roles',
      'read:operations_call_history',
    ],
  },
  {
    name: 'Team Head',
    description: 'Team Head - Access to assigned teams',
    permissions: [
      'read:assigned_teams',
      'write:assigned_teams',
      'manage:candidates',
      'read:operations_call_history',
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
      'read:agents',
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
      'shortlist:candidates',
      'read:operations_call_history',
      'read:teams',
      'read:interviews',
      'schedule:interviews',
      'manage:recruiters',
      'read:documents',
      'transfer:candidates',
      'transfer_back:candidates',
      'read:screenings',
      'read:interview_templates',
      'read:training',
      'read:agents',
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
      'shortlist:candidates',
      'read:screenings',
      'read:interview_templates',
      'read:training',
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
      'shortlist:candidates',
      'read:candidates',
      'write:candidates',
      'read:projects',
      'read:interviews',
      'read:screenings',
      'read:interview_templates',
      'read:training',
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
      'read:documents',
      'write:documents',
      'verify:documents',
      'manage:documents',
      'request:resubmission',
      'read:screenings',
      'read:interview_templates',
      'read:training',
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
      'read:interview_templates',
      'read:training',
      'read:documents',
    ],
  },
  {
    name: 'Screening Trainer',
    description: 'Screening Trainer - Manages screenings and training',
    permissions: [
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
      'read:candidates',
      'read:projects',
    ],
  },
  {
    name: 'Agent Coordinator',
    description:
      'Agent Coordinator - Manages external agents and agent-sourced candidates',
    permissions: [
      'read:candidates',
      'read:assigned_candidates',
      'write:candidates',
      'manage:candidates',
      'nominate:candidates',
      'read:projects',
      // Project board parity with Recruiter: assign, send for verification, documents
      'read:documents',
      'write:documents',
      'verify:documents',
      'manage:documents',
      'request:resubmission',
      'approve:candidates',
      'reject:candidates',
      'shortlist:candidates',
      'read:screenings',
      'read:interview_templates',
      'read:training',
      'read:agents',
      'write:agents',
      'edit:agents',
      'delete:agents',
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
  'shortlist:candidates',
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
  'transfer:processing',

  // Recruiter management
  'manage:recruiters',
  'read:recruiters',
  'write:recruiters',

  // CRE (Customer Relationship Executive) management
  'read:cre',
  'write:cre',
  'manage:cre',
  'assign:cre',
  'handle:rnr_candidates',
  'read:operations_call_history',

  // Role management
  'read:roles',
  'write:roles',
  'manage:roles',

  // Agent management
  'read:agents',
  'write:agents',
  'edit:agents',
  'delete:agents',

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
  // Admin dashboard
  'read:admin-dashboard',
  // System config (RNR/HRD) - admin only
  'read:system_config',
  'manage:system_config',

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
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('Unique constraint')) {
            console.warn(
              `Warning: Could not create alias "${aliasData.alias}":`,
              errorMessage,
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
    'Deployed',
    'Call Back',
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
  await seedProfessionTypes(prisma);
  await seedUserProfessionScopes(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
