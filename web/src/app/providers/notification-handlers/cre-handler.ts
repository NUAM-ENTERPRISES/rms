import { baseApi } from "@/app/api/baseApi";
import { toast } from "sonner";

/**
 * Handle data synchronization events for the CRE module
 */
export const handleCRESync = (payload: any, { dispatch, invalidateTags }: any) => {
  if (payload.type === "Candidate" || payload.type === "RecruiterAssignment") {
    console.log("[CRE Sync] Invalidating Candidate tags");
    dispatch(invalidateTags([{ type: "Candidate" }]));
    return true;
  }
  return false;
};

/**
 * Handle CRE-specific notifications
 */
export const handleCRENotifications = ({ notification, dispatch, invalidateTags }: any) => {
  const creNotificationTypes = [
    "CRE_ASSIGNMENT",
    "RNR_REMINDER",
    "RNR_ESCALATION",
    "candidate_transferred"
  ];

  if (creNotificationTypes.includes(notification.type)) {
    console.log(`[CRE Notification] Handling ${notification.type}`);
    
    // Invalidate candidate list and details to show new assignments/changes
    dispatch(invalidateTags([{ type: "Candidate" }]));
    
    // Show a specific toast if needed (though the provider usually handles this)
    if (notification.type === "CRE_ASSIGNMENT") {
       toast.success("New RNR Candidate Assigned", {
         description: notification.message
       });
    }
    
    return true;
  }

  return false;
};
