import type { CandidateCountryRestriction } from "@/features/candidates/api";
import { formatProcessingStepLabel } from "@/features/processing/utils/formatProcessingStepLabel";

const RESTRICTION_TYPE_LABELS: Record<string, string> = {
  processing_step_cancel: "Processing cancellation",
  manual: "Manual restriction",
};

export function getCountryRestrictionTypeLabel(type: string): string {
  return RESTRICTION_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function getCountryRestrictionSourceSummary(
  restriction: CandidateCountryRestriction,
): string | null {
  const meta = restriction.sourceMeta;
  if (!meta) return null;

  const parts: string[] = [];
  if (meta.projectTitle) {
    parts.push(meta.projectTitle);
  }
  if (meta.stepKey) {
    parts.push(formatProcessingStepLabel(meta.stepKey));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function formatCountryRestrictionDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
