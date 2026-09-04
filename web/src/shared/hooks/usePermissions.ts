/**
 * Shared permission hook - cross-domain UI logic
 * Following FE_GUIDELINES.md shared pattern
 */

import { useAppSelector } from "@/app/hooks";
import {
  canAccess,
  hasAllPermissions,
  hasAnyPermission,
} from "@/shared/utils/canAccess";

export const usePermissions = () => {
  const { user } = useAppSelector((state) => state.auth);
  const roles = user?.roles || [];
  const permissions = user?.permissions || [];

  const hasRole = (requiredRoles: string | string[]): boolean => {
    const rolesArray = Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles];
    return canAccess({ roles, permissions }, { roles: rolesArray });
  };

  const hasPermission = (requiredPermissions: string | string[]): boolean => {
    return hasAnyPermission(permissions, requiredPermissions);
  };

  const hasAnyRole = (requiredRoles: string[]): boolean => {
    return canAccess({ roles, permissions }, { roles: requiredRoles });
  };

  const hasAllRoles = (requiredRoles: string[]): boolean => {
    return requiredRoles.every((role) => roles.includes(role));
  };

  const hasAnyPermissionFn = (requiredPermissions: string[]): boolean => {
    return hasAnyPermission(permissions, requiredPermissions);
  };

  const hasAllPermissionsFn = (requiredPermissions: string[]): boolean => {
    return hasAllPermissions(permissions, requiredPermissions);
  };

  const isAdmin = (): boolean => {
    return hasRole(["Managing Director", "Director"]);
  };

  const isManager = (): boolean => {
    return hasRole(["Managing Director", "Director", "Manager", "Recruitment Lead"]);
  };

  return {
    user,
    roles,
    permissions,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllRoles,
    hasAnyPermission: hasAnyPermissionFn,
    hasAllPermissions: hasAllPermissionsFn,
    isAdmin,
    isManager,
  };
};
