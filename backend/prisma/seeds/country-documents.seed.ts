import { PrismaClient } from '@prisma/client';
import { DOCUMENT_TYPE } from '../../src/common/constants/document-types';

export async function seedCountryDocuments(prisma: PrismaClient) {
  const saudiDocs = [
    { docType: DOCUMENT_TYPE.PASSPORT_COVER_BIO, label: 'Passport Cover & Bio Page', mandatory: true },
    { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE, label: 'Registration Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE, label: 'Experience Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.SAUDI_PROMETRIC, label: 'Saudi Council / Prometric Result', mandatory: true },
    { docType: DOCUMENT_TYPE.DATAFLOW_REPORT, label: 'Dataflow Report', mandatory: true },
    { docType: DOCUMENT_TYPE.PCC, label: 'Police Clearance Certificate (PCC)', mandatory: true },
    { docType: DOCUMENT_TYPE.MEDICAL_FITNESS, label: 'Medical Fitness Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.PASSPORT_PHOTO, label: 'Passport Size Photo (White Background)', mandatory: true },
  ];

  const omanDocs = [
    { docType: DOCUMENT_TYPE.PASSPORT, label: 'Passport', mandatory: true },
    { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.MOH_PROMETRIC, label: 'MOH License / Prometric', mandatory: true },
    { docType: DOCUMENT_TYPE.EXPERIENCE_LETTERS, label: 'Experience Letters', mandatory: true },
    { docType: DOCUMENT_TYPE.PCC, label: 'PCC', mandatory: true },
  ];

  const qatarDocs = [
    { docType: DOCUMENT_TYPE.PASSPORT, label: 'Passport', mandatory: true },
    { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.QCHP_PROMETRIC, label: 'QCHP Evaluation / Prometric', mandatory: true },
    { docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATES, label: 'Experience Certificates', mandatory: true },
    { docType: DOCUMENT_TYPE.PCC, label: 'PCC', mandatory: true },
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

  // --- Global HRD Documents ---
  // Seed global HRD requirements mapped to processing step template 'hrd'
  const hrdTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'hrd' } });
  if (!hrdTemplate) {
    console.warn("ProcessingStepTemplate with key='hrd' not found — skipping HRD global seed");
  } else {
    // Ensure sentinel global country exists for 'ALL' to attach global rules
    await prisma.country.upsert({
      where: { code: 'ALL' },
      update: { name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
      create: { code: 'ALL', name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
    });

    const hrdDocs = [
      { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
      { docType: DOCUMENT_TYPE.TRANSCRIPT, label: 'Academic Transcript / Mark Sheet', mandatory: true },
      { docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE, label: 'Experience Certificate(s)', mandatory: true },
      { docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE, label: 'Professional Registration (Nursing / Council / Trade)', mandatory: true },
      { docType: DOCUMENT_TYPE.PASSPORT_COPY, label: 'Passport Copy', mandatory: true },
      { docType: DOCUMENT_TYPE.PASSPORT_PHOTO, label: 'Passport Size Photo', mandatory: true },
      { docType: DOCUMENT_TYPE.NAME_CHANGE_AFFIDAVIT, label: 'Name Change Affidavit', mandatory: false },
    ];

    for (const doc of hrdDocs) {
      await prisma.countryDocumentRequirement.upsert({
        where: {
          countryCode_docType: {
            countryCode: 'ALL',
            docType: doc.docType,
          },
        },
        update: {
          mandatory: doc.mandatory,
          label: doc.label ?? doc.docType,
          processingStepTemplateId: hrdTemplate.id,
        },
        create: {
          countryCode: 'ALL',
          docType: doc.docType,
          label: doc.label ?? doc.docType,
          mandatory: doc.mandatory,
          processingStepTemplateId: hrdTemplate.id,
        },
      });
    }
  }

  console.log('Country document requirements seeded successfully.');
}
