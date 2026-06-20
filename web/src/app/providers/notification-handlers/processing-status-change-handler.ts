import { NotificationHandlerProps } from "./types";

const PROCESSING_STATUS_CHANGE_NOTIFICATION_TYPES = [
  "processing_status_change_request",
  "processing_status_change_reviewed",
] as const;

export type ProcessingStatusChangeSyncPayload = {
  type: "ProcessingStatusChange";
  processingCandidateId?: string;
  candidateId?: string;
  projectId?: string;
  requestId?: string;
  requestType?: string;
  outcome?: "approved" | "rejected";
  phase?: "requested" | "reviewed";
};

function buildProcessingStatusChangeInvalidationTags(meta: {
  processingCandidateId?: string;
  candidateId?: string;
  projectId?: string;
}): Array<string | { type: string; id: string }> {
  const { processingCandidateId, candidateId, projectId } = meta;

  const tags: Array<string | { type: string; id: string }> = [
    { type: "ProcessingSummary", id: "LIST" },
    { type: "Processing", id: "LIST" },
  ];

  if (processingCandidateId) {
    tags.push(
      { type: "Processing", id: processingCandidateId },
      { type: "ProcessingDetails", id: processingCandidateId },
      { type: "ProcessingSteps", id: processingCandidateId },
    );
  }

  if (candidateId) {
    tags.push({ type: "Candidate", id: candidateId });
  }

  if (candidateId && projectId) {
    tags.push({
      type: "Candidate",
      id: `pipeline-${candidateId}-${projectId}`,
    });
  }

  return tags;
}

export const handleProcessingStatusChangeNotifications = ({
  notification,
  dispatch,
  invalidateTags,
}: NotificationHandlerProps) => {
  if (
    !PROCESSING_STATUS_CHANGE_NOTIFICATION_TYPES.includes(
      notification.type as (typeof PROCESSING_STATUS_CHANGE_NOTIFICATION_TYPES)[number],
    )
  ) {
    return false;
  }

  const tags = buildProcessingStatusChangeInvalidationTags({
    processingCandidateId: notification.meta?.processingCandidateId as
      | string
      | undefined,
    candidateId: notification.meta?.candidateId as string | undefined,
    projectId: notification.meta?.projectId as string | undefined,
  });

  dispatch(invalidateTags(tags));
  window.dispatchEvent(new CustomEvent("notifications:refresh"));

  return true;
};

export const handleProcessingStatusChangeSync = (
  payload: ProcessingStatusChangeSyncPayload,
  {
    dispatch,
    invalidateTags,
  }: Pick<NotificationHandlerProps, "dispatch" | "invalidateTags">,
) => {
  if (payload.type !== "ProcessingStatusChange") {
    return false;
  }

  const tags = buildProcessingStatusChangeInvalidationTags({
    processingCandidateId: payload.processingCandidateId,
    candidateId: payload.candidateId,
    projectId: payload.projectId,
  });

  dispatch(invalidateTags(tags));
  window.dispatchEvent(new CustomEvent("notifications:refresh"));

  return true;
};
