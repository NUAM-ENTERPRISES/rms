import { NotificationHandlerProps, SocketEventHandlerProps } from "./types";

export const handleDocumentNotifications = ({ notification, dispatch, invalidateTags }: NotificationHandlerProps) => {
  const documentNotificationTypes = [
    "candidate_document_updated",
    "document_verified",
    "document_rejected",
    "document_resubmission_requested",
    "document_resubmitted",
    "documentation_notification",
    "recruiter_notification",
    "candidate_documents_verified",
    "candidate_documents_rejected",
    "candidate_sent_for_verification"
  ];

  if (!documentNotificationTypes.includes(notification.type)) return false;

  console.log(`[Socket] Handling document notification: ${notification.type}`);

  const candidateId = 
    notification.data?.candidateId || 
    notification.candidateId || 
    notification.meta?.candidateId || 
    undefined;

  const tags: Array<any> = [
    { type: "VerificationCandidates" },
    { type: "DocumentStats" },
    { type: "RecruiterDocuments" }
  ];

  if (candidateId) {
    tags.push({ type: "DocumentVerification", id: candidateId });
  } else {
    tags.push({ type: "DocumentVerification" });
  }

  dispatch(invalidateTags(tags));
  return true;
};

export const handleDocumentSync = (payload: any, { dispatch, invalidateTags }: { dispatch: any, invalidateTags: any }) => {
  if (payload.type === "RecruiterDocuments") {
    console.log("[Socket] Recruiter documents data sync");
    dispatch(invalidateTags([{ type: "RecruiterDocuments" }]));
    return true;
  }
  return false;
};

export const registerDocumentSocketEvents = (socket: any, { dispatch, invalidateTags }: { dispatch: any, invalidateTags: any }) => {
  const eventTypes = [
    "candidate_document_updated",
    "document_verified",
    "document_rejected",
    "document_resubmission_requested",
    "document_resubmitted"
  ];

  eventTypes.forEach(eventName => {
    socket.on(eventName, (data: any) => {
      handleDocumentSocketEvents(eventName, { data, dispatch, invalidateTags });
    });
  });
};

export const handleDocumentSocketEvents = (eventName: string, { data, dispatch, invalidateTags }: SocketEventHandlerProps) => {
  const eventTypes = [
    "candidate_document_updated",
    "document_verified",
    "document_rejected",
    "document_resubmission_requested",
    "document_resubmitted"
  ];

  if (!eventTypes.includes(eventName)) return false;

  console.log(`[Socket] Direct document event: ${eventName}`, data);
  
  const tags: Array<any> = [
    { type: "VerificationCandidates" },
    { type: "DocumentStats" },
    { type: "RecruiterDocuments" },
  ];

  if (data?.candidateId) {
    tags.push({ type: "DocumentVerification", id: data.candidateId });
  } else {
    tags.push({ type: "DocumentVerification" });
  }

  dispatch(invalidateTags(tags));
  return true;
};
