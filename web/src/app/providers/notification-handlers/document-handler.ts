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
    "candidate_sent_for_verification",
    "client_revision_requested",
    "documents_forwarded",
  ];

  if (!documentNotificationTypes.includes(notification.type)) return false;

  console.log(`[Socket] Handling document notification: ${notification.type}`);

  const candidateId = 
    notification.data?.candidateId || 
    notification.candidateId || 
    notification.meta?.candidateId || 
    notification.data?.candidateProject?.candidateId || 
    undefined;

  const projectId = 
    notification.data?.projectId || 
    notification.projectId || 
    notification.meta?.projectId || 
    notification.data?.candidateProject?.projectId ||
    undefined;

  const tags: Array<any> = [
    "Candidate", // Match top-level string tag
    "Project",
    { type: "VerificationCandidates" },
    { type: "DocumentStats" },
    { type: "RecruiterDocuments" },
    { type: "DocumentVerification" }
  ];

  if (projectId) {
    tags.push({ type: "Project", id: projectId });
  }

  if (candidateId) {
    tags.push({ type: "DocumentVerification", id: candidateId });
    tags.push({ type: "Candidate", id: candidateId });
    tags.push({ type: "IntroductionVideo", id: candidateId });
  }

  if (projectId && candidateId) {
    tags.push({ type: "IntroductionVideo", id: `${candidateId}-${projectId}` });
  }

  dispatch(invalidateTags(tags));
  return true;
};

export const handleDocumentSync = (payload: any, { dispatch, invalidateTags }: { dispatch: any, invalidateTags: any }) => {
  if (payload.type === "RecruiterDocuments") {
    console.log("[Socket] Recruiter documents data sync");
    dispatch(invalidateTags([
      { type: "RecruiterDocuments" },
      { type: "IntroductionVideo" },
    ]));
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
    tags.push({ type: "IntroductionVideo", id: data.candidateId });
  } else {
    tags.push({ type: "DocumentVerification" });
    tags.push({ type: "IntroductionVideo" });
  }

  if (data?.candidateId && data?.projectId) {
    tags.push({
      type: "IntroductionVideo",
      id: `${data.candidateId}-${data.projectId}`,
    });
  }

  dispatch(invalidateTags(tags));
  return true;
};
