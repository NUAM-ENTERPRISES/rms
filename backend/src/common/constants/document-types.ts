/**
 * Document Type Constants - Affiniks RMS
 *
 * This file defines all valid document types and their metadata.
 * DO NOT hardcode document type strings elsewhere - always import from this file.
 *
 * @module common/constants/document-types
 */

// ==================== DOCUMENT TYPES ====================

/**
 * Document Type Constants
 * Defines all document types accepted in the system
 */
export const DOCUMENT_TYPE = {

  // Identity Documents
  AADHAAR: 'aadhaar',
  PAN_CARD: 'pan_card',
  DRIVING_LICENSE: 'driving_license',
  VOTER_ID: 'voter_id',

  // Professional Documents
  PROFESSIONAL_LICENSE: 'professional_license',
  NURSING_LICENSE: 'nursing_license',
  MEDICAL_LICENSE: 'medical_license',
  REGISTRATION_CERTIFICATE: 'registration_certificate',

  // Educational Documents (moved to HRD-specific types)
  TRANSCRIPT: 'transcript',

  // HRD / Country-specific Documents
  DEGREE_CERTIFICATE: 'degree_certificate',
  EXPERIENCE_CERTIFICATE: 'experience_certificate',
  EXPERIENCE_CERTIFICATES: 'experience_certificates',
  EXPERIENCE_LETTERS: 'experience_letters',
  SAUDI_PROMETRIC: 'saudi_prometric',
  MOH_PROMETRIC: 'moh_prometric',
  QCHP_PROMETRIC: 'qchp_prometric',
  PROMETRIC_RESULT: 'prometric_result',
  
  // Licensing Exams (Simplified names from LICENSING_EXAMS constant)
  PROMETRIC: 'prometric',
  DHA: 'dha',
  HAAD: 'haad',
  MOH: 'moh',
  SCFHS: 'scfhs',
  QCHP: 'qchp',
  OMSB: 'omsb',
  NHRA: 'nhra',
  NMC_UK: 'nmc_uk',
  CBT: 'cbt',
  OET: 'oet',
  IELTS: 'ielts',
  USMLE: 'usmle',
  NCLEX_RN: 'nclex_rn',
  ELIGIBILITY_LETTER: 'eligibility_letter',

  DATAFLOW_REPORT: 'dataflow_report',
  GOOD_STANDING_CERTIFICATE: 'good_standing_certificate',
  PCC: 'pcc',
  PASSPORT_COPY: 'passport_copy',
  // passport / visa - new types for Visa processing step
  PASSPORT_ORIGINAL: 'passport_original',
  DEGREE_CERTIFICATE_ORIGINAL: 'degree_certificate_original',
  TRANSCRIPT_ORIGINAL: 'transcript_original',
  REGISTRATION_CERTIFICATE_ORIGINAL: 'registration_certificate_original',
  OFFER_LETTER_ORIGINAL: 'offer_letter_original',
  MARRIAGE_CERTIFICATE_ORIGINAL: 'marriage_certificate_original',
  BIRTH_CERTIFICATE_ORIGINAL: 'birth_certificate_original',
  PCC_ORIGINAL: 'pcc_original',
  SSLC_CERTIFICATE_ORIGINAL: 'sslc_certificate_original',
  PLUS_TWO_CERTIFICATE_ORIGINAL: 'plus_two_certificate_original',
  EXPERIENCE_CERTIFICATE_ORIGINAL: 'experience_certificate_original',
  ORIGINAL_DOCUMENTS_BUNDLE: 'original_documents_bundle',
  E_VISA: 'e_visa',
  VISA_STAMP: 'visa_stamp',
  FLIGHT_TICKET: 'flight_ticket',
  PASSPORT_COVER_BIO: 'passport_cover_bio',
  PASSPORT_PHOTO: 'passport_photo',
  NAME_CHANGE_AFFIDAVIT: 'name_change_affidavit',
  MARRIAGE_CERTIFICATE: 'marriage_certificate',
  BIOMETRIC_ACKNOWLEDGEMENT: 'biometric_acknowledgement',

  // Employment Documents
  RESUME: 'resume',
  CV: 'cv',
  RELIEVING_LETTER: 'relieving_letter',
  SALARY_SLIP: 'salary_slip',
  APPOINTMENT_LETTER: 'appointment_letter',

  // Verification Documents
  BACKGROUND_CHECK: 'background_check',
  REFERENCE_LETTER: 'reference_letter',

  // Medical Documents
  MEDICAL_CERTIFICATE: 'medical_certificate',
  MEDICAL_FITNESS: 'medical_fitness',
  VACCINATION_CERTIFICATE: 'vaccination_certificate',
  COVID_VACCINATION: 'covid_vaccination',
  MEDICAL_INSURANCE: 'medical_insurance',

  // Media
  INTRODUCTION_VIDEO: 'introduction_video',

  // Other Documents
  BANK_DETAILS: 'bank_details',
  OFFER_LETTER: 'offer_letter',
  JOINING_LETTER: 'joining_letter',
  OTHER: 'other',
} as const;

