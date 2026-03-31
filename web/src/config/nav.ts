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
  BarChart3,
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
    id: "documentation-dashboard",
    label: "Dashboard",
    path: "/documents/verification",
    icon: FileText,
    roles: ["Documentation Executive"],
    permissions: ["read:documents"],
    // Documentation Executives should see this as their first dashboard item
  },
  {
    id: "processing-dashboard",
    label: "Dashboard",
    path: "/",
    icon: Home,
    roles: ["Processing Executive"],
    // Dedicated dashboard for Processing Executives
  },
  {
    id: "recruiter-dashboard",
    label: "Dashboard",
    path: "/",
    icon: Home,
    roles: ["Recruiter", "Team Head", "Team Lead"],
    // Recruiter Dashboard - points to Candidate Overview
  },
  {
    id: "interviews-dashboard-top",
    label: "Dashboard",
    path: "/interviews",
    icon: Home,
    roles: ["Interview Coordinator"],
    permissions: ["read:interviews"],
  },
  {
    id: "interviews-list-top",
    label: "My Interviews",
    path: "/interviews/list",
    icon: Calendar,
    roles: ["Interview Coordinator"],
    permissions: ["read:interviews"],
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
      // "Screening Trainer",
    ],
    children: [
      {
        id: "candidate-overview",
        label: "Overview",
        path: "/candidates/overview",
        hiddenForRoles: ["Recruiter", "Team Head", "Team Lead"],
      },
      {
        id: "candidates-list",
        label: "My Follow Up",
        path: "/candidates",
      },
      {
        id: "recruiter-docs",
        label: "Documents Collection",
        path: "/recruiter-docs",
        roles: ["Recruiter", "System Admin"],
      },
    ],
  },
  {
    id: "candidate-analytics",
    label: "Analytics",
    path: "/analytics/candidates",
    icon: BarChart3,
    roles: ["CEO", "Director", "Manager"],
    badge: {
      text: "Insights",
      variant: "default",
    },
    children: [
      {
        id: "candidate-analytics-overview",
        label: "Recruiter Analytics",
        path: "/analytics/candidates",
        icon: Users,
        roles: ["CEO", "Director", "Manager"],
      },
      {
        id: "candidate-analytics-time",
        label: "Documents Analytics",
        path: "/analytics/candidates/time",
        icon: FileText,
        roles: ["CEO", "Director", "Manager"],
      },
      {
        id: "candidate-analytics-funnel",
        label: "Interview Analytics",
        path: "/analytics/candidates/funnel",
        icon: BarChart3,
        roles: ["CEO", "Director", "Manager"],
      },
      //   {
      //   id: "candidate-analytics-time",
      //   label: "Screening Analytics",
      //   path: "/analytics/candidates/screening",
      //   icon: Clock,
      //   roles: ["CEO", "Director", "Manager"],
      // },

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
  // {
  //   id: "basic-training",
  //   label: "Basic Training",
  //   path: "/basic-training",
  //   icon: BookOpen,
  //   permissions: ["read:training"],
  //   hiddenForRoles: ["Screening Trainer", "Interview Coordinator"],
  // },
  {
    id: "interviews",
    label: "Interviews",
    path: "/interviews",
    icon: Calendar,
    permissions: ["read:interviews"],
    hiddenForRoles: ["Documentation Executive", "Interview Coordinator", "Processing Executive"],
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
    ],
    // Hidden from CRE - they focus on RNR candidates
  },
  // Screening Trainer role: flatten screenings children to top-level items
  {
    id: "screenings-dashboard-top",
    label: "Dashboard",
    path: "/screenings",
    icon: ClipboardCheck,
    roles: ["Screening Trainer"],
    permissions: ["read:screenings"],
  },
  {
    id: "screenings-list-top",
    label: "My Screenings",
    path: "/screenings/list",
    icon: ClipboardCheck,
    roles: ["Screening Trainer"],
    permissions: ["read:screenings"],
  },
  {
    id: "screenings-training-top",
    label: "Screening Training",
    path: "/screenings/training",
    icon: ClipboardCheck,
    roles: ["Screening Trainer"],
    permissions: ["read:training"],
  },
  {
    id: "screenings-templates-top",
    label: "Templates",
    path: "/screenings/templates",
    icon: ClipboardCheck,
    roles: ["Screening Trainer"],
    permissions: ["read:interview_templates"],
  },
  {
    id: "screenings",
    label: "Screenings",
    icon: ClipboardCheck,
    permissions: ["read:screenings"],
    hiddenForRoles: ["Screening Trainer", "Documentation Executive"],
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
    label: "Documents",
    icon: FileText,
    permissions: ["read:documents"],
    hiddenForRoles: ["Interview Coordinator", "Recruiter", "CRE", "Documentation Executive", "Processing Executive"],
    children: [
      {
        id: "document-verification",
        label: "Document Verification",
        path: "/documents/verification",
        permissions: ["read:documents"],
      }
    ],
  },
  {
    id: "processing",
    label: "Processing",
    icon: ClipboardCheck,
    roles: ["CEO", "Director", "Manager", "System Admin"],
    children: [

      {
        id: "processing-admin-dashboard",
        label: "Dashboard",
        path: "/processing-admin",
        roles: ["CEO", "Director", "Manager", "System Admin"],
      },

      {
        id: "ready-for-processing",
        label: "Ready for Processing",
        path: "/ready-for-processing",
        roles: ["CEO", "Director", "Manager", "System Admin"],
      },

    ]
  },
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
  {
    id: "projects",
    label: "Projects",
    icon: Building2,
    roles: [
      "CEO",
      "Director",
      "Manager",
      "Recruiter",
      "Documentation Executive",
      "Processing Executive",
      "System Admin",
      "Interview Coordinator",
      // "Screening Trainer",
    ],
    children: [
      {
        id: "projects-overview",
        label: "Overview",
        path: "/projects/overview",
      },
      {
        id: "projects-management",
        label: "Management",
        path: "/projects",
      },
    ],
  },
  {
    id: "profile",
    label: "Profile",
    path: "/profile",
    icon: User,
    // Accessible to all roles - users should manage their own profile
  },
];

export default navigationConfig;