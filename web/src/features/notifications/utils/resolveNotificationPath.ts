import type { NotificationDto } from "@/features/notifications/data";

const OFFER_LETTER_NOTIFICATION_TYPES = new Set([
  "offer_letter_uploaded",
  "offer_letter_upload_requested",
]);

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
