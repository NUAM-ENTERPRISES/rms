/**
 * Urgent deadline window aligned with frontend ProjectService.isUrgent:
 * active projects whose deadline falls within the next 7 calendar days (inclusive).
 */
export function getUrgentDeadlineRange(now = new Date()): {
  gte: Date;
  lte: Date;
} {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const endOfSeventhDay = new Date(startOfToday);
  endOfSeventhDay.setDate(endOfSeventhDay.getDate() + 7);
  endOfSeventhDay.setHours(23, 59, 59, 999);

  return { gte: startOfToday, lte: endOfSeventhDay };
}

export function buildUrgentProjectsWhere(now = new Date()) {
  const { gte, lte } = getUrgentDeadlineRange(now);

  return {
    status: 'IN_PROGRESS' as const,
    deadline: {
      not: null,
      gte,
      lte,
    },
  };
}
