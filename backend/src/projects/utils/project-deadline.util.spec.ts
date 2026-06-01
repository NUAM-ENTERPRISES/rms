import { BadRequestException } from '@nestjs/common';
import {
  assertProjectOpenForAssignment,
  buildExpiredActiveProjectsWhere,
  getStartOfToday,
  isProjectDeadlineExpired,
} from './project-deadline.util';

describe('project-deadline.util', () => {
  const now = new Date(2026, 5, 1, 15, 30, 0);

  it('getStartOfToday returns midnight of the same calendar day', () => {
    expect(getStartOfToday(now)).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0));
  });

  it('isProjectDeadlineExpired is true when deadline is before today', () => {
    expect(isProjectDeadlineExpired(new Date(2026, 4, 31, 23, 59, 59), now)).toBe(
      true,
    );
  });

  it('isProjectDeadlineExpired is false for today or future', () => {
    expect(isProjectDeadlineExpired(new Date(2026, 5, 1, 0, 0, 0), now)).toBe(
      false,
    );
    expect(isProjectDeadlineExpired(new Date(2026, 5, 2), now)).toBe(false);
    expect(isProjectDeadlineExpired(null, now)).toBe(false);
  });

  it('buildExpiredActiveProjectsWhere targets active projects before start of today', () => {
    const where = buildExpiredActiveProjectsWhere(now);
    expect(where.status).toBe('active');
    expect(where.deadline.not).toBeNull();
    expect(where.deadline.lt).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0));
  });

  it('assertProjectOpenForAssignment rejects non-active status', () => {
    expect(() =>
      assertProjectOpenForAssignment(
        { status: 'completed', deadline: new Date(2026, 11, 1) },
        now,
      ),
    ).toThrow(BadRequestException);
  });

  it('assertProjectOpenForAssignment rejects expired active project', () => {
    expect(() =>
      assertProjectOpenForAssignment(
        { status: 'active', deadline: new Date(2026, 4, 30) },
        now,
      ),
    ).toThrow(BadRequestException);
  });

  it('assertProjectOpenForAssignment allows active project with future deadline', () => {
    expect(() =>
      assertProjectOpenForAssignment(
        { status: 'active', deadline: new Date(2026, 5, 10) },
        now,
      ),
    ).not.toThrow();
  });
});
