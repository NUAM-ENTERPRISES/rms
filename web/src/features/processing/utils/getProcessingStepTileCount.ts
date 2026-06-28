/**
 * Dashboard step-tile counts from API `counts.steps`.
 * Offer letter tile = verified only (`offer_letter_verified`), not pending upload/verify.
 */
export function getProcessingStepTileCount(
  stepKey: string,
  stepCounts: Record<string, number> = {},
): number {
  if (stepKey === "offer_letter_verified") {
    return stepCounts.offer_letter_verified ?? 0;
  }

  return stepCounts[stepKey] ?? 0;
}
