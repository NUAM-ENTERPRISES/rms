import { NotificationHandlerProps } from "./types";

const resolveProcessingNotificationType = (notification: {
  type?: string;
  meta?: { type?: string };
}) => {
  if (
    notification.type === "recruiter_notification" &&
    notification.meta?.type
  ) {
    return notification.meta.type;
  }
  return notification.type;
};

export const handleProcessingNotifications = ({ notification, dispatch, invalidateTags }: NotificationHandlerProps) => {
  const processingNotificationTypes = [
    "interview_passed",
    "candidate_ready_for_processing",
    "candidate_transferred_to_processing",
    "processing_assignment",  // <--- EVENT from transfer-to-processing outbox
    "candidate_hired",
    "processing_step_updated",
    "processing.reminder",
  ];

  const notificationType = resolveProcessingNotificationType(notification);

  if (!notificationType || !processingNotificationTypes.includes(notificationType)) {
    return false;
  }

  console.log(`[Socket] Handling processing notification: ${notificationType}`);

  dispatch(invalidateTags([
    "Candidate",
    "Processing",
    "ProcessingSummary",
    "ProcessingDetails",
    { type: "ProcessingSummary", id: "LIST" },
    { type: "Processing", id: "LIST" }
  ]));

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
