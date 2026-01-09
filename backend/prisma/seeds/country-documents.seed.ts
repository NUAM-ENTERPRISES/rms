import { PrismaClient } from '@prisma/client';

export async function seedCountryDocuments(prisma: PrismaClient) {
  const saudiDocs = [
    { docType: 'Passport Cover & Bio Page', mandatory: true },
    { docType: 'Degree Certificate', mandatory: true },
    { docType: 'Registration Certificate', mandatory: true },
    { docType: 'Experience Certificate', mandatory: true },
    { docType: 'Saudi Council/Prometric Result', mandatory: true },
    { docType: 'Dataflow Report', mandatory: true },
    { docType: 'Police Clearance Certificate (PCC)', mandatory: true },
    { docType: 'Medical Fitness Certificate', mandatory: true },
    { docType: 'Passport Size Photo (White Background)', mandatory: true },
  ];

  const omanDocs = [
    { docType: 'Passport', mandatory: true },
    { docType: 'Degree', mandatory: true },
    { docType: 'MOH License/Prometric', mandatory: true },
    { docType: 'Experience Letters', mandatory: true },
    { docType: 'PCC', mandatory: true },
  ];

  const qatarDocs = [
    { docType: 'Passport', mandatory: true },
    { docType: 'Degree Certificate', mandatory: true },
    { docType: 'QCHP Evaluation/Prometric', mandatory: true },
    { docType: 'Experience Certificates', mandatory: true },
    { docType: 'PCC', mandatory: true },
  ];

  const data = [
    { countryCode: 'SA', docs: saudiDocs },
    { countryCode: 'OM', docs: omanDocs },
    { countryCode: 'QA', docs: qatarDocs },
  ];

  console.log('Seeding country document requirements...');

  for (const item of data) {
    for (const doc of item.docs) {
      await prisma.countryDocumentRequirement.upsert({
        where: {
          countryCode_docType: {
            countryCode: item.countryCode,
            docType: doc.docType,
          },
        },
        update: {
          mandatory: doc.mandatory,
        },
        create: {
          countryCode: item.countryCode,
          docType: doc.docType,
          mandatory: doc.mandatory,
        },
      });
    }
  }

  console.log('Country document requirements seeded successfully.');
}
