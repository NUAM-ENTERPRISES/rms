/**
 * Project domain constants
 * Following FE_GUIDELINES.md entities pattern
 */

export const PROJECT_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const PROJECT_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
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

export type ProjectStatus =
  (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];
export type ProjectPriority =
  (typeof PROJECT_PRIORITY)[keyof typeof PROJECT_PRIORITY];
export type RolePriority = (typeof ROLE_PRIORITY)[keyof typeof ROLE_PRIORITY];
export type ShiftType = (typeof SHIFT_TYPES)[keyof typeof SHIFT_TYPES];
export type FacilitySize = (typeof FACILITY_SIZES)[keyof typeof FACILITY_SIZES];
