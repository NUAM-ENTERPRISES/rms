export const OPERATIONS_CALL_OUTCOME = {
  INTERESTED: "interested",
  NOT_INTERESTED: "not_interested",
  NO_RESPONDED: "no_responded",
} as const;

export type OperationsCallOutcome =
  (typeof OPERATIONS_CALL_OUTCOME)[keyof typeof OPERATIONS_CALL_OUTCOME];

export const OPERATIONS_CALL_OUTCOME_OPTIONS: Array<{
  value: OperationsCallOutcome;
  label: string;
  description: string;
}> = [
  {
    value: OPERATIONS_CALL_OUTCOME.INTERESTED,
    label: "Interested",
    description: "Candidate is interested — reassign to recruiter",
  },
  {
    value: OPERATIONS_CALL_OUTCOME.NOT_INTERESTED,
    label: "Not Interested",
    description: "Candidate declined — mark as junk",
  },
  {
    value: OPERATIONS_CALL_OUTCOME.NO_RESPONDED,
    label: "No Responded",
    description: "No answer — continue follow-up call logging",
  },
];
