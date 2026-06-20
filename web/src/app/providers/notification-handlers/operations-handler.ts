import { toast } from "sonner";

/** Handle data synchronization events for the Operations module. */
export const handleOperationsSync = (payload: any, { dispatch, invalidateTags }: any) => {
  if (payload.type === "Candidate" || payload.type === "RecruiterAssignment") {
    dispatch(invalidateTags([{ type: "Candidate" }]));
    return true;
  }
  return false;
};

/** Handle Operations-specific notifications (RNR escalation, transfers, etc.). */
export const handleOperationsNotifications = ({
  notification,
  dispatch,
  invalidateTags,
}: any) => {
  const operationsNotificationTypes = [
    "CRE_ASSIGNMENT",
    "RNR_REMINDER",
    "RNR_ESCALATION",
    "candidate_transferred",
  ];

  if (operationsNotificationTypes.includes(notification.type)) {
    dispatch(
      invalidateTags([
        "Candidate",
        "RecruiterAssignment",
        { type: "Candidate", id: "LIST" },
      ]),
    );

    if (notification.type === "CRE_ASSIGNMENT") {
      toast.success("New RNR Candidate Assigned", {
        description: notification.message,
      });
    }

    return true;
  }

  return false;
};
