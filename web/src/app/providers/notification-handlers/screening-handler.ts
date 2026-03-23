import { NotificationHandlerProps } from "./types";

export const handleScreeningNotifications = ({ notification, dispatch, invalidateTags }: NotificationHandlerProps) => {
  const screeningNotificationTypes = [
    "candidate_sent_to_screening",
    "candidate_assigned_to_screening",
    "candidate_assigned_project",
    "screening_updated",
    "screening_failed",
    "screening_passed"
  ];

  if (!screeningNotificationTypes.includes(notification.type)) return false;

  console.log(`[Socket] Handling screening notification: ${notification.type}`);

  const tags: any[] = [
    "Candidate", // Match top-level string tag
    "ProjectCandidates",
    { type: "Screening", id: "LIST" },
    { type: "Candidate", id: "LIST" },
    { type: "ProjectCandidates", id: "LIST" },
  ];

  if (notification.meta?.projectId) {
    tags.push({ type: "Project", id: notification.meta.projectId });
  }

  dispatch(invalidateTags(tags));

  return true;
};

export const handleScreeningSync = (payload: any, { dispatch, invalidateTags }: { dispatch: any, invalidateTags: any }) => {
  if (payload.type === "Screening") {
    console.log("[Socket] Screening data sync");
    dispatch(invalidateTags([
      { type: "Screening", id: "LIST" },
      { type: "Candidate", id: "LIST" }
    ]));
    return true;
  }
  return false;
};
