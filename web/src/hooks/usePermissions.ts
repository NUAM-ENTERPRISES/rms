import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import {
  canAccess,
  hasAllPermissions,
  hasAnyPermission,
} from "@/shared/utils/canAccess";

export const usePermissions = () => {
  const { roles, permissions } = useSelector(
    (state: RootState) => state.auth.user || { roles: [], permissions: [] }
  );

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

  // Common permission checks for Affiniks RMS
  const canManageUsers = hasPermission(["manage:users", "*"]);
  const canViewUsers = hasPermission(["read:users", "manage:users", "*"]);
  const canManageProjects = hasPermission(["manage:projects", "*"]);
  const canViewProjects = hasPermission([
    "read:projects",
    "manage:projects",
    "*",
  ]);
  const canManageCandidates = hasPermission(["manage:candidates", "*"]);
  const canViewCandidates = hasPermission([
    "read:candidates",
    "manage:candidates",
    "*",
  ]);
  const canManageClients = hasPermission(["manage:clients", "*"]);
  const canViewClients = hasPermission(["read:clients", "manage:clients", "*"]);
  const canViewAnalytics = hasPermission(["read:analytics", "*"]);
  const canManageRoles = hasPermission(["manage:roles", "*"]);

  // Role-based checks
  const isAdmin = hasRole(["Managing Director", "Director"]);
  const isManager = hasRole(["Manager", "Managing Director", "Director"]);
  const isRecruiter = hasRole(["Recruitment Executive", "Manager", "Managing Director", "Director"]);

  return {
    roles,
    permissions,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllRoles,
    hasAnyPermission: hasAnyPermissionFn,
    hasAllPermissions: hasAllPermissionsFn,
    // Permission shortcuts
    canManageUsers,
    canViewUsers,
    canManageProjects,
    canViewProjects,
    canManageCandidates,
    canViewCandidates,
    canManageClients,
    canViewClients,
    canViewAnalytics,
    canManageRoles,
    // Role shortcuts
    isAdmin,
    isManager,
    isRecruiter,
  };
};
