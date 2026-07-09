/** Sub-statuses that release the send-for-processing lock on another project. */
export const SEND_FOR_PROCESSING_RELEASED_SUB_STATUSES = [
  "processing_hold",
  "processing_cancelled",
] as const;

/** ProcessingCandidate.processingStatus values that release the send lock. */
export const SEND_FOR_PROCESSING_RELEASED_PROCESSING_STATUSES = [
  "on_hold",
  "cancelled",
] as const;

export function isSendForProcessingLockReleased(
  subStatusName?: string | null,
): boolean {
  return Boolean(
    subStatusName &&
      (SEND_FOR_PROCESSING_RELEASED_SUB_STATUSES as readonly string[]).includes(
        subStatusName,
      ),
  );
}

export function isSendForProcessingLockReleasedForInterview(interview: {
  candidateProjectMap?: {
    subStatus?: { name?: string };
    processing?: { processingStatus?: string };
  };
}): boolean {
  return getInterviewProcessingReleaseReason(interview) !== null;
}

export type ProcessingReleaseReason = "hold" | "cancelled";

export function getInterviewProcessingReleaseReason(interview: {
  candidateProjectMap?: {
    subStatus?: { name?: string };
    processing?: { processingStatus?: string };
  };
}): ProcessingReleaseReason | null {
  const subStatusName = interview.candidateProjectMap?.subStatus?.name;
  if (subStatusName === "processing_hold") {
    return "hold";
  }
  if (subStatusName === "processing_cancelled") {
    return "cancelled";
  }

  const processingStatus =
    interview.candidateProjectMap?.processing?.processingStatus;
  if (processingStatus === "on_hold") {
    return "hold";
  }
  if (processingStatus === "cancelled") {
    return "cancelled";
  }

  return null;
}

export function getProcessingReleaseBadgeCopy(reason: ProcessingReleaseReason): {
  label: string;
  tooltip: string;
} {
  if (reason === "hold") {
    return {
      label: "Processing On Hold",
      tooltip:
        "Processing for this project is on hold. The candidate may be sent for processing on another project if they are nominated elsewhere.",
    };
  }

  return {
    label: "Processing Cancelled",
    tooltip:
      "Processing for this project was cancelled. The candidate may be sent for processing on another project if they are nominated elsewhere.",
  };
}

export function getOtherProjectReleasedProcessingBadgeCopy(
  projectTitle: string,
  reason: ProcessingReleaseReason,
): { label: string; tooltip: string } {
  if (reason === "hold") {
    return {
      label: "Available to send",
      tooltip: `Processing on "${projectTitle}" is on hold. You can send this candidate for processing for this project.`,
    };
  }

  return {
    label: "Available to send",
    tooltip: `Processing on "${projectTitle}" was cancelled. You can send this candidate for processing for this project.`,
  };
}
