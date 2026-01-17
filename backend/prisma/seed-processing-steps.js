const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('🧭 Seeding processing step templates (quick script)...');

  const templates = [
    { key: 'offer_letter', label: 'Offer Letter', order: 1, hasDocuments: true },
    { key: 'hrd', label: 'HRD', order: 2, hasDocuments: true },
    { key: 'data_flow', label: 'Data Flow', order: 3, hasDocuments: true },
    { key: 'eligibility', label: 'Eligibility', order: 4, hasDocuments: false },
    { key: 'prometric', label: 'Prometric', order: 5, hasDocuments: false },
    { key: 'council_registration', label: 'Council Registration', order: 6, hasDocuments: false },
    { key: 'document_attestation', label: 'Document Attestation', order: 7, hasDocuments: true },
    { key: 'medical', label: 'Medical', order: 8, hasDocuments: true },
    { key: 'mofa_number', label: 'MOFA Number', order: 9, hasDocuments: false, parentKey: 'medical' },
    { key: 'medical_fitness', label: 'Medical Fitness', order: 10, hasDocuments: true, parentKey: 'medical' },
    { key: 'biometrics', label: 'Biometrics', order: 11, hasDocuments: true },
    { key: 'visa', label: 'Visa', order: 12, hasDocuments: true },
    { key: 'emigration', label: 'Emigration', order: 13, hasDocuments: false },
    { key: 'ticket', label: 'Ticket', order: 14, hasDocuments: false },
  ];

  try {
    for (const t of templates.filter((x) => !x.parentKey)) {
      await prisma.processingStepTemplate.upsert({
        where: { key: t.key },
        update: {
          label: t.label,
          order: t.order,
          hasDocuments: t.hasDocuments ?? true,
          isRequired: true,
        },
        create: {
          key: t.key,
          label: t.label,
          order: t.order,
          hasDocuments: t.hasDocuments ?? true,
          isRequired: true,
        },
      });
    }

    for (const t of templates.filter((x) => x.parentKey)) {
      const parent = await prisma.processingStepTemplate.findUnique({ where: { key: t.parentKey } });
      await prisma.processingStepTemplate.upsert({
        where: { key: t.key },
        update: {
          label: t.label,
          order: t.order,
          hasDocuments: t.hasDocuments ?? true,
          parentId: parent?.id,
        },
        create: {
          key: t.key,
          label: t.label,
          order: t.order,
          hasDocuments: t.hasDocuments ?? true,
          parentId: parent?.id,
        },
      });
    }

    console.log('✅ Processing step templates seeded (quick script)');
  } catch (err) {
    console.error('❌ Error seeding processing step templates:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
