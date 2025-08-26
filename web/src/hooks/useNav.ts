import { useMemo } from 'react';
import { useAppSelector } from '@/app/hooks';
import { NavItem, navigationConfig } from '@/config/nav';

/**
 * Hook to filter navigation items based on user permissions and roles
 * @returns Filtered navigation items that user has access to
 */
export function useNav(): NavItem[] {
  const { user } = useAppSelector((state) => state.auth);
  
  return useMemo(() => {
    if (!user) return [];
    
    const filterNavItem = (item: NavItem): NavItem | null => {
      // Check if item is disabled
      if (item.disabled) return null;
      
      // Check role requirements
      if (item.roles && item.roles.length > 0) {
        const hasRequiredRole = item.roles.some(role => 
          user.roles.includes(role)
        );
        if (!hasRequiredRole) return null;
      }
      
      // Check permission requirements
      if (item.permissions && item.permissions.length > 0) {
        const hasRequiredPermission = item.permissions.some(permission => 
          user.permissions.includes(permission) || 
          user.permissions.includes('*') ||
          user.permissions.includes('manage:all') ||
          user.permissions.includes('read:all')
        );
        if (!hasRequiredPermission) return null;
      }
      
      // Filter children recursively
      if (item.children) {
        const filteredChildren = item.children
          .map(filterNavItem)
          .filter((child): child is NavItem => child !== null);
        
        // If no children are accessible, don't show parent
        if (filteredChildren.length === 0) return null;
        
        return {
          ...item,
          children: filteredChildren,
        };
      }
      
      return item;
    };
    
    return navigationConfig
      .map(filterNavItem)
      .filter((item): item is NavItem => item !== null);
  }, [user]);
}

/**
 * Hook to get flattened navigation items (including children)
 * @returns Flattened array of all accessible navigation items
 */
export function useFlattenedNav(): NavItem[] {
  const navItems = useNav();
  
  return useMemo(() => {
    const flatten = (items: NavItem[]): NavItem[] => {
      return items.reduce((acc, item) => {
        acc.push(item);
        if (item.children) {
          acc.push(...flatten(item.children));
        }
        return acc;
      }, [] as NavItem[]);
    };
    
    return flatten(navItems);
  }, [navItems]);
}
