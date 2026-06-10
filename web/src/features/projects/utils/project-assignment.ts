import { ProjectStatus, ProjectStatusType } from "@/entities/project/constants";
import { normalizeProjectStatusKey } from "@/features/projects/constants/statusBadges";

/** Minimal project fields for assignment eligibility checks. */
export type ProjectAssignmentGate = {
  status?: ProjectStatusType | string | null;
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

/** Normalizes API enum (`IN_PROGRESS`), snake_case, and legacy active/inactive to ProjectStatusType. */
export function resolveProjectGateStatus(
  status?: string | null
): ProjectStatusType | null {
  const key = normalizeProjectStatusKey(status);
  if (!key) return null;
  if (key === "active") return ProjectStatus.IN_PROGRESS;
  if (key === "inactive") return ProjectStatus.CANCELLED;
  if (key === ProjectStatus.IN_PROGRESS) return ProjectStatus.IN_PROGRESS;
  if (key === ProjectStatus.COMPLETED) return ProjectStatus.COMPLETED;
  if (key === ProjectStatus.ON_HOLD) return ProjectStatus.ON_HOLD;
  if (key === ProjectStatus.CANCELLED) return ProjectStatus.CANCELLED;
  return null;
}

export function isProjectOpenForAssignment(
  project: ProjectAssignmentGate | null | undefined
): boolean {
  if (!project) {
    return false;
  }
  const status = resolveProjectGateStatus(project.status);
  return status === ProjectStatus.IN_PROGRESS;
}

/** Alias: same gate for assign, verification, interview, and screening actions. */
export const isProjectOpenForPipelineActions = isProjectOpenForAssignment;

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

export type CandidateAssignmentBlockOptions = {
  isCREReassigned?: boolean;
};

/** User-facing reason when assignment is blocked by candidate status. */
export function getCandidateAssignmentBlockReason(
  statusLabel: string,
  options?: CandidateAssignmentBlockOptions,
): string | null {
  const label = String(statusLabel || "").trim();
  if (!label || isCandidatePositiveForAssignment(label)) {
    return null;
  }

  const key = normalizeCandidateStatusKey(label);
  if (key === "rnr" && !options?.isCREReassigned) {
    return "This candidate is in RNR and is with Operations. You can assign them only after Operations reassigns them back to you.";
  }
  if (key === "rnr" && options?.isCREReassigned) {
    return "Candidate is still in RNR status. Update status to Interested, Future, or On Hold before assigning to a project.";
  }

  const byStatus: Record<string, string> = {
    call_back:
      "Candidate is scheduled for a callback. Update status to Interested, Future, or On Hold before assigning to a project.",
    callback:
      "Candidate is scheduled for a callback. Update status to Interested, Future, or On Hold before assigning to a project.",
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
  const status = resolveProjectGateStatus(project.status);
  if (status === ProjectStatus.COMPLETED) {
    return "This project is completed. The pipeline to this project is closed.";
  }
  if (status === ProjectStatus.CANCELLED) {
    return "This project is cancelled. The pipeline to this project is closed.";
  }
  if (status === ProjectStatus.ON_HOLD) {
    return "This project is on hold. The pipeline to this project is closed.";
  }
  if (status !== ProjectStatus.IN_PROGRESS) {
    return "The pipeline to this project is closed.";
  }
  return null;
}

/** Informational notice when deadline has passed; pipeline remains open. */
export function getProjectDeadlineNoticeMessage(
  project: ProjectAssignmentGate | null | undefined,
  now = new Date()
): string | null {
  if (!project) {
    return null;
  }
  const status = resolveProjectGateStatus(project.status);
  if (status !== ProjectStatus.IN_PROGRESS) {
    return null;
  }
  if (!isProjectDeadlineExpired(project.deadline, now)) {
    return null;
  }
  return "Project deadline has passed.";
}
