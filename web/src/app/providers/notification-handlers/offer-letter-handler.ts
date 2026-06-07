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

export const handleOfferLetterNotifications = ({
  notification,
  dispatch,
  invalidateTags,
}: NotificationHandlerProps) => {
  if (notification.type !== "offer_letter_uploaded") return false;

  console.log("[Socket] Handling offer letter uploaded notification");

  const candidateId =
    notification.meta?.candidateId ?? notification.data?.candidateId;
  const projectId =
    notification.meta?.projectId ?? notification.data?.projectId;

  dispatch(invalidateTags(OFFER_LETTER_SYNC_TAGS(candidateId, projectId)));
  return true;
};

export const handleOfferLetterSync = (
  payload: { type?: string; candidateId?: string; projectId?: string },
  { dispatch, invalidateTags }: { dispatch: any; invalidateTags: any },
) => {
  if (payload.type !== "OfferLetterUploaded") return false;

  console.log("[Socket] Offer letter data sync", payload);

  dispatch(
    invalidateTags(
      OFFER_LETTER_SYNC_TAGS(payload.candidateId, payload.projectId),
    ),
  );
  return true;
};
