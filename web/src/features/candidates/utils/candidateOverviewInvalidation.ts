/** RTK Query tags to refresh recruiter Candidate Overview tiles + table. */
export const CANDIDATE_OVERVIEW_TAG = "CandidateOverview" as const;

export function getCandidateOverviewInvalidationTags(): Array<
  typeof CANDIDATE_OVERVIEW_TAG | "Candidate"
> {
  return [CANDIDATE_OVERVIEW_TAG, "Candidate"];
}
