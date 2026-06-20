export type ProcessingStatusChangeRequestType =
  | "processing_cancel"
  | "processing_hold"
  | "processing_reactivate";

export const PROCESSING_PIPELINE_STATUS_LABELS: Record<string, string> = {
  assigned: "Processing Assigned",
  in_progress: "Processing In Progress",
  cancelled: "Processing Cancelled",
  on_hold: "Processing On Hold",
  completed: "Processing Completed",
};

export const PROCESSING_STATUS_CHANGE_TARGET_LABELS: Record<
  ProcessingStatusChangeRequestType,
  string
> = {
  processing_cancel: "Processing Cancelled",
  processing_hold: "Processing On Hold",
  processing_reactivate: "Processing In Progress",
};

const INFERRED_SOURCE_STATUS: Record<
  ProcessingStatusChangeRequestType,
  string
> = {
  processing_cancel: "in_progress",
  processing_hold: "in_progress",
  processing_reactivate: "cancelled",
};

export function getProcessingPipelineStatusLabel(
  status?: string | null,
): string {
  if (!status) return "Current processing status";
  return (
    PROCESSING_PIPELINE_STATUS_LABELS[status] ??
    status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function getProcessingStatusChangeTransition(
  requestType: ProcessingStatusChangeRequestType,
  currentProcessingStatus?: string | null,
) {
  const sourceStatus =
    currentProcessingStatus &&
    PROCESSING_PIPELINE_STATUS_LABELS[currentProcessingStatus]
      ? currentProcessingStatus
      : INFERRED_SOURCE_STATUS[requestType];

  const fromLabel = getProcessingPipelineStatusLabel(sourceStatus);
  const toLabel = PROCESSING_STATUS_CHANGE_TARGET_LABELS[requestType];

  const actionPhrase: Record<ProcessingStatusChangeRequestType, string> = {
    processing_cancel: "Cancelling processing",
    processing_hold: "Putting processing on hold",
    processing_reactivate: "Reactivating processing",
  };

  const reviewTitle: Record<ProcessingStatusChangeRequestType, string> = {
    processing_cancel: "Processing Cancellation",
    processing_hold: "Processing Hold",
    processing_reactivate: "Processing Reactivation",
  };

  return {
    sourceStatus,
    fromLabel,
    toLabel,
    actionPhrase: actionPhrase[requestType],
    reviewTitle: reviewTitle[requestType],
  };
}
