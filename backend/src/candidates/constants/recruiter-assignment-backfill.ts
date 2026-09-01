export const BACKFILL_UNASSIGNED_RECRUITER_QUEUE =
  'recruiter-assignment-backfill';

export const BACKFILL_UNASSIGNED_RECRUITER_JOB =
  'backfill-unassigned-recruiter-assignments';

export const BACKFILL_UNASSIGNED_RECRUITER_JOB_ID =
  'backfill-unassigned-recruiters';

export const BACKFILL_UNASSIGNED_RECRUITER_DELAY_MS = 8_000;

export type BackfillUnassignedRecruiterJobData = {
  assignedByUserId?: string;
  recruiterId?: string;
};
