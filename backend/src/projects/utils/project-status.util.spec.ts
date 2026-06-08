import { ProjectStatus } from '@prisma/client';
import { parseProjectStatusInput } from './project-status.util';

describe('parseProjectStatusInput', () => {
  it('accepts Prisma enum values case-insensitively', () => {
    expect(parseProjectStatusInput('IN_PROGRESS')).toBe(
      ProjectStatus.IN_PROGRESS,
    );
    expect(parseProjectStatusInput('completed')).toBe(ProjectStatus.COMPLETED);
  });

  it('accepts frontend snake_case values', () => {
    expect(parseProjectStatusInput('in_progress')).toBe(
      ProjectStatus.IN_PROGRESS,
    );
    expect(parseProjectStatusInput('on_hold')).toBe(ProjectStatus.ON_HOLD);
    expect(parseProjectStatusInput('cancelled')).toBe(ProjectStatus.CANCELLED);
  });

  it('maps legacy active/inactive values', () => {
    expect(parseProjectStatusInput('active')).toBe(ProjectStatus.IN_PROGRESS);
    expect(parseProjectStatusInput('inactive')).toBe(ProjectStatus.CANCELLED);
  });

  it('returns undefined for empty or unknown values', () => {
    expect(parseProjectStatusInput(undefined)).toBeUndefined();
    expect(parseProjectStatusInput('')).toBeUndefined();
    expect(parseProjectStatusInput('draft')).toBeUndefined();
  });
});
