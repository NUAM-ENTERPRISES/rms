/**
 * Status Constants - Affiniks RMS
 *
 * This file is the SINGLE SOURCE OF TRUTH for all status values in the system.
 * DO NOT hardcode status strings elsewhere - always import from this file.
 *
 * @module common/constants/statuses
 */

// ==================== CANDIDATE PROJECT MAP STATUSES ====================

/**
 * Candidate-Project Lifecycle Status Constants
 * Tracks the complete journey of a candidate through a project nomination
 */
export const CANDIDATE_PROJECT_STATUS = {
  // === Nomination Stage ===
  NOMINATED: 'nominated',
  PENDING_DOCUMENTS: 'pending_documents',

  // === Document Verification Stage ===
  DOCUMENTS_SUBMITTED: 'documents_submitted',
  VERIFICATION_IN_PROGRESS: 'verification_in_progress',
  DOCUMENTS_VERIFIED: 'documents_verified',

  // === Approval Stage ===
  APPROVED: 'approved',

  // === Interview Stage ===
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  INTERVIEW_COMPLETED: 'interview_completed',
  INTERVIEW_PASSED: 'interview_passed',

  // === Selection Stage ===
  SELECTED: 'selected',

  // === Processing Stage ===
  PROCESSING: 'processing',

  // === Final Stage ===
  HIRED: 'hired',

  // === Rejection States ===
  REJECTED_DOCUMENTS: 'rejected_documents',
  REJECTED_INTERVIEW: 'rejected_interview',
  REJECTED_SELECTION: 'rejected_selection',

  // === Other States ===
  WITHDRAWN: 'withdrawn',
  ON_HOLD: 'on_hold',
} as const;

export type CandidateProjectStatus =
  (typeof CANDIDATE_PROJECT_STATUS)[keyof typeof CANDIDATE_PROJECT_STATUS];

/**
 * Valid state transitions for Candidate-Project status
 * Enforces workflow rules and prevents invalid transitions
 */
export const CANDIDATE_PROJECT_STATUS_TRANSITIONS: Record<
  CandidateProjectStatus,
  CandidateProjectStatus[]
> = {
  [CANDIDATE_PROJECT_STATUS.NOMINATED]: [
    CANDIDATE_PROJECT_STATUS.PENDING_DOCUMENTS,
    CANDIDATE_PROJECT_STATUS.WITHDRAWN,
  ],
  [CANDIDATE_PROJECT_STATUS.PENDING_DOCUMENTS]: [
    CANDIDATE_PROJECT_STATUS.DOCUMENTS_SUBMITTED,
    CANDIDATE_PROJECT_STATUS.WITHDRAWN,
  ],
  [CANDIDATE_PROJECT_STATUS.DOCUMENTS_SUBMITTED]: [
    CANDIDATE_PROJECT_STATUS.VERIFICATION_IN_PROGRESS,
    CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS,
  ],
  [CANDIDATE_PROJECT_STATUS.VERIFICATION_IN_PROGRESS]: [
    CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED,
    CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS,
    CANDIDATE_PROJECT_STATUS.PENDING_DOCUMENTS, // Resubmission needed
  ],
  [CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED]: [
    CANDIDATE_PROJECT_STATUS.APPROVED,
    CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS,
  ],
  [CANDIDATE_PROJECT_STATUS.APPROVED]: [
    CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED,
    CANDIDATE_PROJECT_STATUS.WITHDRAWN,
    CANDIDATE_PROJECT_STATUS.ON_HOLD,
  ],
  [CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED]: [
    CANDIDATE_PROJECT_STATUS.INTERVIEW_COMPLETED,
    CANDIDATE_PROJECT_STATUS.WITHDRAWN,
  ],
  [CANDIDATE_PROJECT_STATUS.INTERVIEW_COMPLETED]: [
    CANDIDATE_PROJECT_STATUS.INTERVIEW_PASSED,
    CANDIDATE_PROJECT_STATUS.REJECTED_INTERVIEW,
    CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED, // Reschedule
  ],
  [CANDIDATE_PROJECT_STATUS.INTERVIEW_PASSED]: [
    CANDIDATE_PROJECT_STATUS.SELECTED,
    CANDIDATE_PROJECT_STATUS.REJECTED_SELECTION,
    CANDIDATE_PROJECT_STATUS.ON_HOLD,
  ],
  [CANDIDATE_PROJECT_STATUS.SELECTED]: [CANDIDATE_PROJECT_STATUS.PROCESSING],
  [CANDIDATE_PROJECT_STATUS.PROCESSING]: [
    CANDIDATE_PROJECT_STATUS.HIRED,
    CANDIDATE_PROJECT_STATUS.ON_HOLD,
  ],
  [CANDIDATE_PROJECT_STATUS.ON_HOLD]: [
    CANDIDATE_PROJECT_STATUS.APPROVED,
    CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED,
    CANDIDATE_PROJECT_STATUS.SELECTED,
    CANDIDATE_PROJECT_STATUS.PROCESSING,
    CANDIDATE_PROJECT_STATUS.WITHDRAWN,
  ],
  // Terminal states - no transitions
  [CANDIDATE_PROJECT_STATUS.HIRED]: [],
  [CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS]: [],
  [CANDIDATE_PROJECT_STATUS.REJECTED_INTERVIEW]: [],
  [CANDIDATE_PROJECT_STATUS.REJECTED_SELECTION]: [],
  [CANDIDATE_PROJECT_STATUS.WITHDRAWN]: [],
};

