import { NotificationHandlerProps } from "./types";

export const handleProcessingNotifications = ({ notification, dispatch, invalidateTags }: NotificationHandlerProps) => {
  const processingNotificationTypes = [
    "interview_passed",
    "candidate_ready_for_processing",
    "candidate_transferred_to_processing",
    "candidate_hired",
    "processing_step_updated"
  ];

  if (!processingNotificationTypes.includes(notification.type)) return false;

  console.log(`[Socket] Handling processing notification: ${notification.type}`);

  dispatch(invalidateTags([
    { type: "ProcessingSummary", id: "LIST" },
    { type: "Processing", id: "LIST" }
  ]));

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
