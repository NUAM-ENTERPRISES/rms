import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const projectRoles = [
  // Nursing Roles
  { name: 'Registered Nurse (RN)', category: 'Nursing' },
  { name: 'Licensed Practical Nurse (LPN)', category: 'Nursing' },
  { name: 'Nurse Practitioner (NP)', category: 'Nursing' },
  { name: 'Clinical Nurse Specialist', category: 'Nursing' },
  { name: 'Certified Nursing Assistant (CNA)', category: 'Nursing' },
  { name: 'ICU Nurse', category: 'Nursing' },
  { name: 'ER Nurse', category: 'Nursing' },
  { name: 'Pediatric Nurse', category: 'Nursing' },
  { name: 'Operating Room Nurse', category: 'Nursing' },
  { name: 'Neonatal Nurse', category: 'Nursing' },

  // Medical Doctors
  { name: 'General Physician', category: 'Medical' },
  { name: 'Cardiologist', category: 'Medical' },
  { name: 'Pediatrician', category: 'Medical' },
  { name: 'Surgeon', category: 'Medical' },
  { name: 'Anesthesiologist', category: 'Medical' },
  { name: 'Radiologist', category: 'Medical' },
  { name: 'Emergency Medicine Physician', category: 'Medical' },
  { name: 'Neurologist', category: 'Medical' },
  { name: 'Orthopedic Surgeon', category: 'Medical' },
  { name: 'Oncologist', category: 'Medical' },
  { name: 'Dermatologist', category: 'Medical' },
  { name: 'Gynecologist', category: 'Medical' },
  { name: 'Psychiatrist', category: 'Medical' },
  { name: 'Ophthalmologist', category: 'Medical' },
  { name: 'ENT Specialist', category: 'Medical' },

  // Allied Health
  { name: 'Medical Assistant', category: 'Support Staff' },
  { name: 'Phlebotomist', category: 'Support Staff' },
  { name: 'Medical Receptionist', category: 'Administrative' },
  { name: 'Medical Records Clerk', category: 'Administrative' },
  { name: 'Healthcare Administrator', category: 'Administrative' },
  { name: 'Case Manager', category: 'Care Coordination' },
  { name: 'Patient Care Coordinator', category: 'Care Coordination' },

  // Pharmacy
  { name: 'Pharmacy Technician', category: 'Pharmacy' },
  { name: 'Clinical Pharmacist', category: 'Pharmacy' },
  { name: 'Hospital Pharmacist', category: 'Pharmacy' },

  // Therapy
  { name: 'Physical Therapist (PT)', category: 'Therapy' },
  { name: 'Occupational Therapist (OT)', category: 'Therapy' },
  { name: 'Speech Therapist', category: 'Therapy' },
  { name: 'Respiratory Therapist', category: 'Therapy' },

  // Laboratory
  { name: 'Lab Technician', category: 'Laboratory' },
  { name: 'Medical Lab Scientist', category: 'Laboratory' },
  { name: 'Pathologist', category: 'Laboratory' },

  // Imaging/Radiology
  { name: 'Radiology Technician', category: 'Imaging' },
  { name: 'MRI Technician', category: 'Imaging' },
  { name: 'CT Scan Technician', category: 'Imaging' },
  { name: 'Ultrasound Technician', category: 'Imaging' },
  { name: 'X-Ray Technician', category: 'Imaging' },

  // Dental
  { name: 'Dental Hygienist', category: 'Dental' },
  { name: 'Dentist', category: 'Dental' },
  { name: 'Orthodontist', category: 'Dental' },
  { name: 'Dental Assistant', category: 'Dental' },

  // Mental Health
  { name: 'Mental Health Counselor', category: 'Mental Health' },
  { name: 'Clinical Psychologist', category: 'Mental Health' },
  { name: 'Social Worker', category: 'Mental Health' },

  // Emergency Services
  { name: 'Paramedic', category: 'Emergency Services' },
  { name: 'EMT (Emergency Medical Technician)', category: 'Emergency Services' },

  // Specialized Technicians
  { name: 'Surgical Technologist', category: 'Surgical' },
  { name: 'Dialysis Technician', category: 'Specialized' },
  { name: 'EKG Technician', category: 'Specialized' },
  { name: 'Nuclear Medicine Technologist', category: 'Specialized' },

  // Support Services
  { name: 'Patient Transporter', category: 'Support Services' },
  { name: 'Sterile Processing Technician', category: 'Support Services' },
  { name: 'Unit Secretary', category: 'Support Services' },
];

export async function seedProjectRoles() {
  console.log('🌱 Seeding project roles...');

  for (const role of projectRoles) {
    await prisma.projectRole.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  const count = await prisma.projectRole.count();
  console.log(`✅ Successfully seeded ${count} project roles`);
}

// Run if executed directly
if (require.main === module) {
  seedProjectRoles()
    .catch((e) => {
      console.error('❌ Error seeding project roles:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
