/** Minimal project fields for assignment eligibility checks. */
export type ProjectAssignmentGate = {
  status?: string;
  deadline?: string | null;
};

function getStartOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isProjectDeadlineExpired(
  deadline: string | null | undefined,
  now = new Date()
): boolean {
  if (!deadline) {
    return false;
  }
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return parsed.getTime() < getStartOfToday(now).getTime();
}

export function isProjectOpenForAssignment(
  project: ProjectAssignmentGate | null | undefined,
  now = new Date()
): boolean {
  if (!project || project.status !== "active") {
    return false;
  }
  return !isProjectDeadlineExpired(project.deadline, now);
}

export function getProjectClosureMessage(
  project: ProjectAssignmentGate | null | undefined
): string | null {
  if (!project) {
    return null;
  }
  if (project.status === "completed") {
    return "This project is completed. New candidate assignments are disabled.";
  }
  if (project.status === "cancelled") {
    return "This project is cancelled. New candidate assignments are disabled.";
  }
  if (project.status !== "active") {
    return "This project is not open for new candidate assignments.";
  }
  if (isProjectDeadlineExpired(project.deadline)) {
    return "Project deadline has passed. New candidate assignments are disabled.";
  }
  return null;
}
