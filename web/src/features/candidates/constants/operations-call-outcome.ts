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

export function getOperationsCallOutcomeLabel(
  outcome?: string | null,
): string | null {
  if (!outcome) return null;
  return (
    OPERATIONS_CALL_OUTCOME_OPTIONS.find((option) => option.value === outcome)
      ?.label ?? outcome.replace(/_/g, " ")
  );
}

export function getOperationsCallOutcomeBadgeClass(
  outcome?: string | null,
): string {
  switch (outcome) {
    case OPERATIONS_CALL_OUTCOME.INTERESTED:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case OPERATIONS_CALL_OUTCOME.NOT_INTERESTED:
      return "bg-red-50 text-red-700 border-red-200";
    case OPERATIONS_CALL_OUTCOME.NO_RESPONDED:
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}
