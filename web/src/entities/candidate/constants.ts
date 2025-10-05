/**
 * Candidate domain constants
 * Following FE_GUIDELINES.md entities pattern
 */

export const CANDIDATE_STATUS = {
  ACTIVE: "active",
  INTERVIEWING: "interviewing",
  PLACED: "placed",
  REJECTED: "rejected",
  INACTIVE: "inactive",
} as const;

export const CANDIDATE_SOURCES = {
  REFERRAL: "referral",
  JOB_BOARD: "job_board",
  SOCIAL_MEDIA: "social_media",
  DIRECT_APPLICATION: "direct_application",
  RECRUITMENT_AGENCY: "recruitment_agency",
  INTERNAL: "internal",
} as const;

export const EXPERIENCE_LEVELS = {
  ENTRY: { min: 0, max: 2, label: "Entry Level" },
  MID: { min: 2, max: 5, label: "Mid Level" },
  SENIOR: { min: 5, max: 10, label: "Senior Level" },
  EXPERT: { min: 10, max: 100, label: "Expert Level" },
} as const;

export const CANDIDATE_WORKFLOW_STAGES = [
  "nominated",
  "pending_documents",
  "documents_submitted",
  "verification_in_progress",
  "documents_verified",
  "approved",
  "interview_scheduled",
  "interview_completed",
  "interview_passed",
  "selected",
  "processing",
  "hired",
] as const;

export type CandidateStatus =
  (typeof CANDIDATE_STATUS)[keyof typeof CANDIDATE_STATUS];
export type CandidateSource =
  (typeof CANDIDATE_SOURCES)[keyof typeof CANDIDATE_SOURCES];
export type CandidateWorkflowStage = (typeof CANDIDATE_WORKFLOW_STAGES)[number];
