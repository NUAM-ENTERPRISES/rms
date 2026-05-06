/**
 * Project domain constants
 */

export const PROJECT_SECTOR = {
  HEALTHCARE: 'healthcare',
  NON_HEALTHCARE: 'non-healthcare',
} as const;

export type ProjectSector = (typeof PROJECT_SECTOR)[keyof typeof PROJECT_SECTOR];
