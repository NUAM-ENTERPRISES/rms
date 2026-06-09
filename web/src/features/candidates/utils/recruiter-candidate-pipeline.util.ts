import {
  getCandidateStatusLabel,
  normalizeCandidateStatusKey,
  type CandidateStatusCarrier,
} from "@/features/projects/utils/project-assignment";

export type RecruiterPipelineCandidate = CandidateStatusCarrier & {
  isCREReassigned?: boolean;
  isHandledByCRE?: boolean;
};

export const RECRUITER_LOCKED_RNR_BLOCK_REASON =
  "This candidate is in RNR and is with Operations. You can update status and assign to projects only after Operations reassigns them back to you.";

export function isRnrCandidateStatus(statusLabel: string): boolean {
  return normalizeCandidateStatusKey(statusLabel) === "rnr";
}

/**
 * Recruiters cannot update status or assign RNR candidates until Operations
 * hands them back with a cre_reassigned assignment.
 */
export function isRecruiterLockedRnrCandidate(
  candidate: RecruiterPipelineCandidate | null | undefined,
): boolean {
  if (!candidate?.isCREReassigned) {
    const statusLabel = getCandidateStatusLabel(candidate ?? {});
    if (isRnrCandidateStatus(statusLabel)) {
      return true;
    }
  }

  return false;
}

export function canRecruiterManageCandidatePipeline(
  candidate: RecruiterPipelineCandidate | null | undefined,
): boolean {
  return !isRecruiterLockedRnrCandidate(candidate);
}

export function getRecruiterLockedRnrBlockReason(): string {
  return RECRUITER_LOCKED_RNR_BLOCK_REASON;
}
