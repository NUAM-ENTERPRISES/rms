import { NotificationHandlerProps } from "./types";

const AGENT_CANDIDATE_REQUEST_TYPES = ["agent_candidate_request_created"];

export const handleAgentCandidateRequestNotifications = ({
  notification,
  dispatch,
  invalidateTags,
}: NotificationHandlerProps) => {
  if (!AGENT_CANDIDATE_REQUEST_TYPES.includes(notification.type)) {
    return false;
  }

  const projectId = notification.meta?.projectId as string | undefined;

  const tags: Array<string | { type: string; id: string }> = [
    { type: "Project", id: "AGENT_REQUESTS" },
  ];

  if (projectId) {
    tags.push(
      { type: "Project", id: projectId },
      { type: "Project", id: `ROLE_FILL_${projectId}` },
      { type: "Project", id: `AGENT_REQUESTS_${projectId}` },
    );
  }

  dispatch(invalidateTags(tags));
  return true;
};
