import { useAppSelector } from "@/app/hooks";
import { isAgentCoordinatorRole } from "@/config/role-names";
import {
  canAccess,
  hasAllPermissions,
  hasAnyPermission,
} from "@/shared/utils/canAccess";

/**
 * Hook to check if user has required permissions
 * @param required - Single permission or array of permissions
 * @returns boolean indicating if user has permission
 */
export function useCan(required: string | string[]): boolean {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) return false;

  return hasAnyPermission(user.permissions, required);
}

/**
 * Hook to check if user has ALL required permissions
 * @param required - Array of permissions that must all be present
 * @returns boolean indicating if user has all permissions
 */
export function useCanAll(required: string[]): boolean {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) return false;

  return hasAllPermissions(user.permissions, required);
}

/**
 * Hook to check if user has any of the required roles
 * @param required - Single role or array of roles
 * @returns boolean indicating if user has role
 */
export function useHasRole(required: string | string[]): boolean {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) return false;

  const requiredRoles = Array.isArray(required) ? required : [required];

  return canAccess(user, { roles: requiredRoles });
}

/** Agent Coordinator (includes legacy Client Coordinator JWT role name). */
export function useIsAgentCoordinator(): boolean {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) return false;

  return user.roles.some(isAgentCoordinatorRole);
}
