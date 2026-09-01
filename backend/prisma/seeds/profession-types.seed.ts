import { PrismaClient } from '@prisma/client';

const PROFESSION_TYPES = [
  {
    name: 'nurse',
    label: 'Nurse',
    description: 'Nursing and patient care roles',
    sector: 'HEALTHCARE',
    sortOrder: 1,
  },
  {
    name: 'doctor',
    label: 'Doctor',
    description: 'Physician and medical doctor roles',
    sector: 'HEALTHCARE',
    sortOrder: 2,
  },
  {
    name: 'technician',
    label: 'Technician',
    description: 'Allied health and technical support roles',
    sector: 'HEALTHCARE',
    sortOrder: 3,
  },
  {
    name: 'therapist',
    label: 'Therapist',
    description: 'Physical, respiratory, and rehabilitation therapy roles',
    sector: 'HEALTHCARE',
    sortOrder: 4,
  },
  {
    name: 'administration',
    label: 'Administration',
    description: 'Administrative and office operations roles',
    sector: 'NON_HEALTH_CARE',
    sortOrder: 10,
  },
  {
    name: 'engineering',
    label: 'Engineering',
    description: 'Engineering and technical infrastructure roles',
    sector: 'NON_HEALTH_CARE',
    sortOrder: 11,
  },
  {
    name: 'it',
    label: 'Information Technology',
    description: 'Software, systems, and information technology roles',
    sector: 'NON_HEALTH_CARE',
    sortOrder: 12,
  },
  {
    name: 'finance',
    label: 'Finance',
    description: 'Accounting, finance, and audit roles',
    sector: 'NON_HEALTH_CARE',
    sortOrder: 13,
  },
  {
    name: 'hospitality',
    label: 'Hospitality',
    description: 'Hospitality, food service, and guest experience roles',
    sector: 'NON_HEALTH_CARE',
    sortOrder: 14,
  },
  {
    name: 'education',
    label: 'Education',
    description: 'Teaching, training, and academic roles',
    sector: 'NON_HEALTH_CARE',
    sortOrder: 15,
  },
  {
    name: 'support',
    label: 'Support',
    description: 'Customer service and operational support roles',
    sector: 'NON_HEALTH_CARE',
    sortOrder: 16,
  },
  {
    name: 'human_resources',
    label: 'Human Resources',
    description: 'People operations, recruitment, and talent roles',
    sector: 'NON_HEALTH_CARE',
    sortOrder: 17,
  },
  {
    name: 'sales',
    label: 'Sales',
    description: 'Business development and sales roles',
    sector: 'NON_HEALTH_CARE',
    sortOrder: 18,
  },
  {
    name: 'marketing',
    label: 'Marketing',
    description: 'Marketing, communications, and brand roles',
    sector: 'NON_HEALTH_CARE',
    sortOrder: 19,
  },
  {
    name: 'customer_service',
    label: 'Customer Service',
    description: 'Customer support and service delivery roles',
    sector: 'NON_HEALTH_CARE',
    sortOrder: 20,
  },
] as const;

export async function seedProfessionTypes(prisma: PrismaClient) {
  console.log('Seeding profession types...');

  for (const professionType of PROFESSION_TYPES) {
    await prisma.professionType.upsert({
      where: { name: professionType.name },
      update: {
        label: professionType.label,
        description: professionType.description,
        sector: professionType.sector,
        sortOrder: professionType.sortOrder,
        isActive: true,
      },
      create: {
        name: professionType.name,
        label: professionType.label,
        description: professionType.description,
        sector: professionType.sector,
        sortOrder: professionType.sortOrder,
        isActive: true,
      },
    });
  }

  console.log('Profession types seeded');
}
