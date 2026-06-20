/**
 * Document Type Constants - Affiniks RMS Frontend
 *
 * MUST match backend: backend/src/common/constants/document-types.ts
 *
 * @module constants/document-types
 */

export const DOCUMENT_TYPE = {
  // Identity Documents
  /** Backend canonical: `passport_copy` (legacy rows may still be `passport`). */
  PASSPORT: "passport_copy",
  /** Passport size photo (legacy rows may still be `photo`). */
  PASSPORT_PHOTO: "passport_photo",
  AADHAAR: "aadhaar",
  PAN_CARD: "pan_card",
  DRIVING_LICENSE: "driving_license",
  VOTER_ID: "voter_id",

  // Professional Documents
  PROFESSIONAL_LICENSE: "professional_license",
  NURSING_LICENSE: "nursing_license",
  MEDICAL_LICENSE: "medical_license",
  REGISTRATION_CERTIFICATE: "registration_certificate",

  // HRD / country-specific documents
  EXPERIENCE_CERTIFICATE: "experience_certificate",
  EXPERIENCE_CERTIFICATES: "experience_certificates",
  SAUDI_PROMETRIC: "saudi_prometric",
  MOH_PROMETRIC: "moh_prometric",
  QCHP_PROMETRIC: "qchp_prometric",
  PROMETRIC_RESULT: "prometric_result",
  GOOD_STANDING_CERTIFICATE: "good_standing_certificate",
  PCC: "pcc",
  PASSPORT_COVER_BIO: "passport_cover_bio",
  NAME_CHANGE_AFFIDAVIT: "name_change_affidavit",
  MARRIAGE_CERTIFICATE: "marriage_certificate",
  BIOMETRIC_ACKNOWLEDGEMENT: "biometric_acknowledgement",

  // Processing — original hardcopy documents (Document Received step)
  PASSPORT_ORIGINAL: "passport_original",
  DEGREE_CERTIFICATE_ORIGINAL: "degree_certificate_original",
  TRANSCRIPT_ORIGINAL: "transcript_original",
  REGISTRATION_CERTIFICATE_ORIGINAL: "registration_certificate_original",
  OFFER_LETTER_ORIGINAL: "offer_letter_original",
  MARRIAGE_CERTIFICATE_ORIGINAL: "marriage_certificate_original",
  BIRTH_CERTIFICATE_ORIGINAL: "birth_certificate_original",
  PCC_ORIGINAL: "pcc_original",
  SSLC_CERTIFICATE_ORIGINAL: "sslc_certificate_original",
  PLUS_TWO_CERTIFICATE_ORIGINAL: "plus_two_certificate_original",
  EXPERIENCE_CERTIFICATE_ORIGINAL: "experience_certificate_original",
  ORIGINAL_DOCUMENTS_BUNDLE: "original_documents_bundle",
  E_VISA: "e_visa",
  VISA_STAMP: "visa_stamp",
  FLIGHT_TICKET: "flight_ticket",

  // Licensing Exams
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

  // Educational Documents
  /** Backend canonical: `degree_certificate` (legacy rows may still be `degree`). */
  DEGREE: "degree_certificate",
  DIPLOMA: "diploma",
  CERTIFICATE: "certificate",
  TRANSCRIPT: "transcript",
  MARKSHEET: "marksheet",

  // Employment Documents
  RESUME: "resume",
  CV: "cv",
  EXPERIENCE_LETTERS: "experience_letters",
  RELIEVING_LETTER: "relieving_letter",
  SALARY_SLIP: "salary_slip",
  APPOINTMENT_LETTER: "appointment_letter",

  // Verification Documents
  BACKGROUND_CHECK: "background_check",
  REFERENCE_LETTER: "reference_letter",

  // Medical Documents
  MEDICAL_CERTIFICATE: "medical_certificate",
  MEDICAL_FITNESS: "medical_fitness",
  VACCINATION_CERTIFICATE: "vaccination_certificate",
  COVID_VACCINATION: "covid_vaccination",
  MEDICAL_INSURANCE: "medical_insurance",

  // Media
  INTRODUCTION_VIDEO: "introduction_video",

  // Other Documents
  BANK_DETAILS: "bank_details",
  OFFER_LETTER: "offer_letter",
  JOINING_LETTER: "joining_letter",
  OTHER: "other",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE];

