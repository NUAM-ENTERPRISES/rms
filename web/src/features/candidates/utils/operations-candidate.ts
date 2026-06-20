/** Maps legacy API CRE fields to Operations-facing UI state. */
export function getCandidateOperationsState(candidate: {
  isHandledByCRE?: boolean;
  isCREReassigned?: boolean;
  creStatusNote?: string | null;
  creStatus?: { statusName?: string } | null;
}) {
  return {
    isHandledByOperations: Boolean(candidate.isHandledByCRE),
    isOperationsReassigned: Boolean(candidate.isCREReassigned),
    operationsStatusNote: candidate.creStatusNote ?? null,
    operationsStatusName: candidate.creStatus?.statusName ?? null,
  };
}
