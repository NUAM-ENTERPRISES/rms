export const CANDIDATE_IMPORT_QUEUE = 'candidate-import';
export const DOCUMENT_CLASSIFICATION_QUEUE = 'candidate-document-classification';

export const CANDIDATE_IMPORT_JOB = 'parse-and-map-batch';
export const DOCUMENT_CLASSIFICATION_JOB = 'classify-document-bundle';

export interface CandidateImportJobData {
  batchId: string;
  /** When set, every sheet is owned by this recruiter (self-upload). */
  defaultRecruiterId?: string;
  /** Only read red (active) recruiter tabs; set for full multi-tab workbooks. */
  activeTabsOnly: boolean;
}

export interface DocumentClassificationJobData {
  bundleId: string;
}

export const BATCH_STATUS = {
  ANALYZING: 'analyzing',
  REVIEW: 'review',
  IMPORTING: 'importing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const ROW_STATUS = {
  READY: 'ready',
  NEEDS_REVIEW: 'needs_review',
  DUPLICATE: 'duplicate',
  INVALID: 'invalid',
  IMPORTED: 'imported',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export const BUNDLE_STATUS = {
  QUEUED: 'queued',
  ANALYZING: 'analyzing',
  REVIEW: 'review',
  APPLIED: 'applied',
  FAILED: 'failed',
} as const;

export const SEGMENT_STATUS = {
  SUGGESTED: 'suggested',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  APPLIED: 'applied',
  FAILED: 'failed',
} as const;

/** Recruiter workbooks are large but not unbounded. */
export const MAX_IMPORT_FILE_BYTES = 25 * 1024 * 1024;
/** Matches the `original_documents_bundle` ceiling in document-types.ts. */
export const MAX_BUNDLE_FILE_BYTES = 50 * 1024 * 1024;