/**
 * Helper to validate if a status transition is allowed
 */
export function canTransitionStatus(
  from: CandidateProjectStatus,
  to: CandidateProjectStatus,
): boolean {
  return (
    CANDIDATE_PROJECT_STATUS_TRANSITIONS[from]?.includes(to as any) ?? false
  );
}

/**
 * Get all allowed next statuses from current status
 */
export function getAllowedNextStatuses(
  current: CandidateProjectStatus,
): CandidateProjectStatus[] {
  return CANDIDATE_PROJECT_STATUS_TRANSITIONS[current] ?? [];
}

// ==================== DOCUMENT STATUSES ====================

/**
 * Document Verification Status Constants
 */
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  RESUBMISSION_REQUIRED: 'resubmission_required',
} as const;

export type DocumentStatus =
  (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

// ==================== INTERVIEW OUTCOMES ====================

/**
 * Interview Outcome Constants
 */
export const INTERVIEW_OUTCOME = {
  PASSED: 'passed',
  FAILED: 'failed',
  RESCHEDULED: 'rescheduled',
  NO_SHOW: 'no_show',
  CANCELLED: 'cancelled',
} as const;

export type InterviewOutcome =
  (typeof INTERVIEW_OUTCOME)[keyof typeof INTERVIEW_OUTCOME];

// ==================== PROCESSING STATUSES ====================

/**
 * Processing Stage Status Constants
 */
export const PROCESSING_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ON_HOLD: 'on_hold',
} as const;

export type ProcessingStatus =
  (typeof PROCESSING_STATUS)[keyof typeof PROCESSING_STATUS];

/**
 * Medical Clearance Status Constants
 */
export const MEDICAL_CLEARANCE = {
  FIT: 'fit',
  UNFIT: 'unfit',
  CONDITIONAL: 'conditional',
} as const;

export type MedicalClearance =
  (typeof MEDICAL_CLEARANCE)[keyof typeof MEDICAL_CLEARANCE];

/**
 * Joining Status Constants
 */
export const JOINING_STATUS = {
  PENDING: 'pending',
  JOINED: 'joined',
  NO_SHOW: 'no_show',
  DELAYED: 'delayed',
} as const;

export type JoiningStatus =
  (typeof JOINING_STATUS)[keyof typeof JOINING_STATUS];

// ==================== CANDIDATE GLOBAL STATUSES ====================

/**
 * Candidate Global Status Constants (Legacy - kept for compatibility)
 * Note: This is being phased out in favor of per-project statuses
 */
export const CANDIDATE_STATUS = {
  NEW: 'new',
  NOMINATED: 'nominated',
  VERIFIED: 'verified',
  INTERVIEWING: 'interviewing',
  SELECTED: 'selected',
  PROCESSING: 'processing',
  HIRED: 'hired',
  REJECTED: 'rejected',
} as const;

export type CandidateStatus =
  (typeof CANDIDATE_STATUS)[keyof typeof CANDIDATE_STATUS];

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if a status is a terminal (final) state
 */
export function isTerminalStatus(status: CandidateProjectStatus): boolean {
  const terminalStatuses: CandidateProjectStatus[] = [
    CANDIDATE_PROJECT_STATUS.HIRED,
    CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS,
    CANDIDATE_PROJECT_STATUS.REJECTED_INTERVIEW,
    CANDIDATE_PROJECT_STATUS.REJECTED_SELECTION,
    CANDIDATE_PROJECT_STATUS.WITHDRAWN,
  ];
  return terminalStatuses.includes(status);
}

/**
 * Check if a status is a rejection state
 */
export function isRejectionStatus(status: CandidateProjectStatus): boolean {
  return (
    status === CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS ||
    status === CANDIDATE_PROJECT_STATUS.REJECTED_INTERVIEW ||
    status === CANDIDATE_PROJECT_STATUS.REJECTED_SELECTION
  );
}

/**
 * Get the stage of a status
 */
export function getStatusStage(status: CandidateProjectStatus): string {
  if (status.startsWith('rejected')) return 'rejected';
  if (status === CANDIDATE_PROJECT_STATUS.WITHDRAWN) return 'withdrawn';
  if (status === CANDIDATE_PROJECT_STATUS.HIRED) return 'final';

  const stageMap: Record<string, string> = {
    nominated: 'nomination',
    pending_documents: 'documents',
    documents_submitted: 'documents',
    verification_in_progress: 'documents',
    documents_verified: 'documents',
    approved: 'approval',
    interview_scheduled: 'interview',
    interview_completed: 'interview',
    interview_passed: 'interview',
    selected: 'selection',
    processing: 'processing',
    on_hold: 'on_hold',
  };

  return stageMap[status] ?? 'unknown';
}
