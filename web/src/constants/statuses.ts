/**
 * Status Constants - Affiniks RMS Frontend
 *
 * MUST match backend: backend/src/common/constants/statuses.ts
 * These constants are used for UI rendering, validation, and API calls
 *
 * @module constants/statuses
 */

// ==================== CANDIDATE PROJECT MAP STATUSES ====================

export const CANDIDATE_PROJECT_STATUS = {
  // Nomination Stage
  NOMINATED: "nominated",
  PENDING_DOCUMENTS: "pending_documents",

  // Document Verification Stage
  DOCUMENTS_SUBMITTED: "documents_submitted",
  VERIFICATION_IN_PROGRESS: "verification_in_progress",
  DOCUMENTS_VERIFIED: "documents_verified",

  // Approval Stage
  APPROVED: "approved",

  // Interview Stage
  INTERVIEW_SCHEDULED: "interview_scheduled",
  INTERVIEW_COMPLETED: "interview_completed",
  INTERVIEW_PASSED: "interview_passed",

  // Selection Stage
  SELECTED: "selected",

  // Processing Stage
  PROCESSING: "processing",

  // Final Stage
  HIRED: "hired",

  // Rejection States
  REJECTED_DOCUMENTS: "rejected_documents",
  REJECTED_INTERVIEW: "rejected_interview",
  REJECTED_SELECTION: "rejected_selection",

  // Other States
  WITHDRAWN: "withdrawn",
  ON_HOLD: "on_hold",
} as const;

export type CandidateProjectStatus =
  (typeof CANDIDATE_PROJECT_STATUS)[keyof typeof CANDIDATE_PROJECT_STATUS];

// ==================== STATUS UI CONFIGURATION ====================

/**
 * UI Configuration for each status
 * Includes labels, colors, icons, and metadata for rendering
 */
export const CANDIDATE_PROJECT_STATUS_CONFIG: Record<
  CandidateProjectStatus,
  {
    label: string;
    description: string;
    shortLabel: string;
    color:
      | "blue"
      | "yellow"
      | "orange"
      | "purple"
      | "green"
      | "red"
      | "gray"
      | "indigo";
    badgeClass: string;
    icon: string;
    stage:
      | "nomination"
      | "documents"
      | "approval"
      | "interview"
      | "selection"
      | "processing"
      | "final"
      | "rejected"
      | "other";
    isTerminal: boolean;
    sortOrder: number;
  }