export type DocumentType = (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE];

// ==================== COPY / ORIGINAL VARIANTS ====================

export const DOCUMENT_VARIANT = {
  COPY: 'copy',
  ORIGINAL: 'original',
} as const;

export type DocumentVariant =
  (typeof DOCUMENT_VARIANT)[keyof typeof DOCUMENT_VARIANT];

export type DocumentTypeRelation = {
  variant: DocumentVariant;
  baseType: string;
  pairedDocType: string | null;
};

/** Legacy DB / API aliases → canonical document type keys. */
export const DOCUMENT_TYPE_ALIASES: Record<string, DocumentType> = {
  passport: DOCUMENT_TYPE.PASSPORT_COPY,
  degree: DOCUMENT_TYPE.DEGREE_CERTIFICATE,
  photo: DOCUMENT_TYPE.PASSPORT_PHOTO,
  police_clearance: DOCUMENT_TYPE.PCC,
  experience_letter: DOCUMENT_TYPE.EXPERIENCE_LETTERS,
};

/**
 * Maps copy/scan types to their original hardcopy counterparts (and vice versa).
 * `baseType` is the logical document family (without variant suffix).
 */
export const DOCUMENT_TYPE_RELATIONS: Record<string, DocumentTypeRelation> = {
  [DOCUMENT_TYPE.PASSPORT_COPY]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: 'passport',
    pairedDocType: DOCUMENT_TYPE.PASSPORT_ORIGINAL,
  },
  [DOCUMENT_TYPE.PASSPORT_COVER_BIO]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: 'passport',
    pairedDocType: DOCUMENT_TYPE.PASSPORT_ORIGINAL,
  },
  [DOCUMENT_TYPE.PASSPORT_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: 'passport',
    pairedDocType: DOCUMENT_TYPE.PASSPORT_COPY,
  },
  [DOCUMENT_TYPE.DEGREE_CERTIFICATE]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: DOCUMENT_TYPE.DEGREE_CERTIFICATE,
    pairedDocType: DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL,
  },
  [DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: DOCUMENT_TYPE.DEGREE_CERTIFICATE,
    pairedDocType: DOCUMENT_TYPE.DEGREE_CERTIFICATE,
  },
  [DOCUMENT_TYPE.TRANSCRIPT]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: DOCUMENT_TYPE.TRANSCRIPT,
    pairedDocType: DOCUMENT_TYPE.TRANSCRIPT_ORIGINAL,
  },
  [DOCUMENT_TYPE.TRANSCRIPT_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: DOCUMENT_TYPE.TRANSCRIPT,
    pairedDocType: DOCUMENT_TYPE.TRANSCRIPT,
  },
  [DOCUMENT_TYPE.REGISTRATION_CERTIFICATE]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE,
    pairedDocType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE_ORIGINAL,
  },
  [DOCUMENT_TYPE.REGISTRATION_CERTIFICATE_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE,
    pairedDocType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE,
  },
  [DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE,
    pairedDocType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE_ORIGINAL,
  },
  [DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE,
    pairedDocType: DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE,
  },
  [DOCUMENT_TYPE.PCC]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: DOCUMENT_TYPE.PCC,
    pairedDocType: DOCUMENT_TYPE.PCC_ORIGINAL,
  },
  [DOCUMENT_TYPE.PCC_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: DOCUMENT_TYPE.PCC,
    pairedDocType: DOCUMENT_TYPE.PCC,
  },
  [DOCUMENT_TYPE.OFFER_LETTER]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: DOCUMENT_TYPE.OFFER_LETTER,
    pairedDocType: DOCUMENT_TYPE.OFFER_LETTER_ORIGINAL,
  },
  [DOCUMENT_TYPE.OFFER_LETTER_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: DOCUMENT_TYPE.OFFER_LETTER,
    pairedDocType: DOCUMENT_TYPE.OFFER_LETTER,
  },
  [DOCUMENT_TYPE.MARRIAGE_CERTIFICATE]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: DOCUMENT_TYPE.MARRIAGE_CERTIFICATE,
    pairedDocType: DOCUMENT_TYPE.MARRIAGE_CERTIFICATE_ORIGINAL,
  },
  [DOCUMENT_TYPE.MARRIAGE_CERTIFICATE_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: DOCUMENT_TYPE.MARRIAGE_CERTIFICATE,
    pairedDocType: DOCUMENT_TYPE.MARRIAGE_CERTIFICATE,
  },
  [DOCUMENT_TYPE.BIRTH_CERTIFICATE_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: 'birth_certificate',
    pairedDocType: null,
  },
  [DOCUMENT_TYPE.SSLC_CERTIFICATE_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: 'sslc_certificate',
    pairedDocType: null,
  },
  [DOCUMENT_TYPE.PLUS_TWO_CERTIFICATE_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: 'plus_two_certificate',
    pairedDocType: null,
  },
  [DOCUMENT_TYPE.ORIGINAL_DOCUMENTS_BUNDLE]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: 'original_documents_bundle',
    pairedDocType: null,
  },
};

