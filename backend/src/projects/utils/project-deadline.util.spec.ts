import { BadRequestException } from '@nestjs/common';
import {
  assertProjectOpenForAssignment,
  buildInProgressProjectsWhere,
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

  it('buildExpiredActiveProjectsWhere targets in-progress projects before start of today', () => {
    const where = buildExpiredActiveProjectsWhere(now);
    expect(where.status).toBe('IN_PROGRESS');
    expect(where.deadline.not).toBeNull();
    expect(where.deadline.lt).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0));
  });

  it('buildInProgressProjectsWhere excludes expired deadlines', () => {
    const where = buildInProgressProjectsWhere(now);
    expect(where.status).toBe('IN_PROGRESS');
    expect(where.AND).toEqual([
      {
        OR: [{ deadline: null }, { deadline: { gte: new Date(2026, 5, 1, 0, 0, 0, 0) } }],
      },
    ]);
  });

  it('assertProjectOpenForAssignment rejects non-in-progress status', () => {
    expect(() =>
      assertProjectOpenForAssignment(
        { status: 'COMPLETED', deadline: new Date(2026, 11, 1) },
        now,
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      assertProjectOpenForAssignment(
        { status: 'ON_HOLD', deadline: new Date(2026, 11, 1) },
        now,
      ),
    ).toThrow(BadRequestException);
  });

  it('assertProjectOpenForAssignment allows in-progress project with expired deadline', () => {
    expect(() =>
      assertProjectOpenForAssignment(
        { status: 'IN_PROGRESS', deadline: new Date(2026, 4, 30) },
        now,
      ),
    ).not.toThrow();
  });

  it('assertProjectOpenForAssignment allows in-progress project with future deadline', () => {
    expect(() =>
      assertProjectOpenForAssignment(
        { status: 'IN_PROGRESS', deadline: new Date(2026, 5, 10) },
        now,
      ),
    ).not.toThrow();
  });
});
