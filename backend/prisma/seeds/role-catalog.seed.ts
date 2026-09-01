import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedRoleCatalog() {
  console.log('🌱 Seeding Role Departments & Role Catalog...');

  const professionTypes = await prisma.professionType.findMany({
    select: { id: true, name: true },
  });
  const professionTypeIdByName = new Map(
    professionTypes.map((pt) => [pt.name, pt.id]),
  );

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
        {
          name: 'emergency_technician',
          label: 'Emergency Technician',
          shortName: 'Emergency Tech',
          type: 'technician',
          description: 'Technical support role for Emergency',
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
        {
          name: 'icu_technician',
          label: 'Icu Technician',
          shortName: 'Icu Tech',
          type: 'technician',
          description: 'Technical support role for Icu',
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
        {
          name: 'medical_technician',
          label: 'Medical Technician',
          shortName: 'Med Tech',
          type: 'technician',
          description:
            'Supports clinical workflows with technical nursing assistance',
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
        {
          name: 'pediatrics_technician',
          label: 'Pediatrics Technician',
          shortName: 'Pediatrics Tech',
          type: 'technician',
          description: 'Technical support role for Pediatrics',
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
        {
          name: 'ob_gyn_technician',
          label: 'Ob Gyn Technician',
          shortName: 'Ob Tech',
          type: 'technician',
          description: 'Technical support role for Ob Gyn',
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
        {
          name: 'nicu_technician',
          label: 'Nicu Technician',
          shortName: 'Nicu Tech',
          type: 'technician',
          description: 'Technical support role for Nicu',
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
        {
          name: 'operating_room_technician',
          label: 'Operating Room Technician',
          shortName: 'Operating Tech',
          type: 'technician',
          description: 'Technical support role for Operating Room',
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
        {
          name: 'cardiology_technician',
          label: 'Cardiology Technician',
          shortName: 'Cardiology Tech',
          type: 'technician',
          description: 'Technical support role for Cardiology',
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
        {
          name: 'psychiatry_technician',
          label: 'Psychiatry Technician',
          shortName: 'Psychiatry Tech',
          type: 'technician',
          description: 'Technical support role for Psychiatry',
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
          type: 'therapist',
          description: 'Helps patients regain mobility',
        },
        {
          name: 'rehab_nurse',
          label: 'Rehabilitation Nurse',
          shortName: 'Rehab Nurse',
          type: 'nurse',
          description: 'Provides nursing care in rehabilitation',
        },
        {
          name: 'rehabilitation_technician',
          label: 'Rehabilitation Technician',
          shortName: 'Rehabilitation Tech',
          type: 'technician',
          description: 'Technical support role for Rehabilitation',
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
        {
          name: 'palliative_technician',
          label: 'Palliative Technician',
          shortName: 'Palliative Tech',
          type: 'technician',
          description: 'Technical support role for Palliative',
        },
      ],
    },
  ];

  const additionalDepartments = [
    {
      name: 'anesthesia',
      label: 'Anesthesia',
      shortName: 'Anesthesia',
      description: 'Anesthesia and perioperative care',
      roles: [
        ['anesthesia_nurse', 'Anesthesia Nurse', 'nurse'],
        ['anesthesiologist', 'Anesthesiologist', 'doctor'],
        ['anesthesia_technician', 'Anesthesia Technician', 'technician'],
      ],
    },
    {
      name: 'dialysis',
      label: 'Dialysis Unit',
      shortName: 'Dialysis',
      description: 'Renal dialysis and treatment',
      roles: [
        ['dialysis_nurse', 'Dialysis Nurse', 'nurse'],
        ['nephrologist', 'Nephrologist', 'doctor'],
        ['dialysis_technician', 'Dialysis Technician', 'technician'],
      ],
    },
    {
      name: 'laboratory',
      label: 'Laboratory',
      shortName: 'Lab',
      description: 'Medical laboratory diagnostics',
      roles: [
        ['laboratory_nurse', 'Laboratory Nurse', 'nurse'],
        ['laboratory_physician', 'Laboratory Physician', 'doctor'],
        [
          'medical_laboratory_technician',
          'Medical Laboratory Technician',
          'technician',
        ],
      ],
    },
    {
      name: 'radiology',
      label: 'Radiology and Imaging',
      shortName: 'Radiology',
      description: 'Diagnostic imaging services',
      roles: [
        ['radiology_nurse', 'Radiology Nurse', 'nurse'],
        ['radiologist', 'Radiologist', 'doctor'],
        ['radiographer', 'Radiographer', 'technician'],
      ],
    },
    {
      name: 'orthopedics',
      label: 'Orthopedics',
      shortName: 'Ortho',
      description: 'Musculoskeletal and orthopedic care',
      roles: [
        ['orthopedic_nurse', 'Orthopedic Nurse', 'nurse'],
        ['orthopedic_surgeon', 'Orthopedic Surgeon', 'doctor'],
        ['orthopedic_technician', 'Orthopedic Technician', 'technician'],
      ],
    },
    {
      name: 'oncology',
      label: 'Oncology',
      shortName: 'Oncology',
      description: 'Cancer diagnosis and treatment',
      roles: [
        ['oncology_nurse', 'Oncology Nurse', 'nurse'],
        ['oncologist', 'Oncologist', 'doctor'],
        ['oncology_technician', 'Oncology Technician', 'technician'],
      ],
    },
    {
      name: 'neurology',
      label: 'Neurology',
      shortName: 'Neuro',
      description: 'Neurological care and treatment',
      roles: [
        ['neurology_nurse', 'Neurology Nurse', 'nurse'],
        ['neurologist', 'Neurologist', 'doctor'],
        ['neurology_technician', 'Neurology Technician', 'technician'],
      ],
    },
    {
      name: 'respiratory',
      label: 'Respiratory Care',
      shortName: 'Respiratory',
      description: 'Respiratory therapy and pulmonary care',
      roles: [
        ['respiratory_nurse', 'Respiratory Nurse', 'nurse'],
        ['pulmonologist', 'Pulmonologist', 'doctor'],
        ['respiratory_therapist', 'Respiratory Therapist', 'technician'],
      ],
    },
    {
      name: 'pharmacy',
      label: 'Pharmacy',
      shortName: 'Pharmacy',
      description: 'Medication management and pharmaceutical services',
      roles: [
        ['pharmacy_nurse', 'Pharmacy Nurse', 'nurse'],
        ['clinical_pharmacist', 'Clinical Pharmacist', 'technician'],
        ['pharmacy_assistant', 'Pharmacy Assistant', 'technician'],
      ],
    },
    {
      name: 'gastroenterology',
      label: 'Gastroenterology',
      shortName: 'Gastro',
      description: 'Digestive system diagnosis and treatment',
      roles: [
        ['gastroenterology_nurse', 'Gastroenterology Nurse', 'nurse'],
        ['gastroenterologist', 'Gastroenterologist', 'doctor'],
        [
          'gastroenterology_technician',
          'Gastroenterology Technician',
          'technician',
        ],
      ],
    },
    {
      name: 'endocrinology',
      label: 'Endocrinology',
      shortName: 'Endocrinology',
      description: 'Hormonal and metabolic care',
      roles: [
        ['endocrinology_nurse', 'Endocrinology Nurse', 'nurse'],
        ['endocrinologist', 'Endocrinologist', 'doctor'],
        ['endocrinology_technician', 'Endocrinology Technician', 'technician'],
      ],
    },
    {
      name: 'dermatology',
      label: 'Dermatology',
      shortName: 'Dermatology',
      description: 'Skin, hair, and nail care',
      roles: [
        ['dermatology_nurse', 'Dermatology Nurse', 'nurse'],
        ['dermatologist', 'Dermatologist', 'doctor'],
        ['dermatology_technician', 'Dermatology Technician', 'technician'],
      ],
    },
    {
      name: 'ent',
      label: 'Ear, Nose and Throat',
      shortName: 'ENT',
      description: 'Otolaryngology diagnosis and treatment',
      roles: [
        ['ent_nurse', 'ENT Nurse', 'nurse'],
        ['otolaryngologist', 'Otolaryngologist', 'doctor'],
        ['ent_technician', 'ENT Technician', 'technician'],
      ],
    },
    {
      name: 'urology',
      label: 'Urology',
      shortName: 'Urology',
      description: 'Urinary tract and urological care',
      roles: [
        ['urology_nurse', 'Urology Nurse', 'nurse'],
        ['urologist', 'Urologist', 'doctor'],
        ['urology_technician', 'Urology Technician', 'technician'],
      ],
    },
    {
      name: 'family_medicine',
      label: 'Family Medicine',
      shortName: 'Family Medicine',
      description: 'Primary and family healthcare',
      roles: [
        ['family_medicine_nurse', 'Family Medicine Nurse', 'nurse'],
        ['family_medicine_physician', 'Family Medicine Physician', 'doctor'],
        [
          'family_medicine_technician',
          'Family Medicine Technician',
          'technician',
        ],
      ],
    },
    {
      name: 'internal_medicine',
      label: 'Internal Medicine',
      shortName: 'Internal Medicine',
      description: 'Adult medical diagnosis and treatment',
      roles: [
        ['internal_medicine_nurse', 'Internal Medicine Nurse', 'nurse'],
        [
          'internal_medicine_physician',
          'Internal Medicine Physician',
          'doctor',
        ],
        [
          'internal_medicine_technician',
          'Internal Medicine Technician',
          'technician',
        ],
      ],
    },
    {
      name: 'neonatology',
      label: 'Neonatology',
      shortName: 'Neonatology',
      description: 'Medical care for newborns',
      roles: [
        ['neonatal_nurse', 'Neonatal Nurse', 'nurse'],
        ['neonatology_physician', 'Neonatology Physician', 'doctor'],
        ['neonatal_technician', 'Neonatal Technician', 'technician'],
      ],
    },
    {
      name: 'administration',
      label: 'Administration',
      shortName: 'Admin',
      description: 'Administrative and office operations',
      roles: [
        ['administrative_officer', 'Administrative Officer', 'administration'],
        ['office_manager', 'Office Manager', 'administration'],
        ['executive_assistant', 'Executive Assistant', 'administration'],
      ],
    },
    {
      name: 'finance',
      label: 'Finance and Accounts',
      shortName: 'Finance',
      description: 'Financial operations, accounting, and audit',
      roles: [
        ['accountant', 'Accountant', 'finance'],
        ['finance_manager', 'Finance Manager', 'finance'],
        ['internal_auditor', 'Internal Auditor', 'finance'],
      ],
    },
    {
      name: 'human_resources',
      label: 'Human Resources',
      shortName: 'HR',
      description: 'Recruitment, people operations, and talent management',
      roles: [
        ['hr_officer', 'HR Officer', 'human_resources'],
        [
          'talent_acquisition_specialist',
          'Talent Acquisition Specialist',
          'human_resources',
        ],
        [
          'learning_development_specialist',
          'Learning and Development Specialist',
          'human_resources',
        ],
      ],
    },
    {
      name: 'information_technology',
      label: 'Information Technology',
      shortName: 'IT',
      description: 'Software, systems, infrastructure, and data',
      roles: [
        ['software_engineer', 'Software Engineer', 'it'],
        ['systems_administrator', 'Systems Administrator', 'it'],
        ['data_analyst', 'Data Analyst', 'it'],
      ],
    },
    {
      name: 'engineering',
      label: 'Engineering',
      shortName: 'Engineering',
      description: 'Engineering design, maintenance, and infrastructure',
      roles: [
        ['civil_engineer', 'Civil Engineer', 'engineering'],
        ['electrical_engineer', 'Electrical Engineer', 'engineering'],
        ['maintenance_engineer', 'Maintenance Engineer', 'engineering'],
      ],
    },
    {
      name: 'sales',
      label: 'Sales and Business Development',
      shortName: 'Sales',
      description: 'Sales, partnerships, and business development',
      roles: [
        ['sales_executive', 'Sales Executive', 'sales'],
        [
          'business_development_manager',
          'Business Development Manager',
          'sales',
        ],
        ['account_manager', 'Account Manager', 'sales'],
      ],
    },
    {
      name: 'marketing',
      label: 'Marketing and Communications',
      shortName: 'Marketing',
      description: 'Marketing, communications, and brand management',
      roles: [
        ['marketing_executive', 'Marketing Executive', 'marketing'],
        [
          'digital_marketing_specialist',
          'Digital Marketing Specialist',
          'marketing',
        ],
        ['content_coordinator', 'Content Coordinator', 'marketing'],
      ],
    },
    {
      name: 'customer_support',
      label: 'Customer Support',
      shortName: 'Support',
      description: 'Customer service and support operations',
      roles: [
        [
          'customer_support_executive',
          'Customer Support Executive',
          'customer_service',
        ],
        ['call_center_agent', 'Call Center Agent', 'customer_service'],
        ['support_team_lead', 'Support Team Lead', 'customer_service'],
      ],
    },
    {
      name: 'education',
      label: 'Education and Training',
      shortName: 'Education',
      description: 'Teaching, training, and academic services',
      roles: [
        ['instructor', 'Instructor', 'education'],
        ['clinical_trainer', 'Clinical Trainer', 'education'],
        ['academic_coordinator', 'Academic Coordinator', 'education'],
      ],
    },
    {
      name: 'hospitality',
      label: 'Hospitality and Facilities',
      shortName: 'Hospitality',
      description: 'Hospitality, food service, and facility operations',
      roles: [
        ['hospitality_supervisor', 'Hospitality Supervisor', 'hospitality'],
        ['food_service_manager', 'Food Service Manager', 'hospitality'],
        ['facilities_coordinator', 'Facilities Coordinator', 'hospitality'],
      ],
    },
  ].map((department) => ({
    ...department,
    roles: department.roles.map(([name, label, type]) => ({
      name,
      label,
      shortName: label,
      type,
      description: `${label} role in ${department.label}`,
    })),
  }));

  departments.push(...additionalDepartments);

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
      const professionTypeId = professionTypeIdByName.get(role.type) ?? null;

      await prisma.roleCatalog.upsert({
        where: { name: role.name },
        update: {
          professionTypeId,
          roleDepartmentId: createdDepartment.id,
          label: role.label,
          shortName: role.shortName,
          description: role.description,
        },
        create: {
          name: role.name,
          label: role.label,
          shortName: role.shortName,
          description: role.description,
          roleDepartmentId: createdDepartment.id,
          professionTypeId,
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
