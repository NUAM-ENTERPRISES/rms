import type { NotificationDto } from "@/features/notifications/data";

const OFFER_LETTER_NOTIFICATION_TYPES = new Set([
  "offer_letter_uploaded",
  "offer_letter_upload_requested",
]);

const SENT_FOR_PROCESSING_NOTIFICATION_TYPES = new Set([
  "candidate_ready_for_processing",
  "candidate_sent_for_processing",
]);

function buildReadyForProcessingPath(
  projectId: string,
  meta: Record<string, unknown>,
): string {
  const params = new URLSearchParams();
  params.set("projectId", projectId);

  const candidateName =
    typeof meta.candidateName === "string" ? meta.candidateName : undefined;
  if (candidateName) {
    params.set("search", candidateName);
  }

  return `/ready-for-processing?${params.toString()}`;
}

export function resolveNotificationPath(notification: NotificationDto): string | null {
  const meta = notification.meta ?? {};
  const metaType = typeof meta.type === "string" ? meta.type : undefined;
  const candidateId = typeof meta.candidateId === "string" ? meta.candidateId : undefined;
  const projectId = typeof meta.projectId === "string" ? meta.projectId : undefined;

  const isOfferLetterNotification =
    OFFER_LETTER_NOTIFICATION_TYPES.has(notification.type) ||
    (metaType !== undefined && OFFER_LETTER_NOTIFICATION_TYPES.has(metaType));

  if (isOfferLetterNotification && projectId && candidateId) {
    return `/recruiter-docs/${projectId}/${candidateId}`;
  }

  const isSentForProcessingNotification =
    SENT_FOR_PROCESSING_NOTIFICATION_TYPES.has(notification.type) ||
    (metaType !== undefined &&
      SENT_FOR_PROCESSING_NOTIFICATION_TYPES.has(metaType));

  if (isSentForProcessingNotification && candidateId) {
    const navigationTarget =
      typeof meta.navigationTarget === "string"
        ? meta.navigationTarget
        : undefined;
    const targetRole =
      typeof meta.targetRole === "string" ? meta.targetRole : undefined;

    if (
      navigationTarget === "ready_for_processing" &&
      targetRole !== "Recruiter Manager" &&
      projectId
    ) {
      return buildReadyForProcessingPath(projectId, meta);
    }

    return `/candidates/${candidateId}`;
  }

  if (notification.link) {
    if (
      candidateId &&
      (notification.link.startsWith("/interviews") ||
        notification.link.startsWith("/candidate-projects"))
    ) {
      return `/candidates/${candidateId}`;
    }
    return notification.link;
  }

  if (notification.type === "agent_candidate_request_created" && projectId) {
    return `/projects/${projectId}`;
  }

  if (candidateId) {
    return `/candidates/${candidateId}`;
  }

  return null;
}
