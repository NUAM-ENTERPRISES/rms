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

  if (isProjectDeadlineExpired(project.deadline ?? null, now)) {
    throw new BadRequestException(
      'Cannot assign candidates: project deadline has passed and the project is closed.',
    );
  }
}
