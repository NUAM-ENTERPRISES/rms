import { NotificationHandlerProps } from "./types";

export const handleInterviewNotifications = ({ notification, dispatch, invalidateTags }: NotificationHandlerProps) => {
  const interviewNotificationTypes = [
    "documents_forwarded",
  ];

  if (!interviewNotificationTypes.includes(notification.type)) return false;

  console.log(`[Socket] Handling interview notification: ${notification.type}`);

  const tags: Array<any> = [
    { type: "Interview" },
  ];

  dispatch(invalidateTags(tags));
  return true;
};
