/**
 * Shared permission hook - cross-domain UI logic
 * Following FE_GUIDELINES.md shared pattern
 */

import { useAppSelector } from "@/app/hooks";

export const usePermissions = () => {
  const { user } = useAppSelector((state) => state.auth);
  const roles = user?.roles || [];
  const permissions = user?.permissions || [];

  const hasRole = (requiredRoles: string | string[]): boolean => {
    const rolesArray = Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles];
    return rolesArray.some((role) => roles.includes(role));
  };

  const hasPermission = (requiredPermissions: string | string[]): boolean => {
    const permissionsArray = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];
    return permissionsArray.some(
      (permission) =>
        permissions.includes(permission) ||
        permissions.includes("*") ||
        permissions.includes("manage:all") ||
        permissions.includes("read:all")
    );
  };

  const hasAnyRole = (requiredRoles: string[]): boolean => {
    return requiredRoles.some((role) => roles.includes(role));
  };

  const hasAllRoles = (requiredRoles: string[]): boolean => {
    return requiredRoles.every((role) => roles.includes(role));
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(
      (permission) =>
        permissions.includes(permission) || permissions.includes("*")
    );
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(
      (permission) =>
        permissions.includes(permission) || permissions.includes("*")
    );
  };

  const isAdmin = (): boolean => {
    return hasRole(["CEO", "Director"]);
  };

  const isManager = (): boolean => {
    return hasRole(["CEO", "Director", "Manager"]);
  };

  return {
    user,
    roles,
    permissions,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllRoles,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isManager,
  };
};
