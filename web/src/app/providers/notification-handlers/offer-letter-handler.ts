import { NotificationHandlerProps } from "./types";

const OFFER_LETTER_SYNC_TAGS = (
  candidateId?: string,
  projectId?: string,
): Array<string | { type: string; id?: string }> => {
  const tags: Array<string | { type: string; id?: string }> = [
    "Interview",
    "ProcessingSummary",
    "Candidate",
    "Document",
    { type: "Interview" },
    { type: "ProcessingSummary", id: "LIST" },
    { type: "Processing", id: "LIST" },
    { type: "RecruiterDocuments" },
    { type: "DocumentVerification" },
  ];

  if (candidateId) {
    tags.push({ type: "Candidate", id: candidateId });
    tags.push({ type: "DocumentVerification", id: candidateId });
  }

  if (projectId) {
    tags.push({ type: "Project", id: projectId });
  }

  return tags;
};

const resolveOfferLetterNotificationType = (notification: {
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

export const handleOfferLetterNotifications = ({
  notification,
  dispatch,
  invalidateTags,
}: NotificationHandlerProps) => {
  const notificationType = resolveOfferLetterNotificationType(notification);

  if (
    notificationType !== "offer_letter_uploaded" &&
    notificationType !== "offer_letter_upload_requested"
  ) {
    return false;
  }

  console.log(`[Socket] Handling offer letter notification: ${notificationType}`);

  const candidateId =
    notification.meta?.candidateId ?? notification.data?.candidateId;
  const projectId =
    notification.meta?.projectId ?? notification.data?.projectId;

  const tags = OFFER_LETTER_SYNC_TAGS(candidateId, projectId);
  if (candidateId) {
    tags.push({ type: "Document", id: `offer-letter-requests-${candidateId}` });
  }

  dispatch(invalidateTags(tags));
  window.dispatchEvent(new CustomEvent("notifications:refresh"));
  return true;
};

export const handleOfferLetterSync = (
  payload: { type?: string; candidateId?: string; projectId?: string },
  { dispatch, invalidateTags }: { dispatch: any; invalidateTags: any },
) => {
  if (
    payload.type !== "OfferLetterUploaded" &&
    payload.type !== "OfferLetterUploadRequested"
  ) {
    return false;
  }

  console.log("[Socket] Offer letter data sync", payload);

  const tags = OFFER_LETTER_SYNC_TAGS(payload.candidateId, payload.projectId);
  if (payload.candidateId) {
    tags.push({
      type: "Document",
      id: `offer-letter-requests-${payload.candidateId}`,
    });
  }

  dispatch(invalidateTags(tags));
  window.dispatchEvent(new CustomEvent("notifications:refresh"));
  return true;
};
