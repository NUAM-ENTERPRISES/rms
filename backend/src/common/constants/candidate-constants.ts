/**
 * Candidate related constants
 */

export const FACILITY_TYPES = [
  "general_hospital",
  "multi_specialty_hospital",
  "specialty_hospital",
  "clinic",
  "home_care",
  "nursing_home",
  "rehabilitation_center",
  "long_term_care_facility",
  "dialysis_center",
  "mental_health_facility"
] as const;

export const SECTOR_TYPES = {
  ANY_PREFERENCE: "any_preference",
  PRIVATE: "private",
  GOVERNMENT: "government",
} as const;

export const VISA_TYPES = {
  EMPLOYMENT: "employment",
  WORK: "work",
  RESIDENCE: "residence",
  VISIT: "visit",
  FAMILY: "family",
  DEPENDENT: "dependent",
  TRANSFERABLE: "transferable",
  NON_TRANSFERABLE: "non_transferable",
  NOT_APPLICABLE: "not_applicable",
} as const;

export const LICENSING_EXAMS = {
  PROMETRIC: "prometric",
  DHA: "dha",
  HAAD: "haad",
  MOH: "moh",
  SCFHS: "scfhs",
  QCHP: "qchp",
  OMSB: "omsb",
  NHRA: "nhra",
  NMC_UK: "nmc_uk",
  CBT: "cbt",
  OET: "oet",
  IELTS: "ielts",
  USMLE: "usmle",
  NCLEX_RN: "nclex_rn",
} as const;

export const CANDIDATE_ASSIGNMENT_TYPE = {
  MANUAL: "manual",
  CRE_AUTO: "cre_auto",
  CRE_MANUAL: "cre_manual",
  CRE_REASSIGNED: "cre_reassigned",
  CRE_CONVERTED: "cre_converted",
} as const;

/** Written when CRE returns a candidate to the recruiter pipeline as untouched. */
export const CRE_REASSIGN_RECRUITER_RETURN_REASON =
  "Returned to recruiter pipeline as untouched after Operations reassign";

export const OPERATIONS_FOLLOW_UP_STAGE = {
  INITIAL: 'initial',
  WEEK_ONE: 'week_one',
  WEEK_TWO: 'week_two',
  JUNK: 'junk',
} as const;

export type OperationsFollowUpStage =
  (typeof OPERATIONS_FOLLOW_UP_STAGE)[keyof typeof OPERATIONS_FOLLOW_UP_STAGE];

export const OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE = 3;

/** Stored on operations_call_logs.callOutcome */
export const OPERATIONS_CALL_OUTCOME = {
  INTERESTED: 'interested',
  NOT_INTERESTED: 'not_interested',
  NO_RESPONDED: 'no_responded',
} as const;

export type OperationsCallOutcome =
  (typeof OPERATIONS_CALL_OUTCOME)[keyof typeof OPERATIONS_CALL_OUTCOME];

const OPERATIONS_SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const OPERATIONS_TEST_TWO_MIN_MS = 2 * 60 * 1000;

const useOperationsFollowUpTestTimers =
  process.env.OPERATIONS_FOLLOW_UP_TEST_TIMERS === 'true';

/** 7 days in production; 2 minutes when OPERATIONS_FOLLOW_UP_TEST_TIMERS=true */
export const OPERATIONS_WEEK_ONE_WAIT_MS = useOperationsFollowUpTestTimers
  ? OPERATIONS_TEST_TWO_MIN_MS
  : OPERATIONS_SEVEN_DAYS_MS;

/** 7 days in production; 2 minutes when OPERATIONS_FOLLOW_UP_TEST_TIMERS=true */
export const OPERATIONS_WEEK_TWO_WAIT_MS = useOperationsFollowUpTestTimers
  ? OPERATIONS_TEST_TWO_MIN_MS
  : OPERATIONS_SEVEN_DAYS_MS;

export const OPERATIONS_JUNK_TRANSITION_SOURCE = {
  AUTO_AFTER_3_CALLS: 'auto_after_3_calls',
  CRON_WEEK_ONE: 'cron_week_one',
  CRON_WEEK_TWO: 'cron_week_two',
  CALL_LOG_WEEK_TWO: 'call_log_week_two',
  MANUAL: 'manual',
} as const;

export type OperationsJunkTransitionSource =
  (typeof OPERATIONS_JUNK_TRANSITION_SOURCE)[keyof typeof OPERATIONS_JUNK_TRANSITION_SOURCE];

export function getOperationsStageWaitRemainingMs(
  stageEnteredAt: Date | string | null | undefined,
  requiredWaitMs: number,
  nowMs = Date.now(),
): number {
  if (!stageEnteredAt) {
    return requiredWaitMs;
  }
  const enteredMs = new Date(stageEnteredAt).getTime();
  return Math.max(0, requiredWaitMs - (nowMs - enteredMs));
}

export function hasOperationsStageWaitElapsed(
  stageEnteredAt: Date | string | null | undefined,
  requiredWaitMs: number,
  nowMs = Date.now(),
): boolean {
  if (!stageEnteredAt) {
    return false;
  }
  return getOperationsStageWaitRemainingMs(stageEnteredAt, requiredWaitMs, nowMs) === 0;
}

/** Normalize legacy DB value `agents` to canonical `agent`. */
export function normalizeCandidateSource(
  source: string | null | undefined,
): string | undefined {
  if (!source) return undefined;
  return source === 'agents' ? 'agent' : source;
}

export function isAgentCandidateSource(
  source: string | null | undefined,
): boolean {
  return normalizeCandidateSource(source) === 'agent';
}

export const CANDIDATE_SOURCES = [
  { id: 'manual', value: 'manual', label: 'Manual' },
  { id: 'meta', value: 'meta', label: 'Meta' },
  { id: 'agent', value: 'agent', label: 'Agent' },
  { id: 'referral', value: 'referral', label: 'Referral' },
  { id: 'direct_enquiry', value: 'direct_enquiry', label: 'Direct Enquiry' },
  { id: 'hospital_visit', value: 'hospital_visit', label: 'Hospital Visit' },
  { id: 'paid_ads', value: 'paid_ads', label: 'Paid Ads' },
  { id: 'expo_event', value: 'expo_event', label: 'Expo/Event' },
  { id: 'job_board', value: 'job_board', label: 'Job Board' },
  { id: 'social_media', value: 'social_media', label: 'Social Media' },
  { id: 'direct_application', value: 'direct_application', label: 'Direct Application' },
  { id: 'internal', value: 'internal', label: 'Internal' }
] as const;

export const COMMON_SKILLS = [
  "Communication",
  "Teamwork",
  "Problem Solving",
  "Customer Service",
  "Leadership",
  "Time Management",
  "Adaptability",
  "Attention to Detail",
  "Critical Thinking",
  "Conflict Resolution",
] as const;
