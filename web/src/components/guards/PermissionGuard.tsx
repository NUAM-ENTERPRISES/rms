import React from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGuardProps {
  permission: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  fallback = null,
  children,
}) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface RoleGuardProps {
  role: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  role,
  fallback = null,
  children,
}) => {
  const { hasRole } = usePermissions();

  if (!hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AnyPermissionGuardProps {
  permissions: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const AnyPermissionGuard: React.FC<AnyPermissionGuardProps> = ({
  permissions,
  fallback = null,
  children,
}) => {
  const { hasAnyPermission } = usePermissions();

  if (!hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AllPermissionsGuardProps {
  permissions: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const AllPermissionsGuard: React.FC<AllPermissionsGuardProps> = ({
  permissions,
  fallback = null,
  children,
}) => {
  const { hasAllPermissions } = usePermissions();

  if (!hasAllPermissions(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
