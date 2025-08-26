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
} from "lucide-react";

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  permissions?: string[];
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    permissions: ["read:users", "manage:users"],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: Briefcase,
    permissions: ["read:projects", "manage:projects"],
  },
  {
    label: "Candidates",
    href: "/candidates",
    icon: UserCheck,
    permissions: ["read:candidates", "manage:candidates"],
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Building2,
    permissions: ["read:clients", "manage:clients"],
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    permissions: ["read:documents", "manage:documents"],
  },
  {
    label: "Interviews",
    href: "/interviews",
    icon: Calendar,
    permissions: ["read:interviews", "manage:interviews"],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    permissions: ["read:analytics"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["Manager", "CEO", "Director"],
  },
  {
    label: "System",
    href: "/system",
    icon: Cog,
    roles: ["CEO", "Director"],
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

        return (
          <Link
            key={item.href}
            to={item.href}
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
