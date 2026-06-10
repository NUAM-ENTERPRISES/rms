/**
 * Project domain constants
 * Following FE_GUIDELINES.md entities pattern
 */

export const ProjectStatus = {
  COMPLETED: "completed",
  ON_HOLD: "on_hold",
  IN_PROGRESS: "in_progress",
  CANCELLED: "cancelled",
} as const;

export type ProjectStatusType = typeof ProjectStatus[keyof typeof ProjectStatus];

export const PROJECT_STATUS_LABELS: Record<ProjectStatusType, string> = {
  [ProjectStatus.COMPLETED]: "Completed",
  [ProjectStatus.ON_HOLD]: "On Hold",
  [ProjectStatus.IN_PROGRESS]: "In Progress",
  [ProjectStatus.CANCELLED]: "Cancelled",
};

export const PROJECT_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export const PROJECT_SECTOR = {
  HEALTHCARE: "healthcare",
  NON_HEALTHCARE: "non-healthcare",
} as const;

export const ROLE_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export const SHIFT_TYPES = {
  DAY: "day",
  NIGHT: "night",
  ROTATING: "rotating",
  WEEKEND: "weekend",
  ON_CALL: "on_call",
} as const;

export const FACILITY_SIZES = {
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large",
} as const;

export const PROJECT_SORT_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "deadline", label: "Deadline" },
  { value: "createdAt", label: "Created Date" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
] as const;

export type ShiftType = (typeof SHIFT_TYPES)[keyof typeof SHIFT_TYPES];
export type ProjectPriorityType = (typeof PROJECT_PRIORITY)[keyof typeof PROJECT_PRIORITY];
export type RolePriority = (typeof ROLE_PRIORITY)[keyof typeof ROLE_PRIORITY];
export type FacilitySize = (typeof FACILITY_SIZES)[keyof typeof FACILITY_SIZES];
