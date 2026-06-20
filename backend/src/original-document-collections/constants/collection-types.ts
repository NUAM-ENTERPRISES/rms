import { DOCUMENT_TYPE } from '../../common/constants/document-types';

export const COLLECTION_TYPE = {
  DIRECT: 'direct',
  RECRUITER: 'recruiter',
  INTERVIEW_COORDINATOR: 'interview_coordinator',
  AGENT: 'agent',
  COURIER: 'courier',
} as const;

export type CollectionType =
  (typeof COLLECTION_TYPE)[keyof typeof COLLECTION_TYPE];

export const COLLECTION_TYPES = Object.values(COLLECTION_TYPE);

export const DIRECT_OFFICE = {
  KOCHI: 'kochi',
  DELHI: 'delhi',
  OTHER: 'other',
} as const;

export const DIRECT_OFFICES = Object.values(DIRECT_OFFICE);

export const COLLECTION_STATUS = {
  DRAFT: 'draft',
  MERGED_UPLOADED: 'merged_uploaded',
  LOCKER_SUBMITTED: 'locker_submitted',
  COMPLETED: 'completed',
} as const;

export const COURIER_PARTNERS = [
  'Blue Dart',
  'DTDC',
  'Delhivery',
  'India Post',
  'FedEx',
  'DHL',
  'Other',
] as const;

/** Default checklist shown in DCE intake UI */
export const ORIGINAL_DOCUMENT_CHECKLIST = [
  DOCUMENT_TYPE.PASSPORT_ORIGINAL,
  DOCUMENT_TYPE.DEGREE_CERTIFICATE_ORIGINAL,
  DOCUMENT_TYPE.REGISTRATION_CERTIFICATE_ORIGINAL,
  DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE_ORIGINAL,
  DOCUMENT_TYPE.SSLC_CERTIFICATE_ORIGINAL,
  DOCUMENT_TYPE.PLUS_TWO_CERTIFICATE_ORIGINAL,
  DOCUMENT_TYPE.TRANSCRIPT_ORIGINAL,
  DOCUMENT_TYPE.PCC_ORIGINAL,
] as const;
