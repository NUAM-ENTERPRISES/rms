import { expandRoleNames } from "@/config/role-names";

export type AccessUser = {
  roles: string[];
  permissions: string[];
};

export type AccessOptions = {
  roles?: string[];
  permissions?: string[];
  /**
   * When true and both roles and permissions are listed, allow if the user
   * matches either. Default is permission-first (roles ignored when permissions exist).
   */
  matchRolesOrPermissions?: boolean;
};

function hasFullWildcard(permissions: string[]): boolean {
  return permissions.includes("*") || permissions.includes("manage:all");
}

function resourceKey(permission: string): string | null {
  const separator = permission.indexOf(":");
  if (separator <= 0 || separator === permission.length - 1) return null;
  return permission.slice(separator + 1);
}

function permissionSatisfied(
  userPermissions: string[],
  required: string,
): boolean {
  if (userPermissions.includes(required)) return true;
  if (
    userPermissions.includes("read:all") &&
    (required === "read:all" || required.startsWith("read:"))
  ) {
    return true;
  }
  const resource = resourceKey(required);
  if (resource && userPermissions.includes(`manage:${resource}`)) {
    return true;
  }
  return false;
}

/** True if the user has any of the required permission keys. */
export function hasAnyPermission(
  userPermissions: string[],
  required: string | string[],
): boolean {
  const requiredList = Array.isArray(required) ? required : [required];
  if (requiredList.length === 0) return true;
  if (hasFullWildcard(userPermissions)) return true;
  return requiredList.some((key) =>
    permissionSatisfied(userPermissions, key),
  );
}

/** True if the user has every required permission key. */
export function hasAllPermissions(
  userPermissions: string[],
  required: string[],
): boolean {
  if (required.length === 0) return true;
  if (hasFullWildcard(userPermissions)) return true;
  return required.every((key) => permissionSatisfied(userPermissions, key));
}

/**
 * Route/nav access: auth-only when both lists are empty.
 * Feature items (permissions listed) require a matching permission so
 * unchecked catalog keys stay off the sidebar. Roles apply only when
 * no permissions are listed (job-home dashboards), unless
 * matchRolesOrPermissions is set.
 */
export function canAccess(
  user: AccessUser,
  opts: AccessOptions,
): boolean {
  const roles = opts.roles ?? [];
  const permissions = opts.permissions ?? [];
  const matchOr = opts.matchRolesOrPermissions === true;

  if (roles.length === 0 && permissions.length === 0) return true;

  const expandedRoles = expandRoleNames(roles);
  const hasRole =
    expandedRoles.length > 0 &&
    user.roles.some((role) => expandedRoles.includes(role));
  const hasPermission =
    permissions.length > 0 &&
    hasAnyPermission(user.permissions, permissions);

  if (matchOr && roles.length > 0 && permissions.length > 0) {
    return hasRole || hasPermission;
  }

  if (permissions.length > 0) {
    return hasPermission;
  }

  return hasRole;
}