> = {
  [CANDIDATE_PROJECT_STATUS.NOMINATED]: {
    label: "Nominated",
    shortLabel: "Nominated",
    description: "Candidate has been nominated for this project",
    color: "blue",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "UserPlus",
    stage: "nomination",
    isTerminal: false,
    sortOrder: 1,
  },
  [CANDIDATE_PROJECT_STATUS.PENDING_DOCUMENTS]: {
    label: "Pending Documents",
    shortLabel: "Pending Docs",
    description: "Waiting for candidate to submit required documents",
    color: "yellow",
    badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: "Clock",
    stage: "documents",
    isTerminal: false,
    sortOrder: 2,
  },
  [CANDIDATE_PROJECT_STATUS.DOCUMENTS_SUBMITTED]: {
    label: "Documents Submitted",
    shortLabel: "Docs Submitted",
    description: "All required documents have been submitted",
    color: "orange",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    icon: "FileCheck",
    stage: "documents",
    isTerminal: false,
    sortOrder: 3,
  },
  [CANDIDATE_PROJECT_STATUS.VERIFICATION_IN_PROGRESS]: {
    label: "Verification In Progress",
    shortLabel: "Verifying",
    description: "Documents are being verified",
    color: "orange",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    icon: "FileSearch",
    stage: "documents",
    isTerminal: false,
    sortOrder: 4,
  },
  [CANDIDATE_PROJECT_STATUS.DOCUMENTS_VERIFIED]: {
    label: "Documents Verified",
    shortLabel: "Docs Verified",
    description: "All documents verified, awaiting approval",
    color: "purple",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    icon: "ShieldCheck",
    stage: "documents",
    isTerminal: false,
    sortOrder: 5,
  },
  [CANDIDATE_PROJECT_STATUS.APPROVED]: {
    label: "Approved",
    shortLabel: "Approved",
    description: "Candidate approved for project, ready for interview",
    color: "green",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: "CheckCircle",
    stage: "approval",
    isTerminal: false,
    sortOrder: 6,
  },
  [CANDIDATE_PROJECT_STATUS.INTERVIEW_SCHEDULED]: {
    label: "Interview Scheduled",
    shortLabel: "Interview",
    description: "Interview has been scheduled",
    color: "indigo",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: "Calendar",
    stage: "interview",
    isTerminal: false,
    sortOrder: 7,
  },
  [CANDIDATE_PROJECT_STATUS.INTERVIEW_COMPLETED]: {
    label: "Interview Completed",
    shortLabel: "Interviewed",
    description: "Interview completed, awaiting result",
    color: "indigo",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: "ClipboardCheck",
    stage: "interview",
    isTerminal: false,
    sortOrder: 8,
  },
  [CANDIDATE_PROJECT_STATUS.INTERVIEW_PASSED]: {
    label: "Interview Passed",
    shortLabel: "Passed",
    description: "Passed interview, in selection pool",
    color: "green",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: "ThumbsUp",
    stage: "interview",
    isTerminal: false,
    sortOrder: 9,
  },
  [CANDIDATE_PROJECT_STATUS.SELECTED]: {
    label: "Selected",
    shortLabel: "Selected",
    description: "Client has selected this candidate",
    color: "green",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: "Star",
    stage: "selection",
    isTerminal: false,
    sortOrder: 10,
  },
  [CANDIDATE_PROJECT_STATUS.PROCESSING]: {
    label: "In Processing",
    shortLabel: "Processing",
    description: "Candidate is in processing (QVP, Medical, Visa, Travel)",
    color: "blue",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "Cog",
    stage: "processing",
    isTerminal: false,
    sortOrder: 11,
  },
  [CANDIDATE_PROJECT_STATUS.HIRED]: {
    label: "Hired",
    shortLabel: "Hired",
    description: "Successfully hired and deployed",
    color: "green",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: "BadgeCheck",
    stage: "final",
    isTerminal: true,
    sortOrder: 12,
  },
  [CANDIDATE_PROJECT_STATUS.REJECTED_DOCUMENTS]: {
    label: "Rejected - Documents",
    shortLabel: "Rejected",
    description: "Rejected due to invalid/incomplete documents",
    color: "red",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: "XCircle",
    stage: "rejected",
    isTerminal: true,
    sortOrder: 13,
  },
  [CANDIDATE_PROJECT_STATUS.REJECTED_INTERVIEW]: {
    label: "Rejected - Interview",
    shortLabel: "Rejected",
    description: "Did not pass interview",
    color: "red",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: "XCircle",
    stage: "rejected",
    isTerminal: true,
    sortOrder: 14,
  },
  [CANDIDATE_PROJECT_STATUS.REJECTED_SELECTION]: {
    label: "Rejected - Selection",
    shortLabel: "Not Selected",
    description: "Client did not select this candidate",
    color: "red",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: "XCircle",
    stage: "rejected",
    isTerminal: true,
    sortOrder: 15,
  },
  [CANDIDATE_PROJECT_STATUS.WITHDRAWN]: {
    label: "Withdrawn",
    shortLabel: "Withdrawn",
    description: "Candidate or recruiter withdrew nomination",
    color: "gray",
    badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
    icon: "UserMinus",
    stage: "other",
    isTerminal: true,
    sortOrder: 16,
  },
  [CANDIDATE_PROJECT_STATUS.ON_HOLD]: {
    label: "On Hold",
    shortLabel: "On Hold",
    description: "Nomination temporarily on hold",
    color: "gray",
    badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
    icon: "Pause",
    stage: "other",
    isTerminal: false,
    sortOrder: 17,
  },
};

// ==================== DOCUMENT STATUSES ====================

export const DOCUMENT_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
  EXPIRED: "expired",
  RESUBMISSION_REQUIRED: "resubmission_required",
} as const;

