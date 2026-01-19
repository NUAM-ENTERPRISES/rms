import { DOCUMENT_TYPE } from '../common/constants/document-types';

/**
 * Document types expected during the ELIGIBILITY step.
 * Kept as a constant for reuse and documentation, but the authoritative
 * source of truth remains the `countryDocumentRequirement` rows in the DB.
 */
export const ELIGIBILITY_INPUT_DOCS = [
  DOCUMENT_TYPE.DEGREE_CERTIFICATE,
  DOCUMENT_TYPE.TRANSCRIPT,
  DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE,
  DOCUMENT_TYPE.REGISTRATION_CERTIFICATE,
  DOCUMENT_TYPE.PASSPORT_COPY,
];

export const PROMETRIC_OUTPUT_DOCS = [
  DOCUMENT_TYPE.PROMETRIC_RESULT,
];
