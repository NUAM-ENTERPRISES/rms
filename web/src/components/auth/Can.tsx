import { ReactNode } from "react";
import { useCan, useCanAll, useHasRole } from "@/hooks/useCan";

interface CanProps {
  allOf?: string[];
  anyOf?: string[];
  roles?: string[];
  allRoles?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({
  allOf,
  anyOf,
  roles,
  allRoles,
  fallback = null,
  children,
}: CanProps) {
  // Check permissions
  const canAll = allOf ? useCanAll(allOf) : true;
  const canAny = anyOf ? useCan(anyOf) : true;

  // Check roles
  const hasRole = roles ? useHasRole(roles) : true;
  const hasAllRoles = allRoles ? useHasRole(allRoles) : true;

  // All conditions must be met
  const hasAccess = canAll && canAny && hasRole && hasAllRoles;

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Convenience components for common patterns
export function CanManage({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Can anyOf={["manage:all", "manage:users"]} fallback={fallback}>
      {children}
    </Can>
  );
}

export function CanRead({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Can anyOf={["read:all", "read:users"]} fallback={fallback}>
      {children}
    </Can>
  );
}

export function CanWrite({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Can anyOf={["write:all", "write:users"]} fallback={fallback}>
      {children}
    </Can>
  );
}

export function IsAdmin({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Can roles={["CEO", "Director"]} fallback={fallback}>
      {children}
    </Can>
  );
}

export function IsManager({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Can roles={["CEO", "Director", "Manager"]} fallback={fallback}>
      {children}
    </Can>
  );
}
