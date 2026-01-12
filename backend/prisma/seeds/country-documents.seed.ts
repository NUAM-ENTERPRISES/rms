import { PrismaClient } from '@prisma/client';

export async function seedCountryDocuments(prisma: PrismaClient) {
  const saudiDocs = [
    { docType: 'passport_cover_bio', label: 'Passport Cover & Bio Page', mandatory: true },
    { docType: 'degree_certificate', label: 'Degree Certificate', mandatory: true },
    { docType: 'registration_certificate', label: 'Registration Certificate', mandatory: true },
    { docType: 'experience_certificate', label: 'Experience Certificate', mandatory: true },
    { docType: 'saudi_prometric', label: 'Saudi Council / Prometric Result', mandatory: true },
    { docType: 'dataflow_report', label: 'Dataflow Report', mandatory: true },
    { docType: 'pcc', label: 'Police Clearance Certificate (PCC)', mandatory: true },
    { docType: 'medical_fitness', label: 'Medical Fitness Certificate', mandatory: true },
    { docType: 'passport_photo', label: 'Passport Size Photo (White Background)', mandatory: true },
  ];

  const omanDocs = [
    { docType: 'passport', label: 'Passport', mandatory: true },
    { docType: 'degree_certificate', label: 'Degree Certificate', mandatory: true },
    { docType: 'moh_prometric', label: 'MOH License / Prometric', mandatory: true },
    { docType: 'experience_letters', label: 'Experience Letters', mandatory: true },
    { docType: 'pcc', label: 'PCC', mandatory: true },
  ];

  const qatarDocs = [
    { docType: 'passport', label: 'Passport', mandatory: true },
    { docType: 'degree_certificate', label: 'Degree Certificate', mandatory: true },
    { docType: 'qchp_prometric', label: 'QCHP Evaluation / Prometric', mandatory: true },
    { docType: 'experience_certificates', label: 'Experience Certificates', mandatory: true },
    { docType: 'pcc', label: 'PCC', mandatory: true },
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
          label: doc.label ?? doc.docType,
        },
        create: {
          countryCode: item.countryCode,
          docType: doc.docType,
          label: doc.label ?? doc.docType,
          mandatory: doc.mandatory,
        },
      });
    }
  }

  console.log('Country document requirements seeded successfully.');
}
