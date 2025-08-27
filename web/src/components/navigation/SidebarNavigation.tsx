import React from "react";
import { Link, useLocation } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Users,
  Briefcase,
  UserCheck,
  Building2,
  BarChart3,
  Settings,
  Home,
  FileText,
  Calendar,
  Cog,
  Bell,
  User,
  Shield,
} from "lucide-react";

interface NavigationItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  permissions?: string[];
  badge?: string;
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["CEO", "Director", "Manager"],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: Building2,
    // Accessible to all roles - core business function
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Briefcase,
    // Accessible to all roles - essential context
  },
  {
    label: "Teams",
    href: "/teams",
    icon: Users,
    permissions: ["read:teams"],
  },
  {
    label: "Candidates",
    href: "/candidates",
    icon: UserCheck,
    permissions: ["read:candidates"],
  },
  {
    label: "Interviews",
    href: "/interviews",
    icon: Calendar,
    permissions: ["read:interviews"],
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    permissions: ["read:documents"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    // Accessible to all roles - important for staying updated
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    permissions: ["read:analytics"],
  },
  {
    label: "Administration",
    icon: Shield,
    roles: ["CEO", "Director", "Manager"],
    children: [
      {
        label: "Users",
        href: "/admin/users",
        icon: Users,
        permissions: ["read:users"],
        roles: ["CEO", "Director", "Manager"],
      },
      {
        label: "Roles & Permissions",
        href: "/admin/roles",
        icon: Shield,
        permissions: ["read:roles"],
        roles: ["CEO", "Director", "Manager"],
      },
      {
        label: "Team Management",
        href: "/admin/teams",
        icon: Users,
        permissions: ["read:teams"],
        roles: ["CEO", "Director", "Manager"],
      },
    ],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    permissions: ["read:settings"],
    roles: ["CEO", "Director", "Manager"],
  },
  {
    label: "System",
    href: "/system",
    icon: Cog,
    roles: ["CEO", "Director"],
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
    // Accessible to all roles - users should manage their own profile
  },
];

export const SidebarNavigation: React.FC = () => {
  const location = useLocation();
  const { hasRole, hasPermission } = usePermissions();

  const filteredNavigationItems = navigationItems.filter((item) => {
    // Check roles if specified
    if (item.roles && !hasRole(item.roles)) {
      return false;
    }

    // Check permissions if specified
    if (item.permissions && !hasPermission(item.permissions)) {
      return false;
    }

    return true;
  });

  return (
    <nav className="flex flex-col space-y-1">
      {filteredNavigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;

        // If item has children, render as parent
        if (item.children) {
          return (
            <div key={item.label} className="space-y-1">
              <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                {item.label}
              </div>
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                const isChildActive = location.pathname === child.href;

                return (
                  <Link
                    key={child.href}
                    to={child.href!}
                    className={`
                      group flex items-center px-6 py-2 text-sm font-medium rounded-lg transition-colors
                      ${
                        isChildActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }
                    `}
                  >
                    <ChildIcon
                      className={`
                        mr-3 h-4 w-4 flex-shrink-0 transition-colors
                        ${
                          isChildActive
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }
                      `}
                    />
                    <span className="flex-1">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        }

        // Regular navigation item
        return (
          <Link
            key={item.href}
            to={item.href!}
            className={`
              group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
              ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }
            `}
          >
            <Icon
              className={`
                mr-3 h-5 w-5 flex-shrink-0 transition-colors
                ${
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                }
              `}
            />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};
