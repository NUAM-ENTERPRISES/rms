/** Maps Candidate Overview workflow-details `type` query to project main status filter. */
export function resolveWorkflowDetailsMainStatus(
  workflowType: string | null | undefined,
): string | undefined {
  if (!workflowType) return undefined;

  switch (workflowType) {
    case "profile_shortlisting":
    case "nominated":
      return "nominated";
    case "project_on_hold":
      return "on_hold";
    case "project_withdrawn":
      return "withdrawn";
    default:
      return undefined;
  }
}

export function getWorkflowDetailsPageLabel(
  workflowType: string | null | undefined,
): string {
  switch (workflowType) {
    case "profile_shortlisting":
    case "nominated":
      return "Profile Shortlisting";
    case "project_on_hold":
      return "Project On Hold";
    case "project_withdrawn":
      return "Project Withdrawn";
    default:
      return "Project Workflow";
  }
}
