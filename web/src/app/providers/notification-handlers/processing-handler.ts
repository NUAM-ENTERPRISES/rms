import { NotificationHandlerProps } from "./types";

const PROCESSING_NOTIFICATION_TYPES = [
  "interview_passed",
  "candidate_ready_for_processing",
  "candidate_sent_for_processing",
  "candidate_transferred_to_processing",
  "processing_assignment",
  "candidate_hired",
  "processing_step_updated",
  "processing.reminder",
] as const;

const resolveProcessingNotificationType = (notification: {
  type?: string;
  meta?: { type?: string };
}) => {
  if (
    (notification.type === "recruiter_notification" ||
      notification.type === "role_notification") &&
    notification.meta?.type
  ) {
    return notification.meta.type;
  }
  return notification.type;
};

export const handleProcessingNotifications = ({ notification, dispatch, invalidateTags }: NotificationHandlerProps) => {
  const notificationType = resolveProcessingNotificationType(notification);

  if (
    !notificationType ||
    !PROCESSING_NOTIFICATION_TYPES.includes(
      notificationType as (typeof PROCESSING_NOTIFICATION_TYPES)[number],
    )
  ) {
    return false;
  }

  console.log(`[Socket] Handling processing notification: ${notificationType}`);

  const candidateId =
    notification.meta?.candidateId ?? notification.data?.candidateId;
  const projectId =
    notification.meta?.projectId ?? notification.data?.projectId;

  const tags: Array<string | { type: string; id?: string }> = [
    "Interview",
    "Candidate",
    "Processing",
    "ProcessingSummary",
    "ProcessingDetails",
    "RecruiterDocuments",
    { type: "Interview" },
    { type: "ProcessingSummary", id: "LIST" },
    { type: "Processing", id: "LIST" },
  ];

  if (candidateId) {
    tags.push({ type: "Candidate", id: candidateId });
  }
  if (projectId) {
    tags.push({ type: "Project", id: projectId });
  }

  dispatch(invalidateTags(tags));

  // Dispatch a global event to refresh badges
  window.dispatchEvent(new CustomEvent("notifications:refresh"));

  return true;
};

export const handleProcessingSync = (payload: any, { dispatch, invalidateTags }: { dispatch: any, invalidateTags: any }) => {
  if (payload.type === "ProcessingSummary" || payload.type === "Processing") {
    console.log(`[Socket] Processing data sync: ${payload.type}`);
    dispatch(invalidateTags([
      { type: "ProcessingSummary", id: "LIST" },
      { type: "Processing", id: "LIST" }
    ]));
    return true;
  }
  return false;
};