export type DocumentStatus =
  (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

// ==================== CANDIDATE GLOBAL STATUSES ====================

/**
 * Candidate Global Status Constants - New Status System
 * Tracks candidate engagement and follow-up status
 */
export const CANDIDATE_STATUS = {
  // Initial status when candidate is created
  UNTOUCHED: "untouched",

  // Engagement statuses
  INTERESTED: "interested",
  NOT_INTERESTED: "not_interested",
  NOT_ELIGIBLE: "not_eligible",
  OTHER_ENQUIRY: "other_enquiry",
  FUTURE: "future",
  ON_HOLD: "on_hold",
  RNR: "rnr", // Ringing No Response

  // Qualification status
  QUALIFIED: "qualified",

  // Legacy statuses (kept for compatibility)
  NEW: "new",
  NOMINATED: "nominated",
  VERIFIED: "verified",
  INTERVIEWING: "interviewing",
  SELECTED: "selected",
  PROCESSING: "processing",
  HIRED: "hired",
  REJECTED: "rejected",
} as const;

export type CandidateStatus =
  (typeof CANDIDATE_STATUS)[keyof typeof CANDIDATE_STATUS];

/**
 * UI Configuration for candidate statuses
 */
export const CANDIDATE_STATUS_CONFIG: Record<
  CandidateStatus,
  {
    label: string;
    description: string;
    color:
      | "blue"
      | "yellow"
      | "orange"
      | "purple"
      | "green"
      | "red"
      | "gray"
      | "indigo";
    badgeClass: string;
    icon: string;
    priority: "low" | "medium" | "high" | "urgent";
  }
> = {
  [CANDIDATE_STATUS.UNTOUCHED]: {
    label: "Untouched",
    description: "New candidate, not yet contacted",
    color: "gray",
    badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
    icon: "User",
    priority: "high",
  },
  [CANDIDATE_STATUS.INTERESTED]: {
    label: "Interested",
    description: "Candidate has shown interest",
    color: "green",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: "ThumbsUp",
    priority: "high",
  },
  [CANDIDATE_STATUS.NOT_INTERESTED]: {
    label: "Not Interested",
    description: "Candidate declined the opportunity",
    color: "red",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: "XCircle",
    priority: "low",
  },
  [CANDIDATE_STATUS.NOT_ELIGIBLE]: {
    label: "Not Eligible",
    description: "Candidate does not meet requirements",
    color: "red",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: "XCircle",
    priority: "low",
  },
  [CANDIDATE_STATUS.OTHER_ENQUIRY]: {
    label: "Other Enquiry",
    description: "Candidate has other questions or needs",
    color: "orange",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    icon: "MessageCircle",
    priority: "medium",
  },
  [CANDIDATE_STATUS.FUTURE]: {
    label: "Future",
    description: "Candidate for future opportunities",
    color: "blue",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "Clock",
    priority: "low",
  },
  [CANDIDATE_STATUS.ON_HOLD]: {
    label: "On Hold",
    description: "Candidate temporarily on hold",
    color: "yellow",
    badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: "Pause",
    priority: "medium",
  },
  [CANDIDATE_STATUS.RNR]: {
    label: "RNR",
    description: "Ringing No Response - requires CRE handling",
    color: "red",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: "PhoneOff",
    priority: "urgent",
  },
  [CANDIDATE_STATUS.QUALIFIED]: {
    label: "Qualified",
    description: "Candidate has been qualified",
    color: "green",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: "CheckCircle",
    priority: "high",
  },
  // Legacy statuses
  [CANDIDATE_STATUS.NEW]: {
    label: "New",
    description: "New candidate",
    color: "blue",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "UserPlus",
    priority: "high",
  },
  [CANDIDATE_STATUS.NOMINATED]: {
    label: "Nominated",
    description: "Nominated for project",
    color: "blue",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "UserCheck",
    priority: "high",
  },
  [CANDIDATE_STATUS.VERIFIED]: {
    label: "Verified",
    description: "Documents verified",
    color: "green",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: "CheckCircle",
    priority: "high",
  },
  [CANDIDATE_STATUS.INTERVIEWING]: {
    label: "Interviewing",
    description: "Currently in interview process",
    color: "purple",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    icon: "Users",
    priority: "high",
  },
  [CANDIDATE_STATUS.SELECTED]: {
    label: "Selected",
    description: "Selected by client",
    color: "green",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: "Star",
    priority: "high",
  },
  [CANDIDATE_STATUS.PROCESSING]: {
    label: "Processing",
    description: "In processing stage",
    color: "blue",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "Cog",
    priority: "high",
  },
  [CANDIDATE_STATUS.HIRED]: {
    label: "Hired",
    description: "Successfully hired",
    color: "green",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: "BadgeCheck",
    priority: "low",
  },
  [CANDIDATE_STATUS.REJECTED]: {
    label: "Rejected",
    description: "Rejected",
    color: "red",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: "XCircle",
    priority: "low",
  },
};

export const DOCUMENT_STATUS_CONFIG: Record<
  DocumentStatus,
  {
    label: string;
    color: "yellow" | "green" | "red" | "gray" | "orange";
    badgeClass: string;
    icon: string;
  }
> = {
  [DOCUMENT_STATUS.PENDING]: {
    label: "Pending Verification",
    color: "yellow",
    badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: "Clock",
  },
  [DOCUMENT_STATUS.VERIFIED]: {
    label: "Verified",
    color: "green",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: "CheckCircle",
  },
  [DOCUMENT_STATUS.REJECTED]: {
    label: "Rejected",
    color: "red",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: "XCircle",
  },
  [DOCUMENT_STATUS.EXPIRED]: {
    label: "Expired",
    color: "gray",
    badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
    icon: "AlertTriangle",
  },
  [DOCUMENT_STATUS.RESUBMISSION_REQUIRED]: {
    label: "Resubmission Required",
    color: "orange",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    icon: "RefreshCw",
  },
};

// ==================== INTERVIEW OUTCOMES ====================

export const INTERVIEW_OUTCOME = {
  PASSED: "passed",
  FAILED: "failed",
  RESCHEDULED: "rescheduled",
  NO_SHOW: "no_show",
  CANCELLED: "cancelled",
} as const;

export type InterviewOutcome =
  (typeof INTERVIEW_OUTCOME)[keyof typeof INTERVIEW_OUTCOME];

// ==================== HELPER FUNCTIONS ====================

/**
 * Get status configuration for UI rendering
 */
export function getStatusConfig(status: CandidateProjectStatus) {
  return (
    CANDIDATE_PROJECT_STATUS_CONFIG[status] ?? {
      label: status,
      shortLabel: status,
      description: "Unknown status",
      color: "gray" as const,
      badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
      icon: "HelpCircle",
      stage: "other" as const,
      isTerminal: false,
      sortOrder: 99,
    }
  );
}

/**
 * Get document status configuration
 */
export function getDocumentStatusConfig(status: DocumentStatus) {
  return (
    DOCUMENT_STATUS_CONFIG[status] ?? {
      label: status,
      color: "gray" as const,
      badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
      icon: "HelpCircle",
    }
  );
}

/**
 * Check if status is terminal (no further transitions)
 */
export function isTerminalStatus(status: CandidateProjectStatus): boolean {
  return getStatusConfig(status).isTerminal;
}

/**
 * Check if status is a rejection
 */
export function isRejectionStatus(status: CandidateProjectStatus): boolean {
  return getStatusConfig(status).stage === "rejected";
}

/**
 * Get status badge class for Tailwind
 */
export function getStatusBadgeClass(status: CandidateProjectStatus): string {
  return getStatusConfig(status).badgeClass;
}

/**
 * Get status icon name (Lucide React)
 */
export function getStatusIcon(status: CandidateProjectStatus): string {
  return getStatusConfig(status).icon;
}

/**
 * Get statuses by stage
 */
export function getStatusesByStage(stage: string): CandidateProjectStatus[] {
  return Object.keys(CANDIDATE_PROJECT_STATUS_CONFIG).filter(
    (key) =>
      CANDIDATE_PROJECT_STATUS_CONFIG[key as CandidateProjectStatus].stage ===
      stage
  ) as CandidateProjectStatus[];
}

/**
 * Sort statuses by workflow order
 */
export function sortStatusesByWorkflow(
  statuses: CandidateProjectStatus[]
): CandidateProjectStatus[] {
  return statuses.sort((a, b) => {
    const orderA = getStatusConfig(a).sortOrder;
    const orderB = getStatusConfig(b).sortOrder;
    return orderA - orderB;
  });
}
