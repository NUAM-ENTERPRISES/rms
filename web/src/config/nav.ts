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
  UserSquare2,
} from "lucide-react";
import { LEGACY_CLIENT_COORDINATOR_ROLE_NAME, ROLE_NAMES } from "@/config/role-names";

export interface NavItem {
  id: string;
  label: string;
  path?: string;
  icon?: LucideIcon;
  roles?: string[];
  hiddenForRoles?: string[];
  permissions?: string[];
  featureFlag?: string;
  /** Regex patterns (tested against pathname) that also mark this item/group active */
  activePathPatterns?: string[];
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  children?: NavItem[];
  disabled?: boolean;
}

export const navigationConfig: NavItem[] = [
  {
    id: "project-coordinator-dashboard",
    label: "Dashboard",
    path: "/project-coordinator/dashboard",
    icon: Home,
    roles: [ROLE_NAMES.PROJECT_COORDINATOR],
  },
  {
    id: "admin-dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: Home,
    roles: ["CEO", "Director", "Manager", "Recruiter Manager"],
    // Admin CRM Dashboard for leadership roles
  },
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/",
    icon: Home,
    roles: [ROLE_NAMES.OPERATIONS, "CRE"],
    // Only visible to Operations users
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
    id: "agent-coordinator-dashboard",
    label: "Dashboard",
    path: "/agents",
    icon: Home,
    roles: [ROLE_NAMES.AGENT_COORDINATOR, LEGACY_CLIENT_COORDINATOR_ROLE_NAME],
    permissions: ["read:agents"],
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
    disabled: true, // temporary hide for Interview Coordinator panel as requested
  },
  {
    id: "projects",
    label: "Projects",
    icon: Building2,
    roles: [
      "CEO",
      "Director",
      "Manager",
      "Recruiter Manager",
      "Recruiter",
      "Documentation Executive",
      "Processing Executive",
      "System Admin",
      "Interview Coordinator",
      ROLE_NAMES.PROJECT_COORDINATOR,
      ROLE_NAMES.AGENT_COORDINATOR,
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
      {
        id: "recruiter-docs",
        label: "Documentation",
        path: "/recruiter-docs",
        roles: ["Recruiter", "System Admin", ROLE_NAMES.AGENT_COORDINATOR],
      },
    ],
  },
  {
    id: "follow-up",
    label: "Follow Up",
    path: "/candidates",
    icon: UserCheck,
    roles: ["Recruiter"],
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
      ROLE_NAMES.OPERATIONS,
      "CRE",
      // "Screening Trainer",
    ],
    hiddenForRoles: [
      ROLE_NAMES.AGENT_COORDINATOR,
      LEGACY_CLIENT_COORDINATOR_ROLE_NAME,
      ROLE_NAMES.PROJECT_COORDINATOR,
      "Documentation Executive",
      "Recruiter",
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
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    path: "/analytics/recruiter",
    icon: BarChart3,
    roles: ["CEO", "Director", "Manager", "Recruiter Manager"],
    children: [
      {
        id: "recruiter-analytics",
        label: "Recruiter Analytics",
        path: "/analytics/recruiter",
        roles: ["CEO", "Director", "Manager", "Recruiter Manager"],
      },
    ],
  },
  {
    id: "clients",
    label: "Clients",
    path: "/clients",
    icon: Briefcase,
    permissions: ["read:clients"],
    // Hidden from Recruiter, Documentation Executive, and Operations roles
  },
  {
    id: "agents",
    label: "Agents",
    path: "/agents",
    icon: UserSquare2,
    permissions: ["read:agents"],
    // Agent Coordinator uses Dashboard → /agents; avoid duplicate sidebar label
    hiddenForRoles: [ROLE_NAMES.AGENT_COORDINATOR, LEGACY_CLIENT_COORDINATOR_ROLE_NAME],
  },
  {
    id: "teams",
    label: "Teams",
    path: "/teams",
    icon: Users,
    permissions: ["read:teams"],
    // Hidden from Operations - they work independently
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
      // {
      //   id: "interviews-list",
      //   label: "My Interviews",
      //   path: "/interviews/list",
      //   permissions: ["read:interviews"],
      // },
    ],
    // Hidden from Operations - they focus on RNR candidates
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
  /* {
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
  }, */
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
    activePathPatterns: [
      "^/screenings$",
      "^/screenings/(?!list|assigned|upcoming|templates|training)[^/]+",
      "^/screening-coordination/training",
    ],
    hiddenForRoles: [
      "Screening Trainer",
      "Documentation Executive",
      "Interview Coordinator",
      "Recruiter",
      ROLE_NAMES.OPERATIONS,
      "CRE",
      "Processing Executive",
      ROLE_NAMES.AGENT_COORDINATOR,
    ],
    children: [
      {
        id: "screenings-dashboard",
        label: "Dashboard",
        path: "/screenings",
        permissions: ["read:screenings"],
      },
      // {
      //   id: "screenings-list",
      //   label: "My Screenings",
      //   path: "/screenings/list",
      //   permissions: ["read:screenings"],
      // },
      // {
      //   id: "screenings-training",
      //   label: "Screening Training",
      //   path: "/screenings/training",
      //   permissions: ["read:training"],
      // },
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
    activePathPatterns: [
      "^/documents/",
      "^/candidates/[^/]+/documents/",
    ],
    hiddenForRoles: [
      "Interview Coordinator",
      "Recruiter",
      ROLE_NAMES.OPERATIONS,
      "CRE",
      "Documentation Executive",
      "Processing Executive",
      ROLE_NAMES.AGENT_COORDINATOR,
    ],
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
    hiddenForRoles: ["Recruiter Manager"],
    roles: ["CEO", "Director", "Manager", "System Admin", "Processing Manager", "Admin"],
    activePathPatterns: [
      "^/processing-admin",
      "^/processingCandidateDetails/",
      "^/ready-for-processing",
    ],
    children: [

      {
        id: "processing-admin-dashboard",
        label: "Dashboard",
        path: "/processing-admin",
        roles: ["CEO", "Director", "Manager", "System Admin", "Processing Manager", "Admin"],
      },

      {
        id: "ready-for-processing",
        label: "Ready for Processing",
        path: "/ready-for-processing",
        roles: ["CEO", "Director", "Manager", "System Admin", "Processing Manager", "Admin"],
      },

    ]
  },
  {
    id: "admin",
    label: "Administration",
    icon: Shield,
    roles: ["CEO", "Director", "Manager", "Recruiter Manager", "System Admin"],
    children: [
      {
        id: "admin-users",
        label: "Users",
        path: "/admin/users",
        permissions: ["read:users"],
        roles: ["CEO", "Director", "Manager", "Recruiter Manager", "System Admin"],
      },
      {
        id: "admin-sessions",
        label: "Session Monitoring",
        path: "/admin/sessions",
        permissions: ["read:users"],
        roles: ["CEO", "Director", "Manager", "Recruiter Manager", "System Admin"],
      },
      {
        id: "admin-system-settings",
        label: "System Settings",
        path: "/admin/system-settings",
        // icon: Settings,
        permissions: ["read:system_config"],
        roles: ["CEO", "Director", "Manager", "Recruiter Manager", "System Admin"],
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