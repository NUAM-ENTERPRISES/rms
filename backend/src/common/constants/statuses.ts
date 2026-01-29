/**
 * Status Constants - Affiniks RMS
 *
 * This file is the SINGLE SOURCE OF TRUTH for all status values in the system.
 * DO NOT hardcode status strings elsewhere - always import from this file.
 *
 * @module common/constants/statuses
 */

import { CANCELLED } from "dns";

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

  // === Screening Stage (formerly Mock Interview) ===
  SCREENING_SCHEDULED: 'screening_scheduled',
  SCREENING_COMPLETED: 'screening_completed',
  SCREENING_PASSED: 'screening_passed',
  SCREENING_FAILED: 'screening_failed',

  // === Training/Screening Stage ===
  TRAINING_ASSIGNED: 'training_assigned',
  TRAINING_IN_PROGRESS: 'training_in_progress',
  TRAINING_COMPLETED: 'training_completed',
  READY_FOR_REASSESSMENT: 'ready_for_reassessment',

  // === Approval Stage ===
  APPROVED: 'approved',

  // === Client Interview Stage ===
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
    CANDIDATE_PROJECT_STATUS.SCREENING_SCHEDULED, // Optional: Send to screening
    CANDIDATE_PROJECT_STATUS.APPROVED, // Direct path: Skip screening
    CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS,
  ],
  // === Screening Workflow (formerly Mock Interview) ===
  [CANDIDATE_PROJECT_STATUS.SCREENING_SCHEDULED]: [
    CANDIDATE_PROJECT_STATUS.SCREENING_COMPLETED,
    CANDIDATE_PROJECT_STATUS.WITHDRAWN,
  ],
  [CANDIDATE_PROJECT_STATUS.SCREENING_COMPLETED]: [
    CANDIDATE_PROJECT_STATUS.SCREENING_PASSED,
    CANDIDATE_PROJECT_STATUS.SCREENING_FAILED,
    CANDIDATE_PROJECT_STATUS.SCREENING_SCHEDULED, // Reschedule
  ],
  [CANDIDATE_PROJECT_STATUS.SCREENING_PASSED]: [
    CANDIDATE_PROJECT_STATUS.APPROVED, // Proceed to approval
    CANDIDATE_PROJECT_STATUS.ON_HOLD,
  ],
  [CANDIDATE_PROJECT_STATUS.SCREENING_FAILED]: [
    CANDIDATE_PROJECT_STATUS.TRAINING_ASSIGNED, // Assign training
    CANDIDATE_PROJECT_STATUS.REJECTED_INTERVIEW, // Reject candidate
  ],
  // === Training Workflow ===
  [CANDIDATE_PROJECT_STATUS.TRAINING_ASSIGNED]: [
    CANDIDATE_PROJECT_STATUS.TRAINING_IN_PROGRESS,
    CANDIDATE_PROJECT_STATUS.WITHDRAWN,
  ],
  [CANDIDATE_PROJECT_STATUS.TRAINING_IN_PROGRESS]: [
    CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED,
    CANDIDATE_PROJECT_STATUS.WITHDRAWN,
  ],
  [CANDIDATE_PROJECT_STATUS.TRAINING_COMPLETED]: [
    CANDIDATE_PROJECT_STATUS.READY_FOR_REASSESSMENT,
  ],
  [CANDIDATE_PROJECT_STATUS.READY_FOR_REASSESSMENT]: [
    CANDIDATE_PROJECT_STATUS.SCREENING_SCHEDULED, // Retry screening
    CANDIDATE_PROJECT_STATUS.APPROVED, // Direct approval
    CANDIDATE_PROJECT_STATUS.WITHDRAWN,
  ],
  // === Approval & Client Interview ===
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
  RESUBMITTED: 'resubmitted',
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
  COMPLETED: 'completed',
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

// ==================== MOCK INTERVIEW CONSTANTS ====================

export const SCREENING_STATUS = {
  ASSIGNED_TO_MAIN_INTERVIEW: 'assigned',
  SCHEDULED: 'scheduled',
  RESHEDULED: 'rescheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PASSED: 'passed',
  FAILED: 'failed',
  MISSED: 'missed',
  CANCELLED: 'cancelled',
} as const;

export type ScreeningStatus =
  (typeof SCREENING_STATUS)[keyof typeof SCREENING_STATUS];

/**
 * Mock Interview Decision Constants
 */
export const SCREENING_DECISION = {
  APPROVED: 'approved',
  NEEDS_TRAINING: 'needs_training',
  REJECTED: 'rejected',
} as const;

export type ScreeningDecision =
  (typeof SCREENING_DECISION)[keyof typeof SCREENING_DECISION];

/**
 * Mock Interview Mode Constants
 */
export const SCREENING_MODE = {
  VIDEO: 'video',
  PHONE: 'phone',
  IN_PERSON: 'in_person',
} as const;

export type ScreeningMode =
  (typeof SCREENING_MODE)[keyof typeof SCREENING_MODE];

/**
 * Mock Interview Checklist Category Constants
 */
