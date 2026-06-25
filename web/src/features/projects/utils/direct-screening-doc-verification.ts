/** Sub-statuses where direct-screening candidates must wait before document verification. */
export const DIRECT_SCREENING_SKIP_DOC_VERIFICATION_STATUSES = new Set([
  "screening_assigned",
  "screening_scheduled",
  "screening_in_progress",
]);

/**
 * Sub-statuses where recruiters cannot send a candidate for document verification yet
 * (active screening / in-progress training — not post-pass or post-training-complete).
 */
export const DOC_VERIFICATION_SEND_BLOCKED_STATUSES = new Set([
  "screening_assigned",
  "screening_scheduled",
  "screening_in_progress",
  "screening_completed",
  "screening_needs_training",
  "screening_on_hold",
  "training_assigned",
  "training_scheduled",
  "training_in_progress",
  "ready_for_reassessment",
]);

export function normalizeProjectStatusToken(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.toLowerCase().trim();
  if (typeof value === "object") {
    const record = value as { name?: string; statusName?: string; label?: string };
    return (record.name || record.statusName || record.label || "").toLowerCase().trim();
  }
  return "";
}

export function shouldShowDirectScreeningSkipDocVerification(params: {
  isNominated: boolean;
  isSendedForDocumentVerification?: boolean;
  subStatusName?: string;
  mainStatusName?: string;
  currentProjectStatusName?: string;
}): boolean {
  if (params.isNominated) return false;
  if (params.isSendedForDocumentVerification === true) return false;

  const onDirectScreeningPath =
    params.isSendedForDocumentVerification === false ||
    params.isSendedForDocumentVerification === undefined;

  if (!onDirectScreeningPath) return false;

  const statusToken =
    normalizeProjectStatusToken(params.subStatusName) ||
    normalizeProjectStatusToken(params.currentProjectStatusName) ||
    normalizeProjectStatusToken(params.mainStatusName);

  return DIRECT_SCREENING_SKIP_DOC_VERIFICATION_STATUSES.has(statusToken);
}

export function isDocVerificationSendBlockedByStatus(
  subStatusName?: string | null,
): boolean {
  const token = normalizeProjectStatusToken(subStatusName);
  if (!token) return false;
  return DOC_VERIFICATION_SEND_BLOCKED_STATUSES.has(token);
}
