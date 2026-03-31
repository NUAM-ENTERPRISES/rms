import { PrismaClient } from '@prisma/client';
import { DOCUMENT_TYPE } from '../../src/common/constants/document-types';

export async function seedCountryDocuments(prisma: PrismaClient) {
  const saudiDocs = [
    { docType: DOCUMENT_TYPE.PASSPORT_COVER_BIO, label: 'Passport Cover & Bio Page', mandatory: true },
    { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE, label: 'Registration Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE, label: 'Experience Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.SAUDI_PROMETRIC, label: 'Saudi Council / Licensing Exam Result', mandatory: true },
    { docType: DOCUMENT_TYPE.DATAFLOW_REPORT, label: 'Dataflow Report', mandatory: true },
    { docType: DOCUMENT_TYPE.PCC, label: 'Police Clearance Certificate (PCC)', mandatory: true },
    { docType: DOCUMENT_TYPE.MEDICAL_FITNESS, label: 'Medical Fitness Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.PASSPORT_PHOTO, label: 'Passport Size Photo (White Background)', mandatory: true },
  ];

  const omanDocs = [
    { docType: DOCUMENT_TYPE.PASSPORT_COPY, label: 'Passport Copy', mandatory: true },
    { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.MOH_PROMETRIC, label: 'MOH License / Licensing Exam Result', mandatory: true },
    { docType: DOCUMENT_TYPE.EXPERIENCE_LETTERS, label: 'Experience Letters', mandatory: true },
    { docType: DOCUMENT_TYPE.PCC, label: 'PCC', mandatory: true },
  ];

  const qatarDocs = [
    { docType: DOCUMENT_TYPE.PASSPORT_COPY, label: 'Passport Copy', mandatory: true },
    { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
    { docType: DOCUMENT_TYPE.QCHP_PROMETRIC, label: 'QCHP Evaluation / Licensing Exam Result', mandatory: true },
    { docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATES, label: 'Experience Certificates', mandatory: true },
    { docType: DOCUMENT_TYPE.PCC, label: 'PCC', mandatory: true },
  ];

  const data = [
    { countryCode: 'SA', docs: saudiDocs },
    { countryCode: 'OM', docs: omanDocs },
    { countryCode: 'QA', docs: qatarDocs },
  ];

  // Optional: a friendly label name for licensing exam for each country
  // (not strictly needed for document seed but helps readability)
  const licensingExamLabel = 'Licensing Exam Result';

  console.log('Seeding country document requirements...');

  async function seedGlobalRequirements(templateKey: string, docs: Array<{ docType: string; label: string; mandatory: boolean }>) {
    const template = await prisma.processingStepTemplate.findUnique({ where: { key: templateKey } });
    if (!template) {
      console.warn(`ProcessingStepTemplate with key='${templateKey}' not found — skipping ${templateKey.toUpperCase()} global seed`);
      return;
    }

    await prisma.country.upsert({
      where: { code: 'ALL' },
      update: { name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
      create: { code: 'ALL', name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
    });

    // cleanup stale global requirements for this step to keep reseeds idempotent
    await prisma.countryDocumentRequirement.deleteMany({
      where: {
        countryCode: 'ALL',
        processingStepTemplateId: template.id,
      },
    });

    for (const doc of docs) {
      await prisma.countryDocumentRequirement.upsert({
        where: {
          countryCode_docType_processingStepTemplateId: {
            countryCode: 'ALL',
            docType: doc.docType,
            processingStepTemplateId: template.id,
          },
        },
        update: {
          mandatory: doc.mandatory,
          label: doc.label ?? doc.docType,
          processingStepTemplateId: template.id,
        },
        create: {
          countryCode: 'ALL',
          docType: doc.docType,
          label: doc.label ?? doc.docType,
          mandatory: doc.mandatory,
          processingStepTemplateId: template.id,
        },
      });
    }
  }

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

    await seedGlobalRequirements('hrd', hrdDocs);
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

    await seedGlobalRequirements('data_flow', dataFlowDocs);
  }

  // --- Global Prometric Documents ---
  // Seed global Prometric output requirement mapped to processing step template 'prometric'
  const prometricTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'prometric' } });
  if (!prometricTemplate) {
    console.warn("ProcessingStepTemplate with key='prometric' not found — skipping Prometric global seed");
  } else {
    const prometricDocs = [
      { docType: DOCUMENT_TYPE.PROMETRIC_RESULT, label: 'Licensing Exam Result', mandatory: false },
    ];

    await seedGlobalRequirements('prometric', prometricDocs);
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
      { docType: DOCUMENT_TYPE.ELIGIBILITY_LETTER, label: 'Eligibility Letter', mandatory: true },
    ];

    await seedGlobalRequirements('eligibility', eligibilityDocs);
  }

  // --- Global Council Registration Documents ---
  // Seed global Council Registration requirements mapped to processing step template 'council_registration'
  const councilTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'council_registration' } });
  if (!councilTemplate) {
    console.warn("ProcessingStepTemplate with key='council_registration' not found — skipping Council Registration global seed");
  } else {
    // Ensure sentinel global country exists for 'ALL' to attach global rules
    await prisma.country.upsert({
      where: { code: 'ALL' },
      update: { name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
      create: { code: 'ALL', name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
    });

    const councilDocs = [
      { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
      { docType: DOCUMENT_TYPE.TRANSCRIPT, label: 'Academic Transcript / Mark Sheet', mandatory: true },
      { docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE, label: 'Experience Certificate(s)', mandatory: true },
      { docType: DOCUMENT_TYPE.PASSPORT_COPY, label: 'Passport Copy', mandatory: true },
      { docType: DOCUMENT_TYPE.PASSPORT_PHOTO, label: 'Passport Size Photo (White Background)', mandatory: true },
      // optional
      { docType: DOCUMENT_TYPE.DATAFLOW_REPORT, label: 'Dataflow Report', mandatory: false },
      { docType: DOCUMENT_TYPE.PROMETRIC_RESULT, label: 'Prometric Result', mandatory: false },
      { docType: DOCUMENT_TYPE.GOOD_STANDING_CERTIFICATE, label: 'Good Standing Certificate', mandatory: false },
      { docType: DOCUMENT_TYPE.NAME_CHANGE_AFFIDAVIT, label: 'Name Change Affidavit', mandatory: false },
    ];

    await seedGlobalRequirements('council_registration', councilDocs);
  }

  // --- Global Document Attestation Documents ---
  // Seed global Document Attestation requirements mapped to processing step template 'document_attestation'
  const attestationTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'document_attestation' } });
  if (!attestationTemplate) {
    console.warn("ProcessingStepTemplate with key='document_attestation' not found — skipping Document Attestation global seed");
  } else {
    // Ensure sentinel global country exists for 'ALL' to attach global rules
    await prisma.country.upsert({
      where: { code: 'ALL' },
      update: { name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
      create: { code: 'ALL', name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
    });

    const attestationDocs = [
      // core (mandatory)
      { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE, label: 'Degree Certificate', mandatory: true },
      { docType: DOCUMENT_TYPE.TRANSCRIPT, label: 'Academic Transcript / Mark Sheet', mandatory: true },
      { docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE, label: 'Registration Certificate', mandatory: true },
      { docType: DOCUMENT_TYPE.PASSPORT_COPY, label: 'Passport Copy', mandatory: true },
      // optional
      { docType: DOCUMENT_TYPE.DATAFLOW_REPORT, label: 'Dataflow Report', mandatory: false },
      { docType: DOCUMENT_TYPE.PROMETRIC_RESULT, label: 'Prometric Result', mandatory: false },
      { docType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE, label: 'Experience Certificate', mandatory: false },
      { docType: DOCUMENT_TYPE.MARRIAGE_CERTIFICATE, label: 'Marriage Certificate', mandatory: false },
      { docType: DOCUMENT_TYPE.NAME_CHANGE_AFFIDAVIT, label: 'Name Change Affidavit', mandatory: false },
    ];

    await seedGlobalRequirements('document_attestation', attestationDocs);
  }

  // --- Global Medical Documents ---
  // Seed medical output/requirements mapped to processing step template 'medical'
  const medicalTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'medical' } });
  if (!medicalTemplate) {
    console.warn("ProcessingStepTemplate with key='medical' not found — skipping Medical global seed");
  } else {
    // Ensure sentinel global country exists for 'ALL' to attach global rules
    await prisma.country.upsert({
      where: { code: 'ALL' },
      update: { name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
      create: { code: 'ALL', name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
    });

    const medicalDocs = [
      { docType: DOCUMENT_TYPE.MEDICAL_FITNESS, label: 'Medical Fitness Certificate', mandatory: true },
    ];

    await seedGlobalRequirements('medical', medicalDocs);
  }

  // --- Global Biometric Documents ---
  // Seed biometric input/requirements mapped to processing step template 'biometrics'
  const biometricTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'biometrics' } });
  if (!biometricTemplate) {
    console.warn("ProcessingStepTemplate with key='biometrics' not found — skipping Biometric global seed");
  } else {
    // Ensure sentinel global country exists for 'ALL' to attach global rules
    await prisma.country.upsert({
      where: { code: 'ALL' },
      update: { name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
      create: { code: 'ALL', name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
    });

    const biometricDocs = [
      { docType: DOCUMENT_TYPE.PASSPORT_COPY, label: 'Passport Copy', mandatory: true },
      { docType: DOCUMENT_TYPE.MEDICAL_FITNESS, label: 'Medical Fitness Certificate', mandatory: true },
      { docType: DOCUMENT_TYPE.BIOMETRIC_ACKNOWLEDGEMENT, label: 'Biometric Acknowledgement', mandatory: false },
    ];

    await seedGlobalRequirements('biometrics', biometricDocs);
  }

  // --- Global Visa Documents ---
  // Seed visa-related requirements mapped to processing step template 'visa'
  const visaTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'visa' } });
  if (!visaTemplate) {
    console.warn("ProcessingStepTemplate with key='visa' not found — skipping Visa global seed");
  } else {
    // Ensure sentinel global country exists for 'ALL' to attach global rules
    await prisma.country.upsert({
      where: { code: 'ALL' },
      update: { name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
      create: { code: 'ALL', name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
    });

    const visaDocs = [
      { docType: DOCUMENT_TYPE.PASSPORT_ORIGINAL, label: 'Original Passport (presented)', mandatory: false },
      { docType: DOCUMENT_TYPE.E_VISA, label: 'e-Visa', mandatory: false },
      { docType: DOCUMENT_TYPE.VISA_STAMP, label: 'Visa Stamp (if applicable)', mandatory: false },
    ];

    await seedGlobalRequirements('visa', visaDocs);
  }

  // --- Global Ticket Documents ---
  // Seed ticket-related requirements mapped to processing step template 'ticket'
  const ticketTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'ticket' } });
  if (!ticketTemplate) {
    console.warn("ProcessingStepTemplate with key='ticket' not found — skipping Ticket global seed");
  } else {
    // Ensure sentinel global country exists for 'ALL' to attach global rules
    await prisma.country.upsert({
      where: { code: 'ALL' },
      update: { name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
      create: { code: 'ALL', name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
    });

    const ticketDocs = [
      { docType: DOCUMENT_TYPE.FLIGHT_TICKET, label: 'Flight Ticket / e-ticket', mandatory: true },
    ];

    await seedGlobalRequirements('ticket', ticketDocs);
  }

  // --- Global Documents Received Documents ---
  // Seed global "Documents Received" requirements mapped to processing step template 'document_received'
  const documentReceivedTemplate = await prisma.processingStepTemplate.findUnique({ where: { key: 'document_received' } });
  if (!documentReceivedTemplate) {
    console.warn("ProcessingStepTemplate with key='document_received' not found — skipping Documents Received global seed");
  } else {
    // Ensure sentinel global country exists for 'ALL' to attach global rules
    await prisma.country.upsert({
      where: { code: 'ALL' },
      update: { name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
      create: { code: 'ALL', name: 'Global', region: 'GLOBAL', callingCode: '', currency: '', timezone: '', isActive: true },
    });

    const documentReceivedDocs = [
      // required
      { docType: DOCUMENT_TYPE.PASSPORT_ORIGINAL, label: 'Original Passport (presented)', mandatory: true },
      { docType: DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL, label: 'Degree Certificate (Original)', mandatory: true },
      { docType: DOCUMENT_TYPE.TRANSCRIPT_ORIGINAL, label: 'Academic Transcript (Original)', mandatory: true },
      { docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE_ORIGINAL, label: 'Registration Certificate (Original)', mandatory: true },
      // optional
      { docType: DOCUMENT_TYPE.OFFER_LETTER_ORIGINAL, label: 'Offer Letter (Original)', mandatory: false },
      { docType: DOCUMENT_TYPE.MARRIAGE_CERTIFICATE_ORIGINAL, label: 'Marriage Certificate (Original)', mandatory: false },
      { docType: DOCUMENT_TYPE.BIRTH_CERTIFICATE_ORIGINAL, label: 'Birth Certificate (Original)', mandatory: false },
      { docType: DOCUMENT_TYPE.PCC_ORIGINAL, label: 'Police Clearance Certificate (Original)', mandatory: false },
    ];

    await seedGlobalRequirements('document_received', documentReceivedDocs);
  }

  console.log('Country document requirements seeded successfully.');
}