// ==================== COPY / ORIGINAL VARIANTS ====================

export const DOCUMENT_VARIANT = {
  COPY: "copy",
  ORIGINAL: "original",
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
  passport: DOCUMENT_TYPE.PASSPORT,
  degree: DOCUMENT_TYPE.DEGREE,
  photo: DOCUMENT_TYPE.PASSPORT_PHOTO,
  police_clearance: DOCUMENT_TYPE.PCC,
  experience_letter: DOCUMENT_TYPE.EXPERIENCE_LETTERS,
};

/**
 * Maps copy/scan types to their original hardcopy counterparts (and vice versa).
 * `baseType` is the logical document family (without variant suffix).
 */
export const DOCUMENT_TYPE_RELATIONS: Record<string, DocumentTypeRelation> = {
  [DOCUMENT_TYPE.PASSPORT]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: "passport",
    pairedDocType: DOCUMENT_TYPE.PASSPORT_ORIGINAL,
  },
  [DOCUMENT_TYPE.PASSPORT_COVER_BIO]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: "passport",
    pairedDocType: DOCUMENT_TYPE.PASSPORT_ORIGINAL,
  },
  [DOCUMENT_TYPE.PASSPORT_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: "passport",
    pairedDocType: DOCUMENT_TYPE.PASSPORT,
  },
  [DOCUMENT_TYPE.DEGREE]: {
    variant: DOCUMENT_VARIANT.COPY,
    baseType: DOCUMENT_TYPE.DEGREE,
    pairedDocType: DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL,
  },
  [DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: DOCUMENT_TYPE.DEGREE,
    pairedDocType: DOCUMENT_TYPE.DEGREE,
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
    baseType: "birth_certificate",
    pairedDocType: null,
  },
  [DOCUMENT_TYPE.SSLC_CERTIFICATE_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: "sslc_certificate",
    pairedDocType: null,
  },
  [DOCUMENT_TYPE.PLUS_TWO_CERTIFICATE_ORIGINAL]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: "plus_two_certificate",
    pairedDocType: null,
  },
  [DOCUMENT_TYPE.ORIGINAL_DOCUMENTS_BUNDLE]: {
    variant: DOCUMENT_VARIANT.ORIGINAL,
    baseType: "original_documents_bundle",
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
  return DOCUMENT_TYPE_CONFIG[normalized as DocumentType]
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
): "Copy" | "Original" | null {
  const variant = getDocumentTypeRelation(docType)?.variant;
  if (variant === DOCUMENT_VARIANT.COPY) return "Copy";
  if (variant === DOCUMENT_VARIANT.ORIGINAL) return "Original";
  return null;
}

export function resolveDocumentTypeWithVariant(docType: string): {
  resolved: DocumentType | undefined;
  variant: DocumentVariant | null;
  pairedDocType: string | null;
} {
  const normalized = normalizeDocumentTypeKey(docType);
  const resolved = DOCUMENT_TYPE_CONFIG[normalized as DocumentType]
    ? (normalized as DocumentType)
    : undefined;
  const relation = DOCUMENT_TYPE_RELATIONS[normalized];

  return {
    resolved,
    variant: relation?.variant ?? null,
    pairedDocType: relation?.pairedDocType ?? null,
  };
}

/**
 * Document Type UI Configuration
 */
export const DOCUMENT_TYPE_CONFIG: Record<
  DocumentType,
  {
    displayName: string;
    description: string;
    category:
      | "identity"
      | "professional"
      | "educational"
      | "employment"
      | "verification"
      | "medical"
      | "other";
    hasExpiry: boolean;
    expiryRequired: boolean;
    hasIssueDate?: boolean;
    issueRequired?: boolean;
    numberFieldLabel?: string;
    maxSizeMB: number;
    allowedFormats: string[];
    icon: string;
    commonlyRequired: boolean;
    variant?: DocumentVariant;
    pairedDocType?: string | null;
  }
