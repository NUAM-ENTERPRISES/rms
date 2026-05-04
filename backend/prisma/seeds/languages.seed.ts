import { PrismaClient } from '@prisma/client';

const COMMON_LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ur', name: 'Urdu' },
];

export async function seedLanguages(prisma: PrismaClient) {
  for (const row of COMMON_LANGUAGES) {
    await prisma.language.upsert({
      where: { code: row.code },
      create: { code: row.code, name: row.name, isActive: true },
      update: { name: row.name, isActive: true },
    });
  }
}
