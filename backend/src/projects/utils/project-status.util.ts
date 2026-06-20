import { ProjectStatus } from '@prisma/client';

const PROJECT_STATUS_BY_KEY: Record<string, ProjectStatus> = {
  completed: ProjectStatus.COMPLETED,
  on_hold: ProjectStatus.ON_HOLD,
  in_progress: ProjectStatus.IN_PROGRESS,
  cancelled: ProjectStatus.CANCELLED,
  active: ProjectStatus.IN_PROGRESS,
  inactive: ProjectStatus.CANCELLED,
};

/** Normalizes API input (snake_case, legacy active/inactive, or enum) to ProjectStatus. */
export function parseProjectStatusInput(
  value: unknown,
): ProjectStatus | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  return PROJECT_STATUS_BY_KEY[normalized];
}
