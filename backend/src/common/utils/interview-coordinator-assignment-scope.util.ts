import { PERMISSIONS } from '../constants/permissions';
import { ROLE_NAMES } from '../constants/role-ids';

export type InterviewCoordinatorAccessUser = {
  id?: string;
  sub?: string;
  roles?: string[];
  permissions?: string[];
};

export function getInterviewCoordinatorAccessUserId(
  user?: InterviewCoordinatorAccessUser | null,
): string | undefined {
  return user?.id || user?.sub;
}

/**
 * Interview Coordinators without manage:interviews only see candidates assigned to them
 * (same pattern as Documentation Executive without manage:documents).
 * System Admin / managers with manage:interviews or wildcards see the full queue.
 *
 * Important: the Interview Coordinator role seed must NOT include manage:interviews,
 * or every IC would bypass assignee isolation and share one global queue.
 */
export function shouldScopeToAssignedInterviewCoordinator(
  user?: InterviewCoordinatorAccessUser | null,
): boolean {
  if (!user) {
    return false;
  }

  const permissions = user.permissions ?? [];
  if (
    permissions.includes(PERMISSIONS.MANAGE_INTERVIEWS) ||
    permissions.includes(PERMISSIONS.ALL) ||
    permissions.includes(PERMISSIONS.MANAGE_ALL)
  ) {
    return false;
  }

  return (user.roles ?? []).includes(ROLE_NAMES.INTERVIEW_COORDINATOR);
}

export function getAssignedInterviewCoordinatorFilter(
  user?: InterviewCoordinatorAccessUser | null,
): { assignedInterviewCoordinatorId: string } | undefined {
  if (!shouldScopeToAssignedInterviewCoordinator(user)) {
    return undefined;
  }

  const userId = getInterviewCoordinatorAccessUserId(user);
  if (!userId) {
    return undefined;
  }

  return { assignedInterviewCoordinatorId: userId };
}

/**
 * Prisma filter for Interview / Screening rows owned via candidate_projects assignee.
 */
export function getAssignedInterviewCoordinatorRelationFilter(
  user?: InterviewCoordinatorAccessUser | null,
): { candidateProjectMap: { assignedInterviewCoordinatorId: string } } | undefined {
  const filter = getAssignedInterviewCoordinatorFilter(user);
  if (!filter) {
    return undefined;
  }

  return {
    candidateProjectMap: {
      assignedInterviewCoordinatorId: filter.assignedInterviewCoordinatorId,
    },
  };
}
