/** Step tile counts from the processing list API (`counts.steps`). */
export function getProcessingStepTileCount(
  stepKey: string,
  steps?: Record<string, number>,
): number {
  const stepCounts = steps ?? {};
  if (stepKey === "offer_letter_verified") {
    // Backend only counts candidates with an uploaded offer letter.
    return stepCounts.offer_letter_verified ?? 0;
  }
  return stepCounts[stepKey] ?? 0;
}
