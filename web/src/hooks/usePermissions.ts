import { useSelector } from "react-redux";
import { RootState } from "@/app/store";

export const usePermissions = () => {
  const { roles, permissions } = useSelector(
    (state: RootState) => state.auth.user || { roles: [], permissions: [] }
  );

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
    return permissionsArray.some((permission) =>
      permissions.includes(permission)
    );
  };

  const hasAnyRole = (requiredRoles: string[]): boolean => {
    return requiredRoles.some((role) => roles.includes(role));
  };

  const hasAllRoles = (requiredRoles: string[]): boolean => {
    return requiredRoles.every((role) => roles.includes(role));
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some((permission) =>
      permissions.includes(permission)
    );
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every((permission) =>
      permissions.includes(permission)
    );
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
  const isAdmin = hasRole(["CEO", "Director"]);
  const isManager = hasRole(["Manager", "CEO", "Director"]);
  const isRecruiter = hasRole(["Recruiter", "Manager", "CEO", "Director"]);

  return {
    roles,
    permissions,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllRoles,
    hasAnyPermission,
    hasAllPermissions,
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
