import { useMemo } from "react";
import { useAppSelector } from "@/app/hooks";
import { NavItem, navigationConfig } from "@/config/nav";
import { hasAllCandidatesView } from "@/config/role-capabilities";
import { ROLE_NAMES } from "@/config/role-names";

/**
 * Hook to filter navigation items based on user permissions and roles
 * @returns Filtered navigation items that user has access to
 */
export function useNav(): NavItem[] {
  const { user } = useAppSelector((state) => state.auth);

  return useMemo(() => {
    if (!user) return [];
    const isProcessingManager = user.roles.includes("Processing Manager");
    const processingManagerAllowedIds = new Set([
      "processing",
      "processing-admin-dashboard",
      "ready-for-processing",
      "profile",
    ]);
    const isProcessingExecutive = user.roles.includes("Processing Executive");
    const processingExecutiveAllowedIds = new Set([
      "processing-dashboard",
      "projects",
      "projects-overview",
      "projects-management",
      "profile",
    ]);
    const isDocumentationExecutive = user.roles.includes("Documentation Executive");
    const documentationExecutiveAllowedIds = new Set([
      "documentation-dashboard",
      "projects",
      "projects-overview",
      "projects-management",
      "profile",
    ]);
    const isDocumentsControlExecutive = user.roles.includes(
      "Documents Control Executive",
    );
    const documentsControlFocusedNavIds = new Set([
      "original-document-intake-main",
      "courier-management-main",
      "profile",
    ]);
    const isProjectCoordinator = user.roles.includes(ROLE_NAMES.PROJECT_COORDINATOR);
    const projectCoordinatorAllowedIds = new Set([
      "project-coordinator-dashboard",
      "projects",
      "projects-overview",
      "projects-management",
      "clients",
      "profile",
    ]);

    const mapNavItemForUser = (item: NavItem): NavItem => {
      if (
        item.id === "candidates-list" &&
        hasAllCandidatesView(user.roles) &&
        !user.roles.includes("Recruiter")
      ) {
        return { ...item, label: "All Candidates" };
      }
      return item;
    };

    const filterNavItem = (item: NavItem): NavItem | null => {
      item = mapNavItemForUser(item);
      // Check if item is disabled
      if (item.disabled) return null;

      // Processing Manager sees only processing menu + profile.
      if (isProcessingManager && !processingManagerAllowedIds.has(item.id)) {
        return null;
      }

      // Processing Executive sees only dashboard, projects, and profile.
      if (
        isProcessingExecutive &&
        !processingExecutiveAllowedIds.has(item.id)
      ) {
        return null;
      }

      // Documentation Executive sees only dashboard, projects, and profile.
      if (
        isDocumentationExecutive &&
        !documentationExecutiveAllowedIds.has(item.id)
      ) {
        return null;
      }

      // Documents Control Executive only: focused sidebar (intake, courier, profile).
      // Other roles with capability flags keep their full role nav plus intake/courier items.
      if (
        isDocumentsControlExecutive &&
        !documentsControlFocusedNavIds.has(item.id)
      ) {
        return null;
      }

      // Project Coordinator sees only dashboard, projects, clients, profile.
      if (
        isProjectCoordinator &&
        !projectCoordinatorAllowedIds.has(item.id)
      ) {
        return null;
      }

      // Check explicit role exclusions
      if (item.hiddenForRoles?.some((role) => user.roles.includes(role))) {
        return null;
      }

      // Check role requirements
      if (item.roles && item.roles.length > 0) {
        const hasRequiredRole = item.roles.some((role) =>
          user.roles.includes(role)
        );
        const hasRequiredPermission =
          item.permissions && item.permissions.length > 0
            ? item.permissions.some(
                (permission) =>
                  user.permissions.includes(permission) ||
                  user.permissions.includes("*") ||
                  user.permissions.includes("manage:all") ||
                  user.permissions.includes("read:all")
              )
            : false;

        if (item.matchRolesOrPermissions) {
          if (!hasRequiredRole && !hasRequiredPermission) return null;
        } else if (!hasRequiredRole) {
          return null;
        }
      }

      // Check permission requirements (skip when matchRolesOrPermissions already evaluated both)
      if (
        item.permissions &&
        item.permissions.length > 0 &&
        !(item.roles && item.roles.length > 0 && item.matchRolesOrPermissions)
      ) {
        const hasRequiredPermission = item.permissions.some(
          (permission) =>
            user.permissions.includes(permission) ||
            user.permissions.includes("*") ||
            user.permissions.includes("manage:all") ||
            user.permissions.includes("read:all")
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

    const filteredNav = navigationConfig
      .map(filterNavItem)
      .filter((item): item is NavItem => item !== null);

    if (!isProcessingManager) {
      return filteredNav;
    }

    // For Processing Manager, show processing links as plain top-level items.
    return filteredNav.flatMap((item) => {
      if (item.id === "processing" && item.children) {
        return item.children.map((child) => ({
          ...child,
          icon: child.icon ?? item.icon,
        }));
      }
      return [item];
    });
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
