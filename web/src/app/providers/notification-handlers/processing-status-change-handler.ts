import { NotificationHandlerProps } from "./types";

const PROCESSING_STATUS_CHANGE_NOTIFICATION_TYPES = [
  "processing_status_change_request",
  "processing_status_change_reviewed",
] as const;

const resolveProcessingStatusChangeNotificationType = (notification: {
  type?: string;
  meta?: { type?: string };
}) => {
  if (
    notification.type === "recruiter_notification" &&
    notification.meta?.type === "processing_status_change_reviewed"
  ) {
    return "processing_status_change_reviewed";
  }
  return notification.type;
};

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

export type ProcessingStatusChangeInvalidationTag =
  | "ProcessingSummary"
  | "Processing"
  | "ProcessingDetails"
  | "ProcessingSteps"
  | { type: "ProcessingSummary"; id: string }
  | { type: "Processing"; id: string }
  | { type: "ProcessingDetails"; id: string }
  | { type: "ProcessingSteps"; id: string }
  | { type: "Candidate"; id: string };

export function buildProcessingStatusChangeInvalidationTags(meta: {
  processingCandidateId?: string;
  candidateId?: string;
  projectId?: string;
  candidateProjectMapId?: string;
}): ProcessingStatusChangeInvalidationTag[] {
  const { processingCandidateId, candidateId, projectId, candidateProjectMapId } =
    meta;

  const tags: ProcessingStatusChangeInvalidationTag[] = [
    "ProcessingSummary",
    "Processing",
    "ProcessingDetails",
    "ProcessingSteps",
    { type: "ProcessingSummary", id: "LIST" },
    { type: "Processing", id: "LIST" },
    { type: "ProcessingDetails", id: "LIST" },
    { type: "ProcessingSteps", id: "LIST" },
  ];

  if (processingCandidateId) {
    tags.push(
      { type: "Processing", id: processingCandidateId },
      { type: "ProcessingDetails", id: processingCandidateId },
      { type: "ProcessingSteps", id: processingCandidateId },
    );
  }

  if (candidateId) {
    tags.push(
      { type: "Candidate", id: candidateId },
      { type: "Candidate", id: `country-restrictions-${candidateId}` },
    );
  }

  if (candidateId && projectId) {
    tags.push({
      type: "Candidate",
      id: `pipeline-${candidateId}-${projectId}`,
    });
  }

  if (candidateProjectMapId) {
    tags.push({
      type: "Candidate",
      id: `status-change-history-${candidateProjectMapId}`,
    });
  }

  return tags;
}

function resolveProcessingStatusChangeMeta(notification: {
  meta?: Record<string, unknown>;
  data?: Record<string, unknown>;
}) {
  const meta = notification.meta ?? {};
  const data = notification.data ?? {};

  return {
    processingCandidateId:
      (meta.processingCandidateId as string | undefined) ??
      (data.processingCandidateId as string | undefined),
    candidateId:
      (meta.candidateId as string | undefined) ??
      (data.candidateId as string | undefined),
    projectId:
      (meta.projectId as string | undefined) ??
      (data.projectId as string | undefined),
    candidateProjectMapId:
      (meta.candidateProjectMapId as string | undefined) ??
      (data.candidateProjectMapId as string | undefined),
  };
}

export const handleProcessingStatusChangeNotifications = ({
  notification,
  dispatch,
  invalidateTags,
}: NotificationHandlerProps) => {
  const notificationType = resolveProcessingStatusChangeNotificationType(
    notification,
  );

  if (
    !notificationType ||
    !PROCESSING_STATUS_CHANGE_NOTIFICATION_TYPES.includes(
      notificationType as (typeof PROCESSING_STATUS_CHANGE_NOTIFICATION_TYPES)[number],
    )
  ) {
    return false;
  }

  console.log(
    `[Socket] Handling processing status change notification: ${notificationType}`,
  );

  const tags = buildProcessingStatusChangeInvalidationTags(
    resolveProcessingStatusChangeMeta(notification),
  );

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

  console.log("[Socket] Processing status change data sync", payload);

  const tags = buildProcessingStatusChangeInvalidationTags({
    processingCandidateId: payload.processingCandidateId,
    candidateId: payload.candidateId,
    projectId: payload.projectId,
  });

  dispatch(invalidateTags(tags));
  window.dispatchEvent(new CustomEvent("notifications:refresh"));

  return true;
};
