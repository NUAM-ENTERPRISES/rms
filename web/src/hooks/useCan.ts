import { useAppSelector } from '@/app/hooks';

/**
 * Hook to check if user has required permissions
 * @param required - Single permission or array of permissions
 * @returns boolean indicating if user has permission
 */
export function useCan(required: string | string[]): boolean {
  const { user } = useAppSelector((state) => state.auth);
  
  if (!user) return false;
  
  const requiredPermissions = Array.isArray(required) ? required : [required];
  
  // Check if user has any of the required permissions
  return requiredPermissions.some(permission => 
    user.permissions.includes(permission) || 
    user.permissions.includes('*') ||
    user.permissions.includes('manage:all') ||
    user.permissions.includes('read:all')
  );
}

/**
 * Hook to check if user has ALL required permissions
 * @param required - Array of permissions that must all be present
 * @returns boolean indicating if user has all permissions
 */
export function useCanAll(required: string[]): boolean {
  const { user } = useAppSelector((state) => state.auth);
  
  if (!user) return false;
  
  // Check if user has all required permissions
  return required.every(permission => 
    user.permissions.includes(permission) || 
    user.permissions.includes('*') ||
    user.permissions.includes('manage:all')
  );
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
  
  return requiredRoles.some(role => user.roles.includes(role));
}
