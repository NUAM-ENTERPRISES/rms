import { PERMISSIONS } from '../constants/permissions';
import { ROLE_NAMES } from '../constants/role-ids';

export type DocumentationAccessUser = {
  id?: string;
  sub?: string;
  roles?: string[];
  permissions?: string[];
};

export function getDocumentationAccessUserId(
  user?: DocumentationAccessUser | null,
): string | undefined {
  return user?.id || user?.sub;
}

/**
 * Documentation Executives without manage:documents only see candidates assigned to them.
 * System Admin / Recruiter Manager / other manage:documents roles see the full queue.
 */
export function shouldScopeToAssignedDocumentationExecutive(
  user?: DocumentationAccessUser | null,
): boolean {
  if (!user) {
    return false;
  }

  const permissions = user.permissions ?? [];
  if (
    permissions.includes(PERMISSIONS.MANAGE_DOCUMENTS) ||
    permissions.includes(PERMISSIONS.ALL) ||
    permissions.includes(PERMISSIONS.MANAGE_ALL)
  ) {
    return false;
  }

  return (user.roles ?? []).includes(ROLE_NAMES.DOCUMENTATION_EXECUTIVE);
}

export function getAssignedDocumentationExecutiveFilter(
  user?: DocumentationAccessUser | null,
): { assignedDocumentationExecutiveId: string } | undefined {
  if (!shouldScopeToAssignedDocumentationExecutive(user)) {
    return undefined;
  }

  const userId = getDocumentationAccessUserId(user);
  if (!userId) {
    return undefined;
  }

  return { assignedDocumentationExecutiveId: userId };
}