export const SCREENING_CATEGORY = {
  TECHNICAL_SKILLS: 'technical_skills',
  COMMUNICATION: 'communication',
  PROFESSIONALISM: 'professionalism',
  ROLE_SPECIFIC: 'role_specific',
} as const;

export type ScreeningCategory =
  (typeof SCREENING_CATEGORY)[keyof typeof SCREENING_CATEGORY];

// ==================== TRAINING CONSTANTS ====================

/**
 * Training Status Constants
 */
export const TRAINING_STATUS = {
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type TrainingStatus =
  (typeof TRAINING_STATUS)[keyof typeof TRAINING_STATUS];

/**
 * Training Type Constants
 */
export const TRAINING_TYPE = {
  INTERVIEW_SKILLS: 'interview_skills',
  TECHNICAL: 'technical',
  COMMUNICATION: 'communication',
  ROLE_SPECIFIC: 'role_specific',
  BASIC: 'basic',
} as const;

export type TrainingType = (typeof TRAINING_TYPE)[keyof typeof TRAINING_TYPE];

/**
 * Training Priority Constants
 */
export const TRAINING_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type TrainingPriority =
  (typeof TRAINING_PRIORITY)[keyof typeof TRAINING_PRIORITY];

/**
 * Training event constants used in interview/status history when a basic training is assigned
 */
export const TRAINING_EVENT = {
  BASIC_ASSIGNED: 'basic_training_assigned',
} as const;

export type TrainingEvent = (typeof TRAINING_EVENT)[keyof typeof TRAINING_EVENT];

/**
 * Training Session Performance Constants
 */
export const TRAINING_PERFORMANCE = {
  POOR: 'poor',
  FAIR: 'fair',
  GOOD: 'good',
  EXCELLENT: 'excellent',
} as const;

export type TrainingPerformance =
  (typeof TRAINING_PERFORMANCE)[keyof typeof TRAINING_PERFORMANCE];

// ==================== CANDIDATE GLOBAL STATUSES ====================

/**
 * Candidate Global Status Constants - New Status System
 * Tracks candidate engagement and follow-up status
 */
export const CANDIDATE_STATUS = {
  // Initial status when candidate is created
  UNTOUCHED: 'untouched',

  // Engagement statuses
  INTERESTED: 'interested',
  NOT_INTERESTED: 'not_interested',
  NOT_ELIGIBLE: 'not_eligible',
  OTHER_ENQUIRY: 'other_enquiry',
  FUTURE: 'future',
  ON_HOLD: 'on_hold',
  RNR: 'rnr', // Ringing No Response

  // Qualification status
  QUALIFIED: 'qualified',

  // Legacy statuses (kept for compatibility)
  NEW: 'new',
  NOMINATED: 'nominated',
  VERIFIED: 'verified',
  INTERVIEWING: 'interviewing',
  SELECTED: 'selected',
  PROCESSING: 'processing',
  HIRED: 'hired',
  REJECTED: 'rejected',
  DEPLOYED: 'deployed',
} as const;

export type CandidateStatus =
  (typeof CANDIDATE_STATUS)[keyof typeof CANDIDATE_STATUS];

// ==================== STATUS CONFIGURATION ====================

export interface StatusConfig {
  label: string;
  description: string;
  color: string;
  badgeClass: string;
  icon: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export const CANDIDATE_STATUS_CONFIG: Record<CandidateStatus, StatusConfig> = {
  [CANDIDATE_STATUS.UNTOUCHED]: {
    label: 'Untouched',
    description: 'New candidate, not yet contacted',
    color: 'gray',
    badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: 'User',
    priority: 'high',
  },
  [CANDIDATE_STATUS.INTERESTED]: {
    label: 'Interested',
    description: 'Candidate has shown interest',
    color: 'green',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    icon: 'ThumbsUp',
    priority: 'high',
  },
  [CANDIDATE_STATUS.NOT_INTERESTED]: {
    label: 'Not Interested',
    description: 'Candidate declined the opportunity',
    color: 'red',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: 'XCircle',
    priority: 'low',
  },
  [CANDIDATE_STATUS.NOT_ELIGIBLE]: {
    label: 'Not Eligible',
    description: 'Candidate does not meet requirements',
    color: 'red',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: 'XCircle',
    priority: 'low',
  },
  [CANDIDATE_STATUS.OTHER_ENQUIRY]: {
    label: 'Other Enquiry',
    description: 'Candidate has other questions or needs',
    color: 'orange',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: 'MessageCircle',
    priority: 'medium',
  },
  [CANDIDATE_STATUS.FUTURE]: {
    label: 'Future',
    description: 'Candidate for future opportunities',
    color: 'blue',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'Clock',
    priority: 'low',
  },
  [CANDIDATE_STATUS.ON_HOLD]: {
    label: 'On Hold',
    description: 'Candidate temporarily on hold',
    color: 'yellow',
    badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: 'Pause',
    priority: 'medium',
  },
  [CANDIDATE_STATUS.RNR]: {
    label: 'RNR',
    description: 'Ringing No Response - requires CRE handling',
    color: 'red',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: 'PhoneOff',
    priority: 'urgent',
  },
  [CANDIDATE_STATUS.QUALIFIED]: {
    label: 'Qualified',
    description: 'Candidate has been qualified',
    color: 'green',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    icon: 'CheckCircle',
    priority: 'high',
  },
  [CANDIDATE_STATUS.DEPLOYED]: {
    label: 'Deployed',
    description: 'Candidate has been deployed',
    color: 'green',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    icon: 'Globe',
    priority: 'medium',
  },
  // Legacy statuses
  [CANDIDATE_STATUS.NEW]: {
    label: 'New',
    description: 'New candidate',
    color: 'blue',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'UserPlus',
    priority: 'high',
  },
  [CANDIDATE_STATUS.NOMINATED]: {
    label: 'Nominated',
    description: 'Candidate has been nominated',
    color: 'blue',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'UserCheck',
    priority: 'high',
  },
  [CANDIDATE_STATUS.VERIFIED]: {
    label: 'Verified',
    description: 'Candidate documents verified',
    color: 'green',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    icon: 'CheckCircle2',
    priority: 'high',
  },
  [CANDIDATE_STATUS.INTERVIEWING]: {
    label: 'Interviewing',
    description: 'Candidate is in interview process',
    color: 'purple',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: 'Users',
    priority: 'high',
  },
  [CANDIDATE_STATUS.SELECTED]: {
    label: 'Selected',
    description: 'Candidate has been selected',
    color: 'green',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    icon: 'Star',
    priority: 'high',
  },
  [CANDIDATE_STATUS.PROCESSING]: {
    label: 'Processing',
    description: 'Candidate is being processed',
    color: 'orange',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: 'Cog',
    priority: 'medium',
  },
  [CANDIDATE_STATUS.HIRED]: {
    label: 'Hired',
    description: 'Candidate has been hired',
    color: 'green',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    icon: 'BadgeCheck',
    priority: 'low',
  },
  [CANDIDATE_STATUS.REJECTED]: {
    label: 'Rejected',
    description: 'Candidate has been rejected',
    color: 'red',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: 'XCircle',
    priority: 'low',
  },
};

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
    // Screening Stage (formerly Mock Interview)
    screening_scheduled: 'screening',
    screening_completed: 'screening',
    screening_passed: 'screening',
    screening_failed: 'screening',
    // Training Stage
    training_assigned: 'training',
    training_in_progress: 'training',
    training_completed: 'training',
    ready_for_reassessment: 'training',
    // Approval & Client Interview
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

// ==================== CANDIDATE STATUS HELPER FUNCTIONS ====================

/**
 * Check if a candidate status requires CRE (Customer Relationship Executive) handling
 */
export function requiresCREHandling(status: CandidateStatus): boolean {
  return status === CANDIDATE_STATUS.RNR;
}

/**
 * Check if a candidate status is terminal (no further follow-up needed)
 */
export function isCandidateStatusTerminal(status: CandidateStatus): boolean {
  const terminalStatuses: CandidateStatus[] = [
    CANDIDATE_STATUS.NOT_INTERESTED,
    CANDIDATE_STATUS.NOT_ELIGIBLE,
    CANDIDATE_STATUS.QUALIFIED,
  ];
  return terminalStatuses.includes(status);
}

/**
 * Check if a candidate status requires immediate follow-up
 */
export function requiresImmediateFollowUp(status: CandidateStatus): boolean {
  return (
    status === CANDIDATE_STATUS.UNTOUCHED ||
    status === CANDIDATE_STATUS.INTERESTED
  );
}

/**
 * Get the priority level of a candidate status
 */
export function getCandidateStatusPriority(
  status: CandidateStatus,
): 'low' | 'medium' | 'high' | 'urgent' {
  const priorityMap: Record<
    CandidateStatus,
    'low' | 'medium' | 'high' | 'urgent'
  > = {
    [CANDIDATE_STATUS.UNTOUCHED]: 'high',
    [CANDIDATE_STATUS.INTERESTED]: 'high',
    [CANDIDATE_STATUS.RNR]: 'urgent',
    [CANDIDATE_STATUS.ON_HOLD]: 'medium',
    [CANDIDATE_STATUS.FUTURE]: 'low',
    [CANDIDATE_STATUS.OTHER_ENQUIRY]: 'medium',
    [CANDIDATE_STATUS.NOT_INTERESTED]: 'low',
    [CANDIDATE_STATUS.NOT_ELIGIBLE]: 'low',
    [CANDIDATE_STATUS.QUALIFIED]: 'high',
    // Legacy statuses
    [CANDIDATE_STATUS.NEW]: 'high',
    [CANDIDATE_STATUS.NOMINATED]: 'high',
    [CANDIDATE_STATUS.VERIFIED]: 'high',
    [CANDIDATE_STATUS.INTERVIEWING]: 'high',
    [CANDIDATE_STATUS.SELECTED]: 'high',
    [CANDIDATE_STATUS.PROCESSING]: 'high',
    [CANDIDATE_STATUS.DEPLOYED]: 'medium',
    [CANDIDATE_STATUS.HIRED]: 'low',
    [CANDIDATE_STATUS.REJECTED]: 'low',
  };

  return priorityMap[status] ?? 'medium';
}
