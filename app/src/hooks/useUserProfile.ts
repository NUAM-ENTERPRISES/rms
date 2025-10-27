import { useAppSelector } from '@/store/hooks';

/**
 * Simple hook to get user profile data from Redux store
 */
export const useUserProfile = () => {
  const { user, isAuthenticated, isLoading } = useAppSelector(
    (state) => state.auth
  );

  // Helper function to check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  };

  // Helper function to check if user has a specific role
  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  // Helper function to check if user has any of the specified roles
  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => user?.roles?.includes(role)) || false;
  };

  // Helper function to check if user has all of the specified permissions
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => user?.permissions?.includes(permission)) || false;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllPermissions,
  };
};