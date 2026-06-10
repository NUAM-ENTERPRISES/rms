import { BadRequestException } from '@nestjs/common';

/** Start of local calendar day (server timezone). */
export function getStartOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** True when deadline is strictly before the start of today. */
export function isProjectDeadlineExpired(
  deadline: Date | null | undefined,
  now = new Date(),
): boolean {
  if (!deadline) {
    return false;
  }
  const startOfToday = getStartOfToday(now);
  return deadline.getTime() < startOfToday.getTime();
}

export function buildExpiredActiveProjectsWhere(now = new Date()) {
  const startOfToday = getStartOfToday(now);

  return {
    status: 'IN_PROGRESS' as const,
    deadline: {
      not: null,
      lt: startOfToday,
    },
  };
}

/** In-progress projects that are not past their deadline (null deadline counts as active). */
export function buildInProgressProjectsWhere(now = new Date()) {
  const startOfToday = getStartOfToday(now);

  return {
    status: 'IN_PROGRESS' as const,
    AND: [
      {
        OR: [{ deadline: null }, { deadline: { gte: startOfToday } }],
      },
    ],
  };
}

export type ProjectAssignmentGate = {
  status: string;
  deadline?: Date | null;
};

export function assertProjectOpenForAssignment(
  project: ProjectAssignmentGate,
  now = new Date(),
): void {
  if (project.status !== 'IN_PROGRESS') {
    throw new BadRequestException(
      `Cannot assign candidates to a project with status "${project.status}".`,
    );
  }
}