function normalizeDocumentTypeKey(docType: string): string {
  return DOCUMENT_TYPE_ALIASES[docType] ?? docType;
}

/** Resolve legacy/duplicate doc type strings to the canonical catalog key. */
export function resolveCanonicalDocumentType(
  docType: string,
): DocumentType | undefined {
  const normalized = normalizeDocumentTypeKey(docType);
  return DOCUMENT_TYPE_META[normalized as DocumentType]
    ? (normalized as DocumentType)
    : undefined;
}

export function getDocumentTypeRelation(
  docType: string,
): DocumentTypeRelation | undefined {
  return DOCUMENT_TYPE_RELATIONS[normalizeDocumentTypeKey(docType)];
}

export function isOriginalDocType(docType: string): boolean {
  return getDocumentTypeRelation(docType)?.variant === DOCUMENT_VARIANT.ORIGINAL;
}

export function isCopyDocType(docType: string): boolean {
  return getDocumentTypeRelation(docType)?.variant === DOCUMENT_VARIANT.COPY;
}

export function getPairedDocType(docType: string): string | null {
  return getDocumentTypeRelation(docType)?.pairedDocType ?? null;
}

export function getDocumentVariantLabel(
  docType: string,
): 'Copy' | 'Original' | null {
  const variant = getDocumentTypeRelation(docType)?.variant;
  if (variant === DOCUMENT_VARIANT.COPY) return 'Copy';
  if (variant === DOCUMENT_VARIANT.ORIGINAL) return 'Original';
  return null;
}

export function resolveDocumentTypeWithVariant(docType: string): {
  resolved: DocumentType | undefined;
  variant: DocumentVariant | null;
  pairedDocType: string | null;
} {
  const normalized = normalizeDocumentTypeKey(docType);
  const resolved = DOCUMENT_TYPE_META[normalized as DocumentType]
    ? (normalized as DocumentType)
    : undefined;
  const relation = DOCUMENT_TYPE_RELATIONS[normalized];

  return {
    resolved,
    variant: relation?.variant ?? null,
    pairedDocType: relation?.pairedDocType ?? null,
  };
}

// ==================== DOCUMENT METADATA ====================

/**
 * Document Type Metadata
 * Includes display information, validation rules, and UI hints
 */
export const DOCUMENT_TYPE_META: Record<
  DocumentType,
  {
    displayName: string;
    description: string;
    category:
      | 'identity'
      | 'professional'
      | 'educational'
      | 'employment'
      | 'verification'
      | 'medical'
      | 'other';
    hasExpiry: boolean;
    expiryRequired: boolean;
    maxSizeMB: number;
    allowedFormats: string[];
    commonlyRequired: boolean;
    variant?: DocumentVariant;
    pairedDocType?: string | null;
  }
