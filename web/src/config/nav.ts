import {
  LucideIcon,
  Home,
  Users,
  UserCheck,
  Building2,
  FileText,
  Shield,
  Calendar,
  // Bell removed - not currently used
  User,
  Briefcase,
  ClipboardCheck,
  BookOpen,
  Settings,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  path?: string;
  icon?: LucideIcon;
  roles?: string[];
  hiddenForRoles?: string[];
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
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/",
    icon: Home,
    roles: ["CRE"],
    // Only visible to CRE users
  },
  {
    id: "processing-dashboard",
    label: "Processing",
    path: "/",
    icon: Home,
    roles: ["Processing Executive"],
    // Dedicated dashboard for Processing Executives
  },
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
    roles: [
      "CEO",
      "Director",
      "Manager",
      "Recruiter",
      "Documentation Executive",
      "Processing Executive",
      "System Admin",
    ],
    // Hidden from CRE - they only manage candidates
  },
  {
    id: "candidates",
    label: "Candidates",
    path: "/candidates",
    icon: UserCheck,
    roles: [
      "CEO",
      "Director",
      "Manager",
      "Team Head",
      "Team Lead",
      "Recruiter",
      "Documentation Executive",
      "System Admin",
      "CRE",
    ],
  },
    {
    id: "recruiter-docs",
    label: "Recruiter Docs",
    path: "/recruiter-docs",
    icon: FileText,
    roles: ["Recruiter", "System Admin"],
  },
  {
    id: "clients",
    label: "Clients",
    path: "/clients",
    icon: Briefcase,
    permissions: ["read:clients"],
    // Hidden from Recruiter, Documentation Executive, and CRE roles
  },
  {
    id: "teams",
    label: "Teams",
    path: "/teams",
    icon: Users,
    permissions: ["read:teams"],
    // Hidden from CRE - they work independently
  },
  {
    id: "basic-training",
    label: "Basic Training",
    path: "/basic-training",
    icon: BookOpen,
    permissions: ["read:training"],
  },
  {
    id: "interviews",
    label: "Interviews",
    path: "/interviews",
    icon: Calendar,
    permissions: ["read:interviews"],
    children: [
      {
        id: "interviews-dashboard",
        label: "Dashboard",
        path: "/interviews",
        permissions: ["read:interviews"],
      },
      {
        id: "interviews-list",
        label: "My Interviews",
        path: "/interviews/list",
        permissions: ["read:interviews"],
      },
      // Assigned and Upcoming are intentionally omitted from the sidebar
    ],
    // Hidden from CRE - they focus on RNR candidates
  },
  {
    id: "screenings",
    label: "Screenings",
    icon: ClipboardCheck,
    permissions: ["read:screenings"],
    children: [
      {
        id: "screenings-dashboard",
        label: "Dashboard",
        path: "/screenings",
        permissions: ["read:screenings"],
      },
      {
        id: "screenings-list",
        label: "My Screenings",
        path: "/screenings/list",
        permissions: ["read:screenings"],
      },
      {
        id: "screenings-training",
        label: "Screening Training",
        path: "/screenings/training",
        permissions: ["read:training"],
      },
      {
        id: "screenings-templates",
        label: "Templates",
        path: "/screenings/templates",
        permissions: ["read:interview_templates"],
      },
      
    ],
  },
  {
    id: "documents",
    label: "Documentation",
    path: "/documents/verification",
    icon: FileText,
    permissions: ["read:documents"],
    hiddenForRoles: ["Interview Coordinator", "Recruiter"],
  },
  {
    id: "ready-for-processing",
    label: "Ready for Processing",
    path: "/ready-for-processing",
    icon: UserCheck,
    roles: ["CEO", "Director", "Manager", "System Admin"],
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
    children: [
      {
        id: "admin-users",
        label: "Users",
        path: "/admin/users",
        permissions: ["read:users"],
        roles: ["CEO", "Director", "Manager", "System Admin"],
      },
      {
        id: "admin-system-settings",
        label: "System Settings",
        path: "/admin/system-settings",
        // icon: Settings,
        permissions: ["read:system_config"],
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
    // Accessible to all roles - users should manage their own profile
  },
];

export default navigationConfig;
