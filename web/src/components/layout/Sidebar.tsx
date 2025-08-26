import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserCheck,
  FileText,
  Calendar,
  Settings,
  BarChart3,
  ClipboardList,
  Building,
} from "lucide-react";

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  permissions?: string[];
  roles?: string[];
}

const navigationItems: NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Users",
    to: "/users",
    icon: <Users className="h-4 w-4" />,
    permissions: ["read:users", "manage:users"],
  },
  {
    label: "Teams",
    to: "/teams",
    icon: <Building className="h-4 w-4" />,
    permissions: ["read:teams", "manage:teams"],
  },
  {
    label: "Clients",
    to: "/clients",
    icon: <Briefcase className="h-4 w-4" />,
    permissions: ["read:clients", "manage:clients"],
  },
  {
    label: "Projects",
    to: "/projects",
    icon: <ClipboardList className="h-4 w-4" />,
    permissions: ["read:projects", "manage:projects"],
  },
  {
    label: "Candidates",
    to: "/candidates",
    icon: <UserCheck className="h-4 w-4" />,
    permissions: ["read:candidates", "manage:candidates"],
  },
  {
    label: "Documents",
    to: "/documents",
    icon: <FileText className="h-4 w-4" />,
    permissions: ["read:documents", "verify:documents"],
  },
  {
    label: "Interviews",
    to: "/interviews",
    icon: <Calendar className="h-4 w-4" />,
    permissions: ["read:interviews", "manage:interviews"],
  },
  {
    label: "Processing",
    to: "/processing",
    icon: <BarChart3 className="h-4 w-4" />,
    permissions: ["read:processing", "manage:processing"],
  },
  {
    label: "Settings",
    to: "/settings",
    icon: <Settings className="h-4 w-4" />,
    permissions: ["manage:all"],
    roles: ["CEO", "Director"],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAppSelector((state: RootState) => state.auth);

  const filteredItems = navigationItems.filter((item) => {
    // If no permissions/roles required, show to everyone
    if (!item.permissions && !item.roles) {
      return true;
    }

    // Check permissions
    if (item.permissions) {
      const userPermissions = new Set(user?.permissions || []);
      if (userPermissions.has("*")) return true; // Wildcard permission

      const hasPermission = item.permissions.some((permission) =>
        userPermissions.has(permission)
      );
      if (!hasPermission) return false;
    }

    // Check roles (if specified)
    if (item.roles) {
      const userRoles = user?.roles || [];
      const hasRole = item.roles.some((role) => userRoles.includes(role));
      if (!hasRole) return false;
    }

    return true;
  });

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <h1 className="text-lg font-semibold text-sidebar-foreground">
          Affiniks RMS
        </h1>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
