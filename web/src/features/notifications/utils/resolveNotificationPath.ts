import type { NotificationDto } from "@/features/notifications/data";
import {
  buildInterviewPassedHighlightPath,
  isInterviewsListLink,
  parseSearchFromLink,
  resolveInterviewsShortlistPendingPath,
} from "@/features/interviews/utils/interviewsListNavigation";
import { ROLE_NAMES, roleNameEquals } from "@/config/role-names";

const OFFER_LETTER_NOTIFICATION_TYPES = new Set([
  "offer_letter_uploaded",
  "offer_letter_upload_requested",
]);

const OFFER_LETTER_INTERVIEW_DETAIL_ROLES = new Set([
  "Interview Coordinator",
  "Processing Executive",
]);

const RECRUITER_DOCS_DETAIL_PATH = /^\/recruiter-docs\/([^/]+)\/([^/?]+)/;
const INTERVIEW_DETAIL_PATH = /^\/interviews\/detail\/([^/?]+)/;

export type ResolveNotificationPathOptions = {
  viewerRoles?: string[];
};

function viewerPrefersOfferLetterInterviewDetail(
  viewerRoles: string[] | undefined,
): boolean {
  return (
    viewerRoles?.some((role) => OFFER_LETTER_INTERVIEW_DETAIL_ROLES.has(role)) ??
    false
  );
}

function buildInterviewDetailPath(interviewId: string): string {
  return `/interviews/detail/${interviewId}`;
}

const SENT_FOR_PROCESSING_NOTIFICATION_TYPES = new Set([
  "candidate_ready_for_processing",
  "candidate_sent_for_processing",
]);

const PROCESSING_RELEASED_INTERVIEW_COORDINATOR_TYPES = new Set([
  "processing_released_for_interview_coordinator",
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

function resolveOfferLetterDetailPath(
  notification: NotificationDto,
  candidateId?: string,
  projectId?: string,
  metaType?: string,
  meta: Record<string, unknown> = {},
  viewerRoles?: string[],
): string | null {
  const isOfferLetterNotification =
    OFFER_LETTER_NOTIFICATION_TYPES.has(notification.type) ||
    (metaType !== undefined && OFFER_LETTER_NOTIFICATION_TYPES.has(metaType));

  if (!isOfferLetterNotification) {
    return null;
  }

  const interviewId =
    typeof meta.interviewId === "string" ? meta.interviewId : undefined;

  const link = notification.link ?? "";
  const interviewDetailMatch = link.match(INTERVIEW_DETAIL_PATH);
  if (interviewDetailMatch) {
    return buildInterviewDetailPath(interviewDetailMatch[1]);
  }

  if (
    interviewId &&
    viewerPrefersOfferLetterInterviewDetail(viewerRoles)
  ) {
    return buildInterviewDetailPath(interviewId);
  }

  if (projectId && candidateId) {
    return `/recruiter-docs/${projectId}/${candidateId}`;
  }

  const match = link.match(RECRUITER_DOCS_DETAIL_PATH);
  if (match) {
    return `/recruiter-docs/${match[1]}/${match[2]}`;
  }

  return null;
}

export function resolveNotificationPath(
  notification: NotificationDto,
  options?: ResolveNotificationPathOptions,
): string | null {
  const meta = notification.meta ?? {};
  const metaType = typeof meta.type === "string" ? meta.type : undefined;
  const candidateId = typeof meta.candidateId === "string" ? meta.candidateId : undefined;
  const projectId = typeof meta.projectId === "string" ? meta.projectId : undefined;
  const viewerRoles = options?.viewerRoles;

  const offerLetterDetailPath = resolveOfferLetterDetailPath(
    notification,
    candidateId,
    projectId,
    metaType,
    meta,
    viewerRoles,
  );
  if (offerLetterDetailPath) {
    return offerLetterDetailPath;
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
      !(targetRole && roleNameEquals(targetRole, ROLE_NAMES.RECRUITMENT_LEAD)) &&
      projectId
    ) {
      return buildReadyForProcessingPath(projectId, meta);
    }

    return `/candidates/${candidateId}`;
  }

  const isProcessingReleasedInterviewCoordinatorNotification =
    PROCESSING_RELEASED_INTERVIEW_COORDINATOR_TYPES.has(notification.type) ||
    (metaType !== undefined &&
      PROCESSING_RELEASED_INTERVIEW_COORDINATOR_TYPES.has(metaType));

  if (isProcessingReleasedInterviewCoordinatorNotification && candidateId) {
    const candidateName =
      typeof meta.candidateName === "string"
        ? meta.candidateName
        : notification.link
          ? parseSearchFromLink(notification.link)
          : undefined;

    return buildInterviewPassedHighlightPath({
      candidateId,
      candidateName,
      projectId,
    });
  }

  if (notification.type === "documents_forwarded") {
    return resolveInterviewsShortlistPendingPath(notification.link, meta);
  }

  if (notification.link?.startsWith("/interviews/shortlist-pending")) {
    return resolveInterviewsShortlistPendingPath(notification.link, meta);
  }

  if (notification.link) {
    if (
      candidateId &&
      !isInterviewsListLink(notification.link) &&
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
