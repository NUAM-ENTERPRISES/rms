import { PrismaClient } from '@prisma/client';

const PROFESSION_TYPES = [
  {
    name: 'nurse',
    label: 'Nurse',
    description: 'Nursing and patient care roles',
    sortOrder: 1,
  },
  {
    name: 'doctor',
    label: 'Doctor',
    description: 'Physician and medical doctor roles',
    sortOrder: 2,
  },
  {
    name: 'technician',
    label: 'Technician',
    description: 'Allied health and technical support roles',
    sortOrder: 3,
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
        sortOrder: professionType.sortOrder,
        isActive: true,
      },
      create: {
        name: professionType.name,
        label: professionType.label,
        description: professionType.description,
        sortOrder: professionType.sortOrder,
        isActive: true,
      },
    });
  }

  console.log('Profession types seeded');
}