> = {
  [DOCUMENT_TYPE.AADHAAR]: {
    displayName: 'Aadhaar Card',
    description: 'Government-issued Aadhaar card',
    category: 'identity',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.PAN_CARD]: {
    displayName: 'PAN Card',
    description: 'Permanent Account Number card',
    category: 'identity',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.DRIVING_LICENSE]: {
    displayName: 'Driving License',
    description: 'Valid driving license',
    category: 'identity',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 2,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.VOTER_ID]: {
    displayName: 'Voter ID',
    description: 'Government-issued voter ID',
    category: 'identity',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PROFESSIONAL_LICENSE]: {
    displayName: 'Professional License',
    description: 'Professional license or registration',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.NURSING_LICENSE]: {
    displayName: 'Nursing License',
    description: 'Registered Nurse license',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.MEDICAL_LICENSE]: {
    displayName: 'Medical License',
    description: 'Medical practitioner license',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.REGISTRATION_CERTIFICATE]: {
    displayName: 'Registration Certificate',
    description: 'Professional registration certificate',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.TRANSCRIPT]: {
    displayName: 'Transcript',
    description: 'Academic transcript',
    category: 'educational',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  // HRD / Country-specific metadata
  [DOCUMENT_TYPE.DEGREE_CERTIFICATE]: {
    displayName: 'Degree Certificate',
    description: 'Degree certificate (HRD)',
    category: 'educational',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE]: {
    displayName: 'Experience Certificate',
    description: 'Experience certificate (HRD)',
    category: 'employment',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.EXPERIENCE_CERTIFICATES]: {
    displayName: 'Experience Certificates',
    description: 'Experience certificates (multiple)',
    category: 'employment',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.EXPERIENCE_LETTERS]: {
    displayName: 'Experience Letters',
    description: 'Experience letters',
    category: 'employment',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.SAUDI_PROMETRIC]: {
    displayName: 'Saudi Prometric Result',
    description: 'Saudi Council / Prometric Result',
    category: 'professional',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.MOH_PROMETRIC]: {
    displayName: 'MOH Prometric / License',
    description: 'MOH License / Prometric',
    category: 'professional',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.QCHP_PROMETRIC]: {
    displayName: 'QCHP Prometric / Evaluation',
    description: 'QCHP Evaluation / Prometric',
    category: 'professional',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.PROMETRIC_RESULT]: {
    displayName: 'Prometric Result',
    description: 'Prometric / Examination result (output)',
    category: 'professional',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PROMETRIC]: {
    displayName: 'Prometric Certificate',
    description: 'Prometric exam certificate',
    category: 'professional',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.DHA]: {
    displayName: 'DHA License / Eligibility',
    description: 'Dubai Health Authority license or eligibility letter',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.HAAD]: {
    displayName: 'HAAD / DOH License',
    description: 'Health Authority Abu Dhabi / Department of Health License',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.MOH]: {
    displayName: 'MOH License',
    description: 'Ministry of Health license',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.SCFHS]: {
    displayName: 'SCFHS / Saudi Council',
    description: 'Saudi Commission for Health Specialties registration',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.QCHP]: {
    displayName: 'QCHP License',
    description: 'Qatar Council for Healthcare Practitioners license',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.OMSB]: {
    displayName: 'OMSB License',
    description: 'Oman Medical Specialty Board license',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.NHRA]: {
    displayName: 'NHRA License',
    description: 'National Health Regulatory Authority (Bahrain) license',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.NMC_UK]: {
    displayName: 'NMC UK Registration',
    description: 'Nursing and Midwifery Council (UK) registration',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.CBT]: {
    displayName: 'CBT Result',
    description: 'Computer Based Test result',
    category: 'professional',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.OET]: {
    displayName: 'OET Result',
    description: 'Occupational English Test result',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.IELTS]: {
    displayName: 'IELTS Result',
    description: 'International English Language Testing System result',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.USMLE]: {
    displayName: 'USMLE Result',
    description: 'United States Medical Licensing Examination result',
    category: 'professional',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.NCLEX_RN]: {
    displayName: 'NCLEX-RN Result',
    description: 'National Council Licensure Examination for Registered Nurses',
    category: 'professional',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.ELIGIBILITY_LETTER]: {
    displayName: 'Eligibility Letter',
    description: 'Document indicating project eligibility',
    category: 'verification',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.DATAFLOW_REPORT]: {
    displayName: 'Dataflow Report',
    description: 'Dataflow verification report',
    category: 'verification',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.GOOD_STANDING_CERTIFICATE]: {
    displayName: 'Good Standing Certificate',
    description: 'Certificate of Good Standing from previous regulator/employer',
    category: 'verification',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PCC]: {
    displayName: 'Police Clearance (PCC)',
    description: 'Police Clearance Certificate (PCC)',
    category: 'verification',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.PASSPORT_COPY]: {
    displayName: 'Passport Copy',
    description: 'Passport copy (bio page)',
    category: 'identity',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.PASSPORT_ORIGINAL]: {
    displayName: 'Original Passport (presented)',
    description: 'Original passport presented / scanned original passport (for in-person verification)',
    category: 'identity',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 10,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL]: {
    displayName: 'Degree Certificate (Original)',
    description: 'Original degree certificate',
    category: 'educational',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.TRANSCRIPT_ORIGINAL]: {
    displayName: 'Academic Transcript (Original)',
    description: 'Original academic transcript / mark sheet',
    category: 'educational',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.REGISTRATION_CERTIFICATE_ORIGINAL]: {
    displayName: 'Registration Certificate (Original)',
    description: 'Original professional registration certificate',
    category: 'professional',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.OFFER_LETTER_ORIGINAL]: {
    displayName: 'Offer Letter (Original)',
    description: 'Original employment offer letter',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.MARRIAGE_CERTIFICATE_ORIGINAL]: {
    displayName: 'Marriage Certificate (Original)',
    description: 'Original marriage certificate',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.BIRTH_CERTIFICATE_ORIGINAL]: {
    displayName: 'Birth Certificate (Original)',
    description: 'Original birth certificate',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PCC_ORIGINAL]: {
    displayName: 'Police Clearance (Original)',
    description: 'Original police clearance certificate',
    category: 'verification',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.SSLC_CERTIFICATE_ORIGINAL]: {
    displayName: 'SSLC Certificate (Original)',
    description: 'Original SSLC certificate',
    category: 'educational',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PLUS_TWO_CERTIFICATE_ORIGINAL]: {
    displayName: 'Plus Two Certificate (Original)',
    description: 'Original Plus Two certificate',
    category: 'educational',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE_ORIGINAL]: {
    displayName: 'Experience Certificate (Original)',
    description: 'Original experience certificate',
    category: 'employment',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.ORIGINAL_DOCUMENTS_BUNDLE]: {
    displayName: 'Merged Original Documents Scan',
    description: 'Merged scan of all collected original documents',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 50,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.E_VISA]: {
    displayName: 'e-Visa',
    description: 'Electronic visa (e‑visa) document or approval',
    category: 'verification',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.VISA_STAMP]: {
    displayName: 'Visa Stamp',
    description: 'Visa stamp in passport (if applicable)',
    category: 'verification',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.FLIGHT_TICKET]: {
    displayName: 'Flight Ticket / e‑ticket',
    description: 'Flight ticket or e‑ticket / booking confirmation',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PASSPORT_COVER_BIO]: {
    displayName: 'Passport Cover & Bio Page',
    description: 'Passport cover and bio page',
    category: 'identity',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.PASSPORT_PHOTO]: {
    displayName: 'Passport Photo',
    description: 'Passport size photo (white background)',
    category: 'identity',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 1,
    allowedFormats: ['jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.NAME_CHANGE_AFFIDAVIT]: {
    displayName: 'Name Change Affidavit',
    description: 'Affidavit for name change',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.MARRIAGE_CERTIFICATE]: {
    displayName: 'Marriage Certificate',
    description: 'Marriage certificate (marriage/union proof)',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.BIOMETRIC_ACKNOWLEDGEMENT]: {
    displayName: 'Biometric Acknowledgement',
    description: 'Acknowledgement/consent for biometric capture',
    category: 'verification',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.RESUME]: {
    displayName: 'Resume',
    description: 'Professional resume',
    category: 'employment',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'doc', 'docx'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.CV]: {
    displayName: 'Curriculum Vitae',
    description: 'Detailed CV',
    category: 'employment',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'doc', 'docx'],
    commonlyRequired: false,
  },

  [DOCUMENT_TYPE.RELIEVING_LETTER]: {
    displayName: 'Relieving Letter',
    description: 'Relieving letter from previous employer',
    category: 'employment',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.SALARY_SLIP]: {
    displayName: 'Salary Slip',
    description: 'Recent salary slip',
    category: 'employment',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.APPOINTMENT_LETTER]: {
    displayName: 'Appointment Letter',
    description: 'Employment appointment letter',
    category: 'employment',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.BACKGROUND_CHECK]: {
    displayName: 'Background Check',
    description: 'Background verification report',
    category: 'verification',
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.REFERENCE_LETTER]: {
    displayName: 'Reference Letter',
    description: 'Professional reference letter',
    category: 'verification',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.MEDICAL_CERTIFICATE]: {
    displayName: 'Medical Certificate',
    description: 'Medical fitness certificate',
    category: 'medical',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.MEDICAL_FITNESS]: {
    displayName: 'Medical Fitness Report',
    description: 'Complete medical fitness report',
    category: 'medical',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 10,
    allowedFormats: ['pdf'],
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.VACCINATION_CERTIFICATE]: {
    displayName: 'Vaccination Certificate',
    description: 'Vaccination records',
    category: 'medical',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.COVID_VACCINATION]: {
    displayName: 'COVID-19 Vaccination',
    description: 'COVID-19 vaccination certificate',
    category: 'medical',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.MEDICAL_INSURANCE]: {
    displayName: 'Medical Insurance',
    description: 'Medical insurance documents',
    category: 'medical',
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.INTRODUCTION_VIDEO]: {
    displayName: 'Introduction Video',
    description: 'Candidate introduction video for project submission',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 100,
    allowedFormats: ['mp4', 'webm', 'mov', 'avi'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.BANK_DETAILS]: {
    displayName: 'Bank Account Details',
    description: 'Bank account proof (cancelled cheque/passbook)',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.OFFER_LETTER]: {
    displayName: 'Offer Letter',
    description: 'Employment offer letter',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.JOINING_LETTER]: {
    displayName: 'Joining Letter',
    description: 'Joining confirmation letter',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ['pdf'],
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.OTHER]: {
    displayName: 'Other Document',
    description: 'Other supporting documents',
    category: 'other',
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
    commonlyRequired: false,
  },
};

/**
 * Get all document types by category
 */
export function getDocumentTypesByCategory(
  category:
    | 'identity'
    | 'professional'
    | 'educational'
    | 'employment'
    | 'verification'
    | 'medical'
    | 'other',
): DocumentType[] {
  return Object.entries(DOCUMENT_TYPE_META)
    .filter(([_, meta]) => meta.category === category)
    .map(([type]) => type as DocumentType);
}

/**
 * Get commonly required document types
 */
export function getCommonlyRequiredDocTypes(): DocumentType[] {
  return Object.entries(DOCUMENT_TYPE_META)
    .filter(([_, meta]) => meta.commonlyRequired)
    .map(([type]) => type as DocumentType);
}

/**
 * Validate file format for document type
 */
export function isValidFileFormat(
  docType: DocumentType,
  extension: string,
): boolean {
  const meta = DOCUMENT_TYPE_META[docType];
  return (
    meta?.allowedFormats.includes(extension.toLowerCase().replace('.', '')) ??
    false
  );
}

/**
 * Validate file size for document type
 */
export function isValidFileSize(
  docType: DocumentType,
  sizeMB: number,
): boolean {
  const meta = DOCUMENT_TYPE_META[docType];
  return sizeMB <= (meta?.maxSizeMB ?? 10);
}

/** Doc types that represent a passport copy or original (excludes passport_photo). */
export const PASSPORT_DOCUMENT_TYPES = [
  DOCUMENT_TYPE.PASSPORT_COPY,
  DOCUMENT_TYPE.PASSPORT_ORIGINAL,
  DOCUMENT_TYPE.PASSPORT_COVER_BIO,
  'passport',
] as const;

export function isPassportDocumentType(docType: string): boolean {
  return (PASSPORT_DOCUMENT_TYPES as readonly string[]).includes(docType);
}

/** Formats supported when building a unified client PDF (pdf-lib). */
const PDF_MERGE_ALLOWED_FORMATS = new Set(['pdf', 'jpg', 'jpeg', 'png']);

/** Doc types that must never appear in unified PDF merge flows. */
export const PDF_MERGE_EXCLUDED_DOC_TYPES = [
  DOCUMENT_TYPE.INTRODUCTION_VIDEO,
] as const;

/**
 * Whether a document can be included in unified PDF merge (excludes videos and non-image/pdf files).
 */
export function isPdfMergeableDocument(doc: {
  docType?: string | null;
  fileName?: string | null;
}): boolean {
  const docType = doc.docType?.trim();
  if (!docType) return false;

  if ((PDF_MERGE_EXCLUDED_DOC_TYPES as readonly string[]).includes(docType)) {
    return false;
  }

  const meta = DOCUMENT_TYPE_META[docType as DocumentType];
  if (meta?.allowedFormats?.length) {
    return meta.allowedFormats.some((format) => PDF_MERGE_ALLOWED_FORMATS.has(format));
  }

  const fileName = (doc.fileName || '').toLowerCase();
  return (
    fileName.endsWith('.pdf') ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png')
  );
}
