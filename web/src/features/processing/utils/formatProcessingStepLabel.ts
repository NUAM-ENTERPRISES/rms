/** Human-readable labels for processing step template keys (list + tooltips). */
export function formatProcessingStepLabel(step?: string | null, fallbackLabel?: string): string {
  if (fallbackLabel?.trim()) return fallbackLabel.trim();
  if (!step) return "—";

  const labels: Record<string, string> = {
    verify_offer_letter: "Verify Offer Letter",
    offer_letter_verified: "Offer Letter",
    offer_letter: "Offer Letter",
    document_received: "Document Original Received",
    prometric: "Licensing Exam",
  };

  if (labels[step]) return labels[step];

  return step.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatProcessingStepStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    in_progress: "In progress",
    rejected: "Rejected",
    resubmission_requested: "Resubmission requested",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}
