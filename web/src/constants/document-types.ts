/**
 * Document Type Constants - Affiniks RMS Frontend
 *
 * MUST match backend: backend/src/common/constants/document-types.ts
 *
 * @module constants/document-types
 */

export const DOCUMENT_TYPE = {
  // Identity Documents
  PASSPORT: "passport",
  AADHAAR: "aadhaar",
  PAN_CARD: "pan_card",
  DRIVING_LICENSE: "driving_license",
  VOTER_ID: "voter_id",

  // Professional Documents
  PROFESSIONAL_LICENSE: "professional_license",
  NURSING_LICENSE: "nursing_license",
  MEDICAL_LICENSE: "medical_license",
  REGISTRATION_CERTIFICATE: "registration_certificate",

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

  // Educational Documents
  DEGREE: "degree",
  DIPLOMA: "diploma",
  CERTIFICATE: "certificate",
  TRANSCRIPT: "transcript",
  MARKSHEET: "marksheet",

  // Employment Documents
  RESUME: "resume",
  CV: "cv",
  EXPERIENCE_LETTER: "experience_letter",
  RELIEVING_LETTER: "relieving_letter",
  SALARY_SLIP: "salary_slip",
  APPOINTMENT_LETTER: "appointment_letter",

  // Verification Documents
  BACKGROUND_CHECK: "background_check",
  POLICE_CLEARANCE: "police_clearance",
  REFERENCE_LETTER: "reference_letter",

  // Medical Documents
  MEDICAL_CERTIFICATE: "medical_certificate",
  MEDICAL_FITNESS: "medical_fitness",
  VACCINATION_CERTIFICATE: "vaccination_certificate",
  COVID_VACCINATION: "covid_vaccination",
  MEDICAL_INSURANCE: "medical_insurance",

  // Other Documents
  PHOTO: "photo",
  BANK_DETAILS: "bank_details",
  OFFER_LETTER: "offer_letter",
  JOINING_LETTER: "joining_letter",
  OTHER: "other",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE];

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
    maxSizeMB: number;
    allowedFormats: string[];
    icon: string;
    commonlyRequired: boolean;
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
    expiryRequired: false,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    icon: "FileSignature",
    commonlyRequired: false,
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
  [DOCUMENT_TYPE.EXPERIENCE_LETTER]: {
    displayName: "Experience Letter",
    description: "Previous employment experience letter",
    category: "employment",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 5,
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
  [DOCUMENT_TYPE.POLICE_CLEARANCE]: {
    displayName: "Police Clearance",
    description: "Police clearance certificate",
    category: "verification",
    hasExpiry: true,
    expiryRequired: true,
    maxSizeMB: 5,
    allowedFormats: ["pdf", "jpg", "jpeg", "png"],
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
  [DOCUMENT_TYPE.PHOTO]: {
    displayName: "Photograph",
    description: "Passport-size photograph",
    category: "other",
    hasExpiry: false,
    expiryRequired: false,
    maxSizeMB: 1,
    allowedFormats: ["jpg", "jpeg", "png"],
    icon: "User",
    commonlyRequired: true,
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

/**
 * Get document type configuration
 */
export function getDocumentTypeConfig(docType: DocumentType) {
  return DOCUMENT_TYPE_CONFIG[docType];
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
  return sizeMB <= config.maxSizeMB;
}

/**
 * Get formatted allowed formats string
 */
export function getAllowedFormatsString(docType: DocumentType): string {
  const config = getDocumentTypeConfig(docType);
  return config.allowedFormats.map((f) => f.toUpperCase()).join(", ");
}
