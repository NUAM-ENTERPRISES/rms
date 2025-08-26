import { ReactNode } from "react";
import { useCan, useCanAny, useHasRole, useHasAllRoles } from "@/hooks/useCan";

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
  // Always call hooks to maintain order
  const canAll = useCan(allOf || []);
  const canAny = useCanAny(anyOf || []);
  const hasRole = useHasRole(roles || []);
  const hasAllRoles = useHasAllRoles(allRoles || []);

  // Check permissions
  const okAll = allOf ? canAll : true;
  const okAny = anyOf ? canAny : true;

  // Check roles
  const okRoles = roles ? hasRole : true;
  const okAllRoles = allRoles ? hasAllRoles : true;

  // All conditions must be met
  const hasAccess = okAll && okAny && okRoles && okAllRoles;

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
