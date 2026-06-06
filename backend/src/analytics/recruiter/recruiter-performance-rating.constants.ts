/** Recruiter CRM statuses counted as positive (nomination does not remove). */
export const POSITIVE_CRM_STATUS_NAMES = [
  'Interested',
  'Future',
  'On Hold',
  'Call Back',
  'Qualified',
] as const;

export const DEPLOYED_CRM_STATUS_NAMES = ['Deployed'] as const;

export const PERFORMANCE_PROJECT_SUB_STATUSES = {
  documentVerified: 'documents_verified',
  interviewShortlisted: 'shortlisted',
  interviewPassed: 'interview_passed',
  processing: 'transfered_to_processing',
  deployed: 'hired',
} as const;

export const PERFORMANCE_STAGE_WEIGHTS = {
  positiveCandidate: 1,
  documentVerified: 2,
  interviewShortlisted: 3,
  interviewPassed: 5,
  processing: 7,
  deployed: 10,
} as const;

export type PerformanceStageCounts = {
  positiveCandidate: number;
  documentVerified: number;
  interviewShortlisted: number;
  interviewPassed: number;
  processing: number;
  deployed: number;
};

export type PerformanceRatingLabel =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Diamond'
  | 'Platinum'
  | 'Elite';

export function computePerformanceScore(
  counts: PerformanceStageCounts,
): number {
  return (
    counts.positiveCandidate * PERFORMANCE_STAGE_WEIGHTS.positiveCandidate +
    counts.documentVerified * PERFORMANCE_STAGE_WEIGHTS.documentVerified +
    counts.interviewShortlisted *
      PERFORMANCE_STAGE_WEIGHTS.interviewShortlisted +
    counts.interviewPassed * PERFORMANCE_STAGE_WEIGHTS.interviewPassed +
    counts.processing * PERFORMANCE_STAGE_WEIGHTS.processing +
    counts.deployed * PERFORMANCE_STAGE_WEIGHTS.deployed
  );
}

export function resolvePerformanceRating(
  score: number,
): PerformanceRatingLabel {
  if (score <= 25) return 'Bronze';
  if (score <= 50) return 'Silver';
  if (score <= 75) return 'Gold';
  if (score <= 100) return 'Diamond';
  if (score <= 150) return 'Platinum';
  return 'Elite';
}

export function getMonthPeriodBounds(
  year: number,
  month: number,
): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getYearPeriodBounds(year: number): { start: Date; end: Date } {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

export const PERFORMANCE_STAGE_ACTIVITY_LABELS: Record<
  keyof PerformanceStageCounts,
  string
> = {
  positiveCandidate: 'Positive Candidate',
  documentVerified: 'Document Verified',
  interviewShortlisted: 'Interview Shortlisted',
  interviewPassed: 'Interview Passed',
  processing: 'Processing',
  deployed: 'Deployed',
};
