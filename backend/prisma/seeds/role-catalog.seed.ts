import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedRoleCatalog() {
  console.log('🌱 Seeding Role Departments & Role Catalog...');

  const departments = [
    {
      name: 'emergency',
      label: 'Emergency Department',
      shortName: 'ER',
      description: 'Urgent and trauma care',
      roles: [
        {
          name: 'emergency_staff_nurse',
          label: 'Emergency Staff Nurse',
          shortName: 'ER Nurse',
          type: 'nurse',
          description: 'Provides immediate nursing care to emergency patients',
        },
        {
          name: 'trauma_physician',
          label: 'Trauma Physician',
          shortName: 'Trauma MD',
          type: 'doctor',
          description: 'Handles severe trauma and emergency cases',
        },
      ],
    },
    {
      name: 'icu',
      label: 'Intensive Care Unit',
      shortName: 'ICU',
      description: 'Care for critically ill patients',
      roles: [
        {
          name: 'icu_staff_nurse',
          label: 'ICU Staff Nurse',
          shortName: 'ICU Nurse',
          type: 'nurse',
          description: 'Monitors and manages critically ill patients',
        },
        {
          name: 'intensivist',
          label: 'Intensivist',
          shortName: 'ICU Doctor',
          type: 'doctor',
          description: 'Specialist physician for critical care',
        },
      ],
    },
    {
      name: 'med_surg',
      label: 'Medical Surgical Unit',
      shortName: 'Med-Surg',
      description: 'General inpatient medical and surgical care',
      roles: [
        {
          name: 'med_surg_nurse',
          label: 'Medical-Surgical Nurse',
          shortName: 'Med-Surg RN',
          type: 'nurse',
          description: 'Provides care to general inpatient population',
        },
        {
          name: 'ward_physician',
          label: 'Ward Physician',
          shortName: 'Ward MD',
          type: 'doctor',
          description: 'Manages admitted patients',
        },
      ],
    },
    {
      name: 'pediatrics',
      label: 'Pediatrics',
      shortName: 'Peds',
      description: 'Care for infants and children',
      roles: [
        {
          name: 'pediatric_nurse',
          label: 'Pediatric Nurse',
          shortName: 'Peds Nurse',
          type: 'nurse',
          description: 'Provides nursing care to children',
        },
        {
          name: 'pediatrician',
          label: 'Pediatrician',
          shortName: 'Peds MD',
          type: 'doctor',
          description: 'Doctor specializing in child health',
        },
      ],
    },
    {
      name: 'ob_gyn',
      label: 'Obstetrics & Gynecology',
      shortName: 'OB/GYN',
      description: 'Maternity, labor and delivery care',
      roles: [
        {
          name: 'labor_delivery_nurse',
          label: 'Labor & Delivery Nurse',
          shortName: 'L&D Nurse',
          type: 'nurse',
          description: 'Supports mothers during childbirth',
        },
        {
          name: 'obstetrician',
          label: 'Obstetrician',
          shortName: 'OB Doctor',
          type: 'doctor',
          description: 'Manages pregnancy and delivery',
        },
      ],
    },
    {
      name: 'nicu',
      label: 'Neonatal ICU',
      shortName: 'NICU',
      description: 'Care for critically ill newborns',
      roles: [
        {
          name: 'nicu_nurse',
          label: 'NICU Nurse',
          shortName: 'NICU RN',
          type: 'nurse',
          description: 'Provides specialized neonatal care',
        },
        {
          name: 'neonatologist',
          label: 'Neonatologist',
          shortName: 'NICU Doctor',
          type: 'doctor',
          description: 'Specialist in newborn intensive care',
        },
      ],
    },
    {
      name: 'operating_room',
      label: 'Operating Room',
      shortName: 'OR',
      description: 'Surgical procedures',
      roles: [
        {
          name: 'scrub_nurse',
          label: 'Scrub Nurse',
          shortName: 'OR Nurse',
          type: 'nurse',
          description: 'Assists surgeons during operations',
        },
        {
          name: 'surgeon',
          label: 'Surgeon',
          shortName: 'OR Doctor',
          type: 'doctor',
          description: 'Performs surgical procedures',
        },
      ],
    },
    {
      name: 'cardiology',
      label: 'Cardiology / CCU',
      shortName: 'CCU',
      description: 'Heart and cardiac care',
      roles: [
        {
          name: 'cardiac_nurse',
          label: 'Cardiac Care Nurse',
          shortName: 'CCU Nurse',
          type: 'nurse',
          description: 'Monitors cardiac patients',
        },
        {
          name: 'cardiologist',
          label: 'Cardiologist',
          shortName: 'Heart Doctor',
          type: 'doctor',
          description: 'Specialist in heart diseases',
        },
      ],
    },
    {
      name: 'psychiatry',
      label: 'Psychiatry & Mental Health',
      shortName: 'Psych',
      description: 'Mental health and psychiatric care',
      roles: [
        {
          name: 'psychiatric_nurse',
          label: 'Psychiatric Nurse',
          shortName: 'Psych Nurse',
          type: 'nurse',
          description: 'Supports patients with mental illness',
        },
        {
          name: 'psychiatrist',
          label: 'Psychiatrist',
          shortName: 'Psych Doctor',
          type: 'doctor',
          description: 'Diagnoses and treats mental disorders',
        },
      ],
    },
    {
      name: 'rehabilitation',
      label: 'Rehabilitation Unit',
      shortName: 'Rehab',
      description: 'Physical and occupational rehabilitation',
      roles: [
        {
          name: 'physiotherapist',
          label: 'Physiotherapist',
          shortName: 'PT',
          type: 'other',
          description: 'Helps patients regain mobility',
        },
        {
          name: 'rehab_nurse',
          label: 'Rehabilitation Nurse',
          shortName: 'Rehab Nurse',
          type: 'nurse',
          description: 'Provides nursing care in rehabilitation',
        },
      ],
    },
    {
      name: 'palliative',
      label: 'Palliative Care / Hospice',
      shortName: 'Hospice',
      description: 'Comfort and end-of-life care',
      roles: [
        {
          name: 'palliative_nurse',
          label: 'Palliative Care Nurse',
          shortName: 'PC Nurse',
          type: 'nurse',
          description: 'Provides comfort-focused care',
        },
        {
          name: 'palliative_physician',
          label: 'Palliative Physician',
          shortName: 'PC Doctor',
          type: 'doctor',
          description: 'Manages pain and quality of life',
        },
      ],
    },
  ];

  for (const dept of departments) {
    const createdDepartment = await prisma.roleDepartment.upsert({
      where: { name: dept.name },
      update: {},
      create: {
        name: dept.name,
        label: dept.label,
        shortName: dept.shortName,
        description: dept.description,
      },
    });

    for (const role of dept.roles) {
      await prisma.roleCatalog.upsert({
        where: { name: role.name },
        update: {
          type: role.type,
        },
        create: {
          name: role.name,
          label: role.label,
          shortName: role.shortName,
          type: role.type,
          description: role.description,
          roleDepartmentId: createdDepartment.id,
        },
      });
    }
  }

  console.log('✅ Role Departments & Role Catalog seeded successfully!');
}

// Run if executed directly
if (require.main === module) {
  seedRoleCatalog()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
