import { NotificationHandlerProps } from "./types";

export const handleInterviewNotifications = ({ notification, dispatch, invalidateTags }: NotificationHandlerProps) => {
  const interviewNotificationTypes = [
    "role_notification",
  ];

  if (!interviewNotificationTypes.includes(notification.type)) return false;
  
  // For role_notification, check if it explicitly mentions Interview tag or if it's the specific title
  if (notification.type === "role_notification") {
    const isMockInterview = notification.title === "Client Revision Requested" || 
                           notification.meta?.syncTags?.includes("Interview");
    
    if (!isMockInterview) return false;
  }

  console.log(`[Socket] Handling interview notification: ${notification.type}`);

  const tags: Array<any> = [
    { type: "Interview" },
  ];

  dispatch(invalidateTags(tags));
  return true;
};