> = {
  [DOCUMENT_TYPE.PASSPORT]: {
    displayName: "Passport",
    description: "Valid passport copy (all pages)",
    category: "identity",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Plane",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.PASSPORT_PHOTO]: {
    displayName: "Passport Photo",
    description: "Passport size photo (white background)",
    category: "identity",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 1,
    allowedFormats: ["jpg", "jpeg", "png"],
    icon: "User",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.AADHAAR]: {
    displayName: "Aadhaar Card",
    description: "Government-issued Aadhaar card",
    category: "identity",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "CreditCard",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.PAN_CARD]: {
    displayName: "PAN Card",
    description: "Permanent Account Number card",
    category: "identity",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "CreditCard",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.DRIVING_LICENSE]: {
    displayName: "Driving License",
    description: "Valid driving license",
    category: "identity",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 2,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Car",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.VOTER_ID]: {
    displayName: "Voter ID",
    description: "Government-issued voter ID",
    category: "identity",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "CreditCard",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PROFESSIONAL_LICENSE]: {
    displayName: "Professional License",
    description: "Professional license or registration",
    category: "professional",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Award",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.NURSING_LICENSE]: {
    displayName: "Nursing License",
    description: "Registered Nurse license",
    category: "professional",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Heart",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.MEDICAL_LICENSE]: {
    displayName: "Medical License",
    description: "Medical practitioner license",
    category: "professional",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Stethoscope",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.REGISTRATION_CERTIFICATE]: {
    displayName: "Registration Certificate",
    description: "Professional registration certificate",
    category: "professional",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Award",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE]: {
    displayName: "Experience Certificate",
    description: "Experience certificate (HRD)",
    category: "employment",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Briefcase",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.EXPERIENCE_CERTIFICATES]: {
    displayName: "Experience Certificates",
    description: "Experience certificates (multiple)",
    category: "employment",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Briefcase",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.SAUDI_PROMETRIC]: {
    displayName: "Saudi Prometric Result",
    description: "Saudi Council / Prometric Result",
    category: "professional",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "FileCheck",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.MOH_PROMETRIC]: {
    displayName: "MOH Prometric / License",
    description: "MOH License / Prometric",
    category: "professional",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "Medal",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.QCHP_PROMETRIC]: {
    displayName: "QCHP Prometric / Evaluation",
    description: "QCHP Evaluation / Prometric",
    category: "professional",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "ShieldCheck",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.PROMETRIC_RESULT]: {
    displayName: "Prometric Result",
    description: "Prometric / Examination result (output)",
    category: "professional",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "FileCheck",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.GOOD_STANDING_CERTIFICATE]: {
    displayName: "Good Standing Certificate",
    description: "Certificate of Good Standing from previous regulator/employer",
    category: "verification",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "Shield",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PCC]: {
    displayName: "Police Clearance (PCC)",
    description: "Police Clearance Certificate (PCC)",
    category: "verification",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Shield",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.PASSPORT_COVER_BIO]: {
    displayName: "Passport Cover & Bio Page",
    description: "Passport cover and bio page",
    category: "identity",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Plane",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.NAME_CHANGE_AFFIDAVIT]: {
    displayName: "Name Change Affidavit",
    description: "Affidavit for name change",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.MARRIAGE_CERTIFICATE]: {
    displayName: "Marriage Certificate",
    description: "Marriage certificate (marriage/union proof)",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.BIOMETRIC_ACKNOWLEDGEMENT]: {
    displayName: "Biometric Acknowledgement",
    description: "Acknowledgement/consent for biometric capture",
    category: "verification",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Scan",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PASSPORT_ORIGINAL]: {
    displayName: "Original Passport (presented)",
    description: "Original passport presented / scanned original passport (for in-person verification)",
    category: "identity",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 10,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Plane",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL]: {
    displayName: "Degree Certificate (Original)",
    description: "Original degree certificate",
    category: "educational",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "GraduationCap",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.TRANSCRIPT_ORIGINAL]: {
    displayName: "Academic Transcript (Original)",
    description: "Original academic transcript / mark sheet",
    category: "educational",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ["pdf"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.REGISTRATION_CERTIFICATE_ORIGINAL]: {
    displayName: "Registration Certificate (Original)",
    description: "Original professional registration certificate",
    category: "professional",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Award",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.OFFER_LETTER_ORIGINAL]: {
    displayName: "Offer Letter (Original)",
    description: "Original employment offer letter",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.MARRIAGE_CERTIFICATE_ORIGINAL]: {
    displayName: "Marriage Certificate (Original)",
    description: "Original marriage certificate",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.BIRTH_CERTIFICATE_ORIGINAL]: {
    displayName: "Birth Certificate (Original)",
    description: "Original birth certificate",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PCC_ORIGINAL]: {
    displayName: "Police Clearance (Original)",
    description: "Original police clearance certificate",
    category: "verification",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Shield",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.SSLC_CERTIFICATE_ORIGINAL]: {
    displayName: "SSLC Certificate (Original)",
    description: "Original SSLC certificate",
    category: "educational",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PLUS_TWO_CERTIFICATE_ORIGINAL]: {
    displayName: "Plus Two Certificate (Original)",
    description: "Original Plus Two certificate",
    category: "educational",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE_ORIGINAL]: {
    displayName: "Experience Certificate (Original)",
    description: "Original experience certificate",
    category: "employment",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.ORIGINAL_DOCUMENTS_BUNDLE]: {
    displayName: "Merged Original Documents Scan",
    description: "Merged scan of all collected original documents",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 50,
    allowedFormats: ["pdf"],
    icon: "FileStack",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.E_VISA]: {
    displayName: "e-Visa",
    description: "Electronic visa (e-visa) document or approval",
    category: "verification",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Plane",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.VISA_STAMP]: {
    displayName: "Visa Stamp",
    description: "Visa stamp in passport (if applicable)",
    category: "verification",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Plane",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.FLIGHT_TICKET]: {
    displayName: "Flight Ticket / e-ticket",
    description: "Flight ticket or e-ticket / booking confirmation",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Plane",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.PROMETRIC]: {
    displayName: "Prometric Certificate",
    description: "Prometric exam certificate",
    category: "professional",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "FileCheck",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.DHA]: {
    displayName: "DHA License / Eligibility",
    description: "Dubai Health Authority license or eligibility letter",
    category: "professional",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Medal",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.HAAD]: {
    displayName: "HAAD / DOH License",
    description: "Health Authority Abu Dhabi / Department of Health License",
    category: "professional",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Medal",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.MOH]: {
    displayName: "MOH License",
    description: "Ministry of Health license",
    category: "professional",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Building",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.SCFHS]: {
    displayName: "SCFHS / Saudi Council",
    description: "Saudi Commission for Health Specialties registration",
    category: "professional",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Globe",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.QCHP]: {
    displayName: "QCHP License",
    description: "Qatar Council for Healthcare Practitioners license",
    category: "professional",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "ShieldCheck",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.OMSB]: {
    displayName: "OMSB License",
    description: "Oman Medical Specialty Board license",
    category: "professional",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Award",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.NHRA]: {
    displayName: "NHRA License",
    description: "National Health Regulatory Authority (Bahrain) license",
    category: "professional",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "CheckCircle",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.NMC_UK]: {
    displayName: "NMC UK Registration",
    description: "Nursing and Midwifery Council (UK) registration",
    category: "professional",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "BookOpen",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.CBT]: {
    displayName: "CBT Result",
    description: "Computer Based Test result",
    category: "professional",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "Monitor",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.OET]: {
    displayName: "OET Result",
    description: "Occupational English Test result",
    category: "professional",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "MessageSquare",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.IELTS]: {
    displayName: "IELTS Result",
    description: "International English Language Testing System result",
    category: "professional",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "Languages",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.USMLE]: {
    displayName: "USMLE Result",
    description: "United States Medical Licensing Examination result",
    category: "professional",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "ClipboardCheck",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.NCLEX_RN]: {
    displayName: "NCLEX-RN Result",
    description: "National Council Licensure Examination for Registered Nurses",
    category: "professional",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "Activity",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.ELIGIBILITY_LETTER]: {
    displayName: "Eligibility Letter",
    description: "Document indicating project eligibility",
    category: "verification",
    hasExpiry: true,
    expiryRequired: true,
    hasIssueDate: true,
    issueRequired: true,
    numberFieldLabel: "Eligibility Number",
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "FileSignature",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.DATAFLOW_REPORT]: {
    displayName: "Dataflow Report",
    description: "Dataflow verification report",
    category: "verification",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "FileCheck",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.DEGREE]: {
    displayName: "Degree Certificate",
    description: "Educational degree certificate",
    category: "educational",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "GraduationCap",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.DIPLOMA]: {
    displayName: "Diploma Certificate",
    description: "Diploma certificate",
    category: "educational",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "GraduationCap",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.CERTIFICATE]: {
    displayName: "Certificate",
    description: "Professional or educational certificate",
    category: "educational",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Award",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.TRANSCRIPT]: {
    displayName: "Transcript",
    description: "Academic transcript",
    category: "educational",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ["pdf"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.MARKSHEET]: {
    displayName: "Marksheet",
    description: "Academic marksheet",
    category: "educational",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.RESUME]: {
    displayName: "Resume",
    description: "Professional resume",
    category: "employment",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "doc", "docx"],
    icon: "FileText",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.CV]: {
    displayName: "Curriculum Vitae",
    description: "Detailed CV",
    category: "employment",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "doc", "docx"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.EXPERIENCE_LETTERS]: {
    displayName: "Experience Letters",
    description: "Previous employment experience letter(s)",
    category: "employment",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Briefcase",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.RELIEVING_LETTER]: {
    displayName: "Relieving Letter",
    description: "Relieving letter from previous employer",
    category: "employment",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Briefcase",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.SALARY_SLIP]: {
    displayName: "Salary Slip",
    description: "Recent salary slip",
    category: "employment",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "DollarSign",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.APPOINTMENT_LETTER]: {
    displayName: "Appointment Letter",
    description: "Employment appointment letter",
    category: "employment",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.BACKGROUND_CHECK]: {
    displayName: "Background Check",
    description: "Background verification report",
    category: "verification",
    hasExpiry: true,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "Shield",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.REFERENCE_LETTER]: {
    displayName: "Reference Letter",
    description: "Professional reference letter",
    category: "verification",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Mail",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.MEDICAL_CERTIFICATE]: {
    displayName: "Medical Certificate",
    description: "Medical fitness certificate",
    category: "medical",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Activity",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.MEDICAL_FITNESS]: {
    displayName: "Medical Fitness Report",
    description: "Complete medical fitness report",
    category: "medical",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 10,
    allowedFormats: ["pdf"],
    icon: "Activity",
    commonlyRequired: true,
  },
  [DOCUMENT_TYPE.VACCINATION_CERTIFICATE]: {
    displayName: "Vaccination Certificate",
    description: "Vaccination records",
    category: "medical",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Syringe",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.COVID_VACCINATION]: {
    displayName: "COVID-19 Vaccination",
    description: "COVID-19 vaccination certificate",
    category: "medical",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Shield",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.MEDICAL_INSURANCE]: {
    displayName: "Medical Insurance",
    description: "Medical insurance documents",
    category: "medical",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "Heart",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.INTRODUCTION_VIDEO]: {
    displayName: "Introduction Video",
    description: "Candidate introduction video for project submission",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 100,
    allowedFormats: ["mp4", "webm", "mov", "avi"],
    icon: "Video",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.BANK_DETAILS]: {
    displayName: "Bank Account Details",
    description: "Bank account proof (cancelled cheque/passbook)",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 2,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "Building",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.OFFER_LETTER]: {
    displayName: "Offer Letter",
    description: "Employment offer letter",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.JOINING_LETTER]: {
    displayName: "Joining Letter",
    description: "Joining confirmation letter",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf"],
    icon: "FileText",
    commonlyRequired: false,
  },
  [DOCUMENT_TYPE.OTHER]: {
    displayName: "Other Document",
    description: "Other supporting documents",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 10,
    allowedFormats: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
    icon: "File",
    commonlyRequired: false,
  },
};

function resolveDocumentType(docType: string): DocumentType | undefined {
  const normalized = normalizeDocumentTypeKey(docType);
  return DOCUMENT_TYPE_CONFIG[normalized as DocumentType]
    ? (normalized as DocumentType)
    : undefined;
}

/**
 * Get document type configuration
 */
export function getDocumentTypeConfig(docType: DocumentType | string) {
  const resolved = resolveDocumentType(docType);
  return resolved ? DOCUMENT_TYPE_CONFIG[resolved] : undefined;
}

/**
 * Get document types by category
 */
export function getDocumentTypesByCategory(
  category:
    | "identity"
    | "professional"
    | "educational"
    | "employment"
    | "verification"
    | "medical"
    | "other"
): DocumentType[] {
  return Object.entries(DOCUMENT_TYPE_CONFIG)
    .filter(([_, config]) => config.category === category)
    .map(([type]) => type as DocumentType);
}

/**
 * Get commonly required document types
 */
export function getCommonlyRequiredDocTypes(): DocumentType[] {
  return Object.entries(DOCUMENT_TYPE_CONFIG)
    .filter(([_, config]) => config.commonlyRequired)
    .map(([type]) => type as DocumentType);
}

/**
 * Validate if file extension is allowed for document type
 */
export function isValidFileExtension(
  docType: DocumentType,
  filename: string
): boolean {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const config = getDocumentTypeConfig(docType);
  if (!config) return false;
  return config.allowedFormats.includes(extension);
}

/**
 * Validate file size for document type
 */
export function isValidFileSize(
  docType: DocumentType,
  sizeMB: number
): boolean {
  const config = getDocumentTypeConfig(docType);
  if (!config) return false;
  return sizeMB <= config.maxSizeMB;
}

/**
 * Get formatted allowed formats string
 */
export function getAllowedFormatsString(docType: DocumentType): string {
  const config = getDocumentTypeConfig(docType);
  if (!config) return "";
  return config.allowedFormats.map((f) => f.toUpperCase()).join(", ");
}

/** Doc types that represent a passport copy or original (excludes passport_photo). */
export const PASSPORT_DOCUMENT_TYPES = [
  DOCUMENT_TYPE.PASSPORT,
  DOCUMENT_TYPE.PASSPORT_ORIGINAL,
  DOCUMENT_TYPE.PASSPORT_COVER_BIO,
  "passport",
] as const;

export function isPassportDocumentType(docType: string): boolean {
  return (PASSPORT_DOCUMENT_TYPES as readonly string[]).includes(docType);
}

export function isEligibilityLetterType(docType: string): boolean {
  return docType === DOCUMENT_TYPE.ELIGIBILITY_LETTER;
}

export function getDocumentNumberLabel(docType: string): string {
  if (isPassportDocumentType(docType)) {
    return "Passport Number";
  }
  if (isEligibilityLetterType(docType)) {
    return "Eligibility Number";
  }
  const config = getDocumentTypeConfig(docType);
  return config?.numberFieldLabel ?? "Document Number";
}

/** Formats supported when building a unified client PDF (pdf-lib). */
const PDF_MERGE_ALLOWED_FORMATS = new Set(["pdf", "jpg", "jpeg", "png"]);

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

  const config = DOCUMENT_TYPE_CONFIG[docType as DocumentType];
  if (config?.allowedFormats?.length) {
    return config.allowedFormats.some((format) => PDF_MERGE_ALLOWED_FORMATS.has(format));
  }

  const fileName = (doc.fileName || "").toLowerCase();
  return (
    fileName.endsWith(".pdf") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".png")
  );
}

/**
 * Whether a verified document may be attached individually when sending to client.
 * Excludes introduction video and other client-send excluded types.
 */
export function isClientSendableDocument(doc: {
  docType?: string | null;
}): boolean {
  const docType = doc.docType?.trim();
  if (!docType) return false;
  return !(PDF_MERGE_EXCLUDED_DOC_TYPES as readonly string[]).includes(docType);
}
