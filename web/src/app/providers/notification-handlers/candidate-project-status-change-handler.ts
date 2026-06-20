import { NotificationHandlerProps } from "./types";

const STATUS_CHANGE_NOTIFICATION_TYPES = [
  "candidate_project_status_change_request",
  "candidate_project_status_change_reviewed",
];

export const handleCandidateProjectStatusChangeNotifications = ({
  notification,
  dispatch,
  invalidateTags,
}: NotificationHandlerProps) => {
  if (!STATUS_CHANGE_NOTIFICATION_TYPES.includes(notification.type)) {
    return false;
  }

  const candidateId = notification.meta?.candidateId as string | undefined;
  const projectId = notification.meta?.projectId as string | undefined;
  const candidateProjectMapId = notification.meta?.candidateProjectMapId as
    | string
    | undefined;

  const tags: Array<string | { type: string; id: string }> = [];

  if (candidateId) {
    tags.push({ type: "Candidate", id: candidateId });
  }

  if (candidateId && projectId) {
    tags.push({
      type: "Candidate",
      id: `pipeline-${candidateId}-${projectId}`,
    });
  }

  if (candidateProjectMapId) {
    tags.push({
      type: "Candidate",
      id: `status-change-history-${candidateProjectMapId}`,
    });
  }

  if (tags.length > 0) {
    dispatch(invalidateTags(tags));
  }

  return true;
};
