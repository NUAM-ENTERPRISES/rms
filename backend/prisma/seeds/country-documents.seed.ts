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
    { docType: DOCUMENT_TYPE.PASSPORT_COPY, label: 'Passport Copy', mandatory: true },
    { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.MOH_PROMETRIC, label: 'MOH License / Prometric', mandatory: true },
    { docType: DOCUMENT_TYPE.EXPERIENCE_LETTERS, label: 'Experience Letters', mandatory: true },
    { docType: DOCUMENT_TYPE.PCC, label: 'PCC', mandatory: true },
  ];

  const qatarDocs = [
    { docType: DOCUMENT_TYPE.PASSPORT_COPY, label: 'Passport Copy', mandatory: true },
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
      // find existing legacy entries (processingStepTemplateId = null)
      const existing = await prisma.countryDocumentRequirement.findFirst({
        where: { countryCode: item.countryCode, docType: doc.docType, processingStepTemplateId: null },
      });
      if (existing) {
        await prisma.countryDocumentRequirement.update({ where: { id: existing.id }, data: { mandatory: doc.mandatory, label: doc.label ?? doc.docType } });
      } else {
        await prisma.countryDocumentRequirement.create({ data: { countryCode: item.countryCode, docType: doc.docType, label: doc.label ?? doc.docType, mandatory: doc.mandatory } });
      }
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
          countryCode_docType_processingStepTemplateId: {
            countryCode: 'ALL',
            docType: doc.docType,
            processingStepTemplateId: hrdTemplate.id,
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

  // --- Global Data Flow Documents ---
  // Seed global Data Flow requirements mapped to processing step template 'data_flow'
  const dataFlowTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'data_flow' } });
  if (!dataFlowTemplate) {
    console.warn("ProcessingStepTemplate with key='data_flow' not found — skipping Data Flow global seed");
  } else {
    const dataFlowDocs = [
      { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
      { docType: DOCUMENT_TYPE.TRANSCRIPT, label: 'Academic Transcript / Mark Sheet', mandatory: true },
      { docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE, label: 'Experience Certificate(s)', mandatory: true },
      { docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE, label: 'Professional Registration (Nursing / Council / Trade)', mandatory: true },
      { docType: DOCUMENT_TYPE.PASSPORT_COPY, label: 'Passport Copy', mandatory: true },
    ];

    for (const doc of dataFlowDocs) {
      await prisma.countryDocumentRequirement.upsert({
        where: {
          countryCode_docType_processingStepTemplateId: {
            countryCode: 'ALL',
            docType: doc.docType,
            processingStepTemplateId: dataFlowTemplate.id,
          },
        },
        update: {
          mandatory: doc.mandatory,
          label: doc.label ?? doc.docType,
          processingStepTemplateId: dataFlowTemplate.id,
        },
        create: {
          countryCode: 'ALL',
          docType: doc.docType,
          label: doc.label ?? doc.docType,
          mandatory: doc.mandatory,
          processingStepTemplateId: dataFlowTemplate.id,
        },
      });
    }
  }

  // --- Global Prometric Documents ---
  // Seed global Prometric output requirement mapped to processing step template 'prometric'
  const prometricTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'prometric' } });
  if (!prometricTemplate) {
    console.warn("ProcessingStepTemplate with key='prometric' not found — skipping Prometric global seed");
  } else {
    const prometricDocs = [
      { docType: DOCUMENT_TYPE.PROMETRIC_RESULT, label: 'Prometric Result', mandatory: false },
    ];

    for (const doc of prometricDocs) {
      await prisma.countryDocumentRequirement.upsert({
        where: {
          countryCode_docType_processingStepTemplateId: {
            countryCode: 'ALL',
            docType: doc.docType,
            processingStepTemplateId: prometricTemplate.id,
          },
        },
        update: {
          mandatory: doc.mandatory,
          label: doc.label ?? doc.docType,
          processingStepTemplateId: prometricTemplate.id,
        },
        create: {
          countryCode: 'ALL',
          docType: doc.docType,
          label: doc.label ?? doc.docType,
          mandatory: doc.mandatory,
          processingStepTemplateId: prometricTemplate.id,
        },
      });
    }
  }

  // --- Global Eligibility Documents ---
  // Seed global Eligibility requirements mapped to processing step template 'eligibility'
  const eligibilityTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'eligibility' } });
  if (!eligibilityTemplate) {
    console.warn("ProcessingStepTemplate with key='eligibility' not found — skipping Eligibility global seed");
  } else {
    // Ensure sentinel global country exists for 'ALL' to attach global rules
    await prisma.country.upsert({
      where: { code: 'ALL' },
      update: { name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
      create: { code: 'ALL', name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
    });

    const eligibilityDocs = [
      { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
      { docType: DOCUMENT_TYPE.TRANSCRIPT, label: 'Academic Transcript / Mark Sheet', mandatory: true },
      { docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE, label: 'Experience Certificate(s)', mandatory: true },
      { docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE, label: 'Professional Registration (Nursing / Council / Trade)', mandatory: true },
      { docType: DOCUMENT_TYPE.PASSPORT_COPY, label: 'Passport Copy', mandatory: true },
    ];

    for (const doc of eligibilityDocs) {
      await prisma.countryDocumentRequirement.upsert({
        where: {
          countryCode_docType_processingStepTemplateId: {
            countryCode: 'ALL',
            docType: doc.docType,
            processingStepTemplateId: eligibilityTemplate.id,
          },
        },
        update: {
          mandatory: doc.mandatory,
          label: doc.label ?? doc.docType,
          processingStepTemplateId: eligibilityTemplate.id,
        },
        create: {
          countryCode: 'ALL',
          docType: doc.docType,
          label: doc.label ?? doc.docType,
          mandatory: doc.mandatory,
          processingStepTemplateId: eligibilityTemplate.id,
        },
      });
    }
  }

  console.log('Country document requirements seeded successfully.');
}


