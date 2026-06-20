const BLOCKED_MAIN_STATUSES = new Set(["withdrawn", "on_hold"]);

export function isCandidateProjectPipelineBlocked(
  mainStatusName: string | null | undefined,
): boolean {
  if (!mainStatusName) return false;
  return BLOCKED_MAIN_STATUSES.has(mainStatusName.toLowerCase());
}

export function getStatusChangeTargetLabel(status: string): string {
  return status === "on_hold" ? "On Hold" : "Withdrawn";
}

export const STATUS_CHANGE_APPROVER_ROLES = [
  "CEO",
  "Director",
  "Manager",
  "Recruiter Manager",
  "System Admin",
  "Admin",
] as const;

/** Roles that apply Withdrawn/On Hold immediately without approval */
export const STATUS_CHANGE_DIRECT_ROLES = [
  "Manager",
  "Recruiter Manager",
] as const;
