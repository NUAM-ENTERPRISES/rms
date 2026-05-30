import {
  buildUrgentProjectsWhere,
  getUrgentDeadlineRange,
} from './urgent-deadline.util';

describe('urgent-deadline.util', () => {
  it('returns start of today through end of the 7th calendar day', () => {
    const now = new Date('2026-05-30T15:30:00.000Z');
    const { gte, lte } = getUrgentDeadlineRange(now);

    expect(gte).toEqual(new Date(2026, 4, 30, 0, 0, 0, 0));
    expect(lte).toEqual(new Date(2026, 5, 6, 23, 59, 59, 999));
  });

  it('builds active-only where clause with non-null deadline', () => {
    const now = new Date('2026-05-30T15:30:00.000Z');
    const where = buildUrgentProjectsWhere(now);

    expect(where.status).toBe('active');
    expect(where.deadline.not).toBeNull();
    expect(where.deadline.gte).toEqual(new Date(2026, 4, 30, 0, 0, 0, 0));
    expect(where.deadline.lte).toEqual(new Date(2026, 5, 6, 23, 59, 59, 999));
  });
});
