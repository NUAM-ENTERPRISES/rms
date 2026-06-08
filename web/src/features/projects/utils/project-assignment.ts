import { ProjectStatus, ProjectStatusType } from "@/entities/project/constants";

/** Minimal project fields for assignment eligibility checks. */
export type ProjectAssignmentGate = {
  status?: ProjectStatusType;
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
  if (!project || project.status !== ProjectStatus.IN_PROGRESS) {
    return false;
  }
  return !isProjectDeadlineExpired(project.deadline, now);
}

/** Statuses that allow nominating a candidate to a project (aligned with backend). */
export const POSITIVE_ASSIGNMENT_STATUSES = [
  "interested",
  "future",
  "on_hold",
] as const;

export function normalizeCandidateStatusKey(statusLabel: string): string {
  return String(statusLabel || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_");
}

export type CandidateStatusCarrier = {
  currentStatus?:
    | string
    | {
        label?: string;
        name?: string;
        statusName?: string;
      };
};

/** Resolve display/API status label from a candidate record. */
export function getCandidateStatusLabel(
  candidate: CandidateStatusCarrier
): string {
  if (typeof candidate.currentStatus === "string") {
    return candidate.currentStatus.trim();
  }
  const status = candidate.currentStatus;
  return (
    status?.label ||
    status?.statusName ||
    status?.name ||
    ""
  )
    .toString()
    .trim();
}

export function isCandidatePositiveForAssignment(statusLabel: string): boolean {
  const key = normalizeCandidateStatusKey(statusLabel);
  return (POSITIVE_ASSIGNMENT_STATUSES as readonly string[]).includes(key);
}

/** User-facing reason when assignment is blocked by candidate status. */
export function getCandidateAssignmentBlockReason(statusLabel: string): string | null {
  const label = String(statusLabel || "").trim();
  if (!label || isCandidatePositiveForAssignment(label)) {
    return null;
  }

  const key = normalizeCandidateStatusKey(label);
  const byStatus: Record<string, string> = {
    call_back:
      "Candidate is scheduled for a callback. Update status to Interested, Future, or On Hold before assigning to a project.",
    callback:
      "Candidate is scheduled for a callback. Update status to Interested, Future, or On Hold before assigning to a project.",
    rnr: "Candidate is currently in Ringing No Response (RNR) status and cannot be assigned to a project.",
    untouched:
      "Candidate has not been contacted yet. Update status before assigning to a project.",
    not_interested:
      "Candidate is marked as Not Interested and cannot be assigned to a project.",
    not_eligible:
      "Candidate is marked as Not Eligible and cannot be assigned to a project.",
    other_enquiry:
      "Candidate is in Other Enquiry status and cannot be assigned to a project.",
    deployed:
      "Candidate is already deployed and cannot be assigned to another project from this board.",
  };

  return (
    byStatus[key] ??
    "Candidate must be in a positive status (Interested, Future, or On Hold) to be assigned to a project."
  );
}

export function getProjectClosureMessage(
  project: ProjectAssignmentGate | null | undefined
): string | null {
  if (!project) {
    return null;
  }
  if (project.status === ProjectStatus.COMPLETED) {
    return "This project is completed. New candidate assignments are disabled.";
  }
  if (project.status === ProjectStatus.CANCELLED) {
    return "This project is cancelled. New candidate assignments are disabled.";
  }
  if (project.status !== ProjectStatus.IN_PROGRESS) {
    return "This project is not open for new candidate assignments.";
  }
  if (isProjectDeadlineExpired(project.deadline)) {
    return "Project deadline has passed. New candidate assignments are disabled.";
  }
  return null;
}
