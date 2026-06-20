import { PrismaClient } from '@prisma/client';

const gulfCountries = ['SA', 'OM', 'QA', 'AE', 'KW', 'BH'];

const gulfPlanKeys = [
  'offer_letter',
  'document_received',
  'hrd',
  'data_flow',
  'eligibility',
  'prometric',
  'council_registration',
  'document_attestation',
  'medical',
  'mofa_number',
  'medical_fitness',
  'biometrics',
  'visa',
  'emigration',
  'ticket',
];

const indiaPlanKeys = [
  'offer_letter',
  'document_received',
  'hrd',
  'document_attestation',
  'biometrics',
  'visa',
  'ticket',
];

export async function seedProcessingCountrySteps(prisma: PrismaClient) {
  console.log('🗺️ Seeding processing country steps...');

  // Build a lookup of templates by key
  const allKeys = Array.from(new Set([...gulfPlanKeys, ...indiaPlanKeys]));
  const templates = await prisma.processingStepTemplate.findMany({ where: { key: { in: allKeys } } });
  const templateByKey: Record<string, any> = {};
  for (const t of templates) templateByKey[t.key] = t;

  // Helper to seed a plan for a country
  async function seedPlan(countryCode: string, keys: string[]) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const template = templateByKey[key];
      if (!template) {
        throw new Error(
          `ProcessingStepTemplate with key '${key}' not found — run seedProcessingStepTemplates first`,
        );
      }

      await prisma.processingCountryStep.upsert({
        where: {
          countryCode_stepTemplateId: {
            countryCode,
            stepTemplateId: template.id,
          },
        },
        update: {
          order: i + 1,
          isRequired: true,
        },
        create: {
          countryCode,
          stepTemplateId: template.id,
          order: i + 1,
          isRequired: true,
        },
      });
    }
  }

  // Seed gulf countries with the full plan
  for (const countryCode of gulfCountries) {
    await seedPlan(countryCode, gulfPlanKeys);
  }

  // Seed India with a smaller subset
  await seedPlan('IN', indiaPlanKeys);

  console.log('✅ Processing country steps seeded');
}
