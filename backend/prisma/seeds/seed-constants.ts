/**
 * Seed-local constants so prisma seeds run in the prod Docker image
 * without requiring /app/src (which is not shipped in the runtime image).
 * Values must stay aligned with src/common/constants/*.
 */

export const SEED_ROLE_NAMES = {
  OPERATIONS: 'Operations',
} as const;

/** Subset of DOCUMENT_TYPE values used by country-documents.seed.ts */
export const SEED_DOCUMENT_TYPE = {
  PASSPORT_COVER_BIO: 'passport_cover_bio',
  DEGREE_CERTIFICATE: 'degree_certificate',
  REGISTRATION_CERTIFICATE: 'registration_certificate',
  EXPERIENCE_CERTIFICATE: 'experience_certificate',
  EXPERIENCE_CERTIFICATES: 'experience_certificates',
  EXPERIENCE_LETTERS: 'experience_letters',
  SAUDI_PROMETRIC: 'saudi_prometric',
  MOH_PROMETRIC: 'moh_prometric',
  QCHP_PROMETRIC: 'qchp_prometric',
  DATAFLOW_REPORT: 'dataflow_report',
  PCC: 'pcc',
  MEDICAL_FITNESS: 'medical_fitness',
  PASSPORT_PHOTO: 'passport_photo',
  PASSPORT_COPY: 'passport_copy',
  TRANSCRIPT: 'transcript',
  NAME_CHANGE_AFFIDAVIT: 'name_change_affidavit',
  PROMETRIC_RESULT: 'prometric_result',
  ELIGIBILITY_LETTER: 'eligibility_letter',
  GOOD_STANDING_CERTIFICATE: 'good_standing_certificate',
  MARRIAGE_CERTIFICATE: 'marriage_certificate',
  BIOMETRIC_ACKNOWLEDGEMENT: 'biometric_acknowledgement',
  PASSPORT_ORIGINAL: 'passport_original',
  E_VISA: 'e_visa',
  VISA_STAMP: 'visa_stamp',
  FLIGHT_TICKET: 'flight_ticket',
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
} as const;
