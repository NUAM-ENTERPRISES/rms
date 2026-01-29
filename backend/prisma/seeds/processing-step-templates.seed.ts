import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedProcessingStepTemplates() {
  console.log('🧭 Seeding processing step templates...');

  const templates: Array<{ key: string; label: string; order: number; hasDocuments?: boolean; parentKey?: string }> = [
    { key: 'offer_letter', label: 'Offer Letter', order: 1, hasDocuments: true },
    { key: 'document_received', label: 'Documents Received', order: 2, hasDocuments: true },
    { key: 'hrd', label: 'HRD', order: 3, hasDocuments: true },
    { key: 'data_flow', label: 'Data Flow', order: 4, hasDocuments: true },
    { key: 'eligibility', label: 'Eligibility', order: 5, hasDocuments: false },
    { key: 'prometric', label: 'Prometric', order: 6, hasDocuments: false },
    { key: 'council_registration', label: 'Council Registration', order: 7, hasDocuments: false },
    { key: 'document_attestation', label: 'Document Attestation', order: 8, hasDocuments: true },
    { key: 'medical', label: 'Medical', order: 9, hasDocuments: true },
    { key: 'biometrics', label: 'Biometrics', order: 10, hasDocuments: true },
    { key: 'visa', label: 'Visa', order: 11, hasDocuments: true },
    { key: 'emigration', label: 'Emigration', order: 12, hasDocuments: false },
    { key: 'ticket', label: 'Ticket', order: 13, hasDocuments: true },
  ];

  // First create or upsert parents without parentId
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

  // Then create children and link parentId
  for (const t of templates.filter((x) => x.parentKey)) {
    const parent = await prisma.processingStepTemplate.findUnique({ where: { key: (t as any).parentKey } });
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

  console.log('✅ Processing step templates seeded');
}
