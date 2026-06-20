import { getStartOfToday } from './project-deadline.util';

/**
 * Upcoming urgent deadline window: start of today through end of the 7th calendar day.
 */
export function getUrgentDeadlineRange(now = new Date()): {
  gte: Date;
  lte: Date;
} {
  const startOfToday = getStartOfToday(now);

  const endOfSeventhDay = new Date(startOfToday);
  endOfSeventhDay.setDate(endOfSeventhDay.getDate() + 7);
  endOfSeventhDay.setHours(23, 59, 59, 999);

  return { gte: startOfToday, lte: endOfSeventhDay };
}

/**
 * In-progress projects that are overdue or due within the next 7 calendar days.
 * Aligned with frontend ProjectService.isUrgent.
 */
export function buildUrgentProjectsWhere(now = new Date()) {
  const startOfToday = getStartOfToday(now);
  const { gte, lte } = getUrgentDeadlineRange(now);

  return {
    status: 'IN_PROGRESS' as const,
    AND: [
      { deadline: { not: null } },
      {
        OR: [
          { deadline: { lt: startOfToday } },
          {
            deadline: {
              gte,
              lte,
            },
          },
        ],
      },
    ],
  };
}
