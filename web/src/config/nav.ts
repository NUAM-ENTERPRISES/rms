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
    id: "interviews",
    label: "Interviews",
    path: "/interviews",
    icon: Calendar,
    roles: [
      "CEO",
      "Director",
      "Manager",
      "Recruiter",
      "Documentation Executive",
      "Interview Coordinator",
      "System Admin",
    ],
    children: [
      {
        id: "interviews-dashboard",
        label: "Dashboard",
        path: "/interviews",
        roles: [
          "CEO",
          "Director",
          "Manager",
          "Recruiter",
          "Documentation Executive",
          "Interview Coordinator",
          "System Admin",
        ],
      },
      {
        id: "interviews-list",
        label: "My Interviews",
        path: "/interviews/list",
        roles: [
          "CEO",
          "Director",
          "Manager",
          "Recruiter",
          "Documentation Executive",
          "Interview Coordinator",
          "System Admin",
        ],
      },
      // Assigned and Upcoming are intentionally omitted from the sidebar
    ],
    // Hidden from CRE - they focus on RNR candidates
  },
  {
    id: "mock-interviews",
    label: "Mock Interviews",
    icon: ClipboardCheck,
    permissions: ["read:mock_interviews"],
    children: [
      {
        id: "mock-interviews-dashboard",
        label: "Dashboard",
        path: "/mock-interviews",
        permissions: ["read:mock_interviews"],
      },
      {
        id: "mock-interviews-list",
        label: "My Interviews",
        path: "/mock-interviews/list",
        permissions: ["read:mock_interviews"],
      },
      {
        id: "mock-interviews-training",
        label: "Training",
        path: "/mock-interviews/training",
        permissions: ["read:training"],
      },
      {
        id: "mock-interviews-templates",
        label: "Templates",
        path: "/mock-interviews/templates",
        permissions: ["read:interview_templates"],
      },
      {
        id: "mock-interviews-screening",
        label: "Screening",
        path: "/mock-interviews/screening",
        permissions: ["read:mock_interviews"],
      },
    ],
  },
  {
    id: "documents",
    label: "Documentation",
    path: "/documents/verification",
    icon: FileText,
    permissions: ["read:documents"],
    hiddenForRoles: ["Interview Coordinator"],
  },
  {
    id: "processing",
    label: "In Processing",
    path: "/processing/candidates",
    icon: BookOpen,
    permissions: ["read:processing"],
    roles: ["Processing Executive"],
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
