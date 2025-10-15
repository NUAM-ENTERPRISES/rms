import {
  LucideIcon,
  Home,
  Users,
  UserCheck,
  Building2,
  FileText,
  Settings,
  BarChart3,
  Shield,
  Calendar,
  Bell,
  User,
  Briefcase,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  path?: string;
  icon?: LucideIcon;
  roles?: string[];
  permissions?: string[];
  featureFlag?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  children?: NavItem[];
  disabled?: boolean;
}

export const navigationConfig: NavItem[] = [
  // {
  //   id: "dashboard",
  //   label: "Dashboard",
  //   path: "/dashboard",
  //   icon: Home,
  //   roles: ["CEO", "Director", "Manager"],
  //   badge: {
  //     text: "Analytics",
  //     variant: "default",
  //   },
  // },
  {
    id: "projects",
    label: "Projects",
    path: "/projects",
    icon: Building2,
    badge: {
      text: "Core",
      variant: "secondary",
    },
    // Accessible to all roles - core business function
  },
  {
    id: "candidates",
    label: "Candidates",
    path: "/candidates",
    icon: UserCheck,
    // Accessible to all roles - core business function
    badge: {
      text: "HR",
      variant: "outline",
    },
  },
  {
    id: "clients",
    label: "Clients",
    path: "/clients",
    icon: Briefcase,
    permissions: ["read:clients"],
    badge: {
      text: "Business",
      variant: "outline",
    },
    // Hidden from Recruiter and Documentation Executive roles
  },
  {
    id: "teams",
    label: "Teams",
    path: "/teams",
    icon: Users,
    permissions: ["read:teams"],
    badge: {
      text: "Org",
      variant: "outline",
    },
  },
  {
    id: "interviews",
    label: "Interviews",
    path: "/interviews",
    icon: Calendar,
    // Accessible to all roles - core business function
    badge: {
      text: "Schedule",
      variant: "outline",
    },
  },
  {
    id: "documents",
    label: "Documentation",
    path: "/documents/verification",
    icon: FileText,
    permissions: ["read:documents"],
    badge: {
      text: "Verification",
      variant: "outline",
    },
  },
  // {
  //   id: "notifications",
  //   label: "Notifications",
  //   path: "/notifications",
  //   icon: Bell,
  //   badge: {
  //     text: "Updates",
  //     variant: "outline",
  //   },
  //   // Accessible to all roles - important for staying updated
  // },
  // {
  //   id: "analytics",
  //   label: "Analytics",
  //   path: "/analytics",
  //   icon: BarChart3,
  //   permissions: ["read:analytics"],
  //   badge: {
  //     text: "Insights",
  //     variant: "default",
  //   },
  // },
  {
    id: "admin",
    label: "Administration",
    icon: Shield,
    roles: ["CEO", "Director", "Manager", "System Admin"],
    badge: {
      text: "Admin",
      variant: "destructive",
    },
    children: [
      {
        id: "admin-users",
        label: "Users",
        path: "/admin/users",
        permissions: ["read:users"],
        roles: ["CEO", "Director", "Manager", "System Admin"],
      },
      {
        id: "admin-roles",
        label: "Roles & Permissions",
        path: "/admin/roles",
        permissions: ["read:roles"],
        roles: ["CEO", "Director", "Manager", "System Admin"],
      },
      {
        id: "admin-teams",
        label: "Team Management",
        path: "/admin/teams",
        permissions: ["read:teams"],
        roles: ["CEO", "Director", "Manager", "System Admin"],
      },
    ],
  },
  // {
  //   id: "settings",
  //   label: "Settings",
  //   path: "/settings",
  //   icon: Settings,
  //   permissions: ["read:settings"],
  //   roles: ["CEO", "Director", "Manager"],
  //   badge: {
  //     text: "Config",
  //     variant: "outline",
  //   },
  // },
  {
    id: "profile",
    label: "Profile",
    path: "/profile",
    icon: User,
    badge: {
      text: "Personal",
      variant: "outline",
    },
    // Accessible to all roles - users should manage their own profile
  },
];

export default navigationConfig;
