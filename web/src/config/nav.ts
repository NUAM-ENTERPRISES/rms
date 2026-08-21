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
  Truck,
  Globe2,
  MessageCircle,
} from "lucide-react";
import { AGENT_COORDINATOR_ROLE_NAMES, OPERATIONS_ROLE_NAMES, ROLE_NAMES } from "@/config/role-names";

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
  /** When true with both roles and permissions set, access requires role OR permission (not both). */
  matchRolesOrPermissions?: boolean;
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
    roles: ["Managing Director", "Director", "Department Head", "Recruitment Team Lead"],
    // Admin CRM Dashboard for leadership roles
  },
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/",
    icon: Home,
    roles: [...OPERATIONS_ROLE_NAMES],
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
    id: "original-document-intake-main",
    label: "Original Document Intake",
    path: "/original-documents",
    icon: FileText,
    permissions: ["read:original_document_intake"],
    hiddenForRoles: [
      "Managing Director",
      "Director",
      "Department Head",
      "Admin",
      "Processing Team Lead",
    ],
  },
  {
    id: "courier-management-main",
    label: "Courier Management",
    path: "/courier-management",
    icon: Truck,
    permissions: ["read:courier_management"],
    hiddenForRoles: [
      "Managing Director",
      "Director",
      "Department Head",
      "Admin",
      "Processing Team Lead",
    ],
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
    roles: ["Recruitment Executive", "Team Head", "Team Lead"],
    // Recruiter Dashboard - points to Candidate Overview
  },
  {
    id: "agent-coordinator-dashboard",
    label: "Dashboard",
    path: "/agents",
    icon: Home,
    roles: [...AGENT_COORDINATOR_ROLE_NAMES],
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
      "Managing Director",
      "Director",
      "Department Head",
      "Recruitment Team Lead",
      "Recruitment Executive",
      "Documentation Executive",
      "Processing Executive",
      "Admin",
      ROLE_NAMES.PROJECT_COORDINATOR,
      ROLE_NAMES.AGENT_COORDINATOR,
      "Interview Coordinator",
      // "Screening & Training Executive",
    ],
    // hiddenForRoles: ["Interview Coordinator"],
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
        roles: ["Recruitment Executive", "Admin", ROLE_NAMES.AGENT_COORDINATOR],
      },
    ],
  },
  {
    id: "follow-up",
    label: "Follow Up",
    path: "/candidates",
    icon: UserCheck,
    roles: ["Recruitment Executive"],
  },
  {
    id: "candidates",
    label: "Candidates",
    path: "/candidates",
    icon: UserCheck,
    roles: [
      "Managing Director",
      "Director",
      "Department Head",
      "Team Head",
      "Team Lead",
      "Recruitment Executive",
      "Documentation Executive",
      "Admin",
      // "Screening & Training Executive",
    ],
    permissions: ["read:candidates"],
    matchRolesOrPermissions: true,
    hiddenForRoles: [
      ...AGENT_COORDINATOR_ROLE_NAMES,
      ROLE_NAMES.PROJECT_COORDINATOR,
      "Documentation Executive",
      "Recruitment Executive",
      "Document Control Executive",
      ...OPERATIONS_ROLE_NAMES,
      "Processing Executive",
      "Processing Team Lead",
      "Interview Coordinator",
      "Screening & Training Executive",
    ],
    children: [
      {
        id: "candidate-overview",
        label: "Overview",
        path: "/candidates/overview",
        hiddenForRoles: ["Recruitment Executive", "Team Head", "Team Lead"],
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
    roles: ["Managing Director", "Director", "Department Head", "Recruitment Team Lead"],
    children: [
      {
        id: "recruiter-analytics",
        label: "Recruiter Analytics",
        path: "/analytics/recruiter",
        roles: ["Managing Director", "Director", "Department Head", "Recruitment Team Lead"],
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
    hiddenForRoles: [...AGENT_COORDINATOR_ROLE_NAMES],
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
  //   hiddenForRoles: ["Screening & Training Executive", "Interview Coordinator"],
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
    roles: ["Screening & Training Executive"],
    permissions: ["read:screenings"],
  },
  /* {
    id: "screenings-list-top",
    label: "My Screenings",
    path: "/screenings/list",
    icon: ClipboardCheck,
    roles: ["Screening & Training Executive"],
    permissions: ["read:screenings"],
  },
  {
    id: "screenings-training-top",
    label: "Screening Training",
    path: "/screenings/training",
    icon: ClipboardCheck,
    roles: ["Screening & Training Executive"],
    permissions: ["read:training"],
  }, */
  {
    id: "screenings-templates-top",
    label: "Templates",
    path: "/screenings/templates",
    icon: ClipboardCheck,
    roles: ["Screening & Training Executive"],
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
      "Screening & Training Executive",
      "Documentation Executive",
      "Interview Coordinator",
      "Recruitment Executive",
      ...OPERATIONS_ROLE_NAMES,
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
    label: "Document Management",
    icon: FileText,
    permissions: ["read:documents"],
    activePathPatterns: [
      "^/documents/",
      "^/original-documents",
      "^/courier-management",
      "^/candidates/[^/]+/documents/",
    ],
    hiddenForRoles: [
      "Interview Coordinator",
      "Recruitment Executive",
      ...OPERATIONS_ROLE_NAMES,
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
      },
      {
        id: "original-document-intake",
        label: "Original Document Intake",
        path: "/original-documents",
        permissions: ["read:original_document_intake"],
        roles: ["Managing Director", "Director", "Department Head", "Processing Team Lead", "Admin"],
        matchRolesOrPermissions: true,
      },
      {
        id: "courier-management",
        label: "Courier Management",
        path: "/courier-management",
        permissions: ["read:courier_management"],
        roles: ["Managing Director", "Director", "Department Head", "Processing Team Lead", "Admin"],
        matchRolesOrPermissions: true,
      },
    ],
  },
  {
    id: "processing",
    label: "Processing",
    icon: ClipboardCheck,
    hiddenForRoles: ["Recruitment Team Lead"],
    roles: ["Managing Director", "Director", "Department Head", "Admin", "Processing Team Lead"],
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
        roles: ["Managing Director", "Director", "Department Head", "Admin", "Processing Team Lead"],
      },

      {
        id: "ready-for-processing",
        label: "Ready for Processing",
        path: "/ready-for-processing",
        roles: ["Managing Director", "Director", "Department Head", "Admin", "Processing Team Lead"],
      },

    ]
  },
  {
    id: "admin",
    label: "Administration",
    icon: Shield,
    roles: ["Managing Director", "Director", "Department Head", "Recruitment Team Lead", "Admin"],
    children: [
      {
        id: "admin-users",
        label: "Users",
        path: "/admin/users",
        permissions: ["read:users"],
        roles: ["Managing Director", "Director", "Department Head", "Recruitment Team Lead", "Admin"],
      },
      {
        id: "admin-roles",
        label: "Roles",
        path: "/admin/roles",
        icon: Shield,
        permissions: ["read:roles"],
        roles: ["Managing Director", "Director", "Department Head", "Recruitment Team Lead", "Admin"],
        activePathPatterns: ["^/admin/roles"],
      },
      {
        id: "admin-country-coverage",
        label: "Country Coverage",
        path: "/admin/country-coverage",
        icon: Globe2,
        permissions: ["read:country_coverage"],
        roles: ["Managing Director", "Director", "Department Head", "Recruitment Team Lead", "Admin"],
        activePathPatterns: ["^/admin/country-coverage"],
      },
      {
        id: "admin-sessions",
        label: "Session Monitoring",
        path: "/admin/sessions",
        permissions: ["read:users"],
        roles: ["Managing Director", "Director", "Department Head", "Recruitment Team Lead", "Admin"],
      },
      {
        id: "admin-system-settings",
        label: "System Settings",
        // icon: Settings,
        path: "/admin/system-settings",
        permissions: ["read:system_config"],
        roles: ["Managing Director", "Director", "Department Head", "Recruitment Team Lead", "Admin"],
      },
      {
        id: "admin-meta-history",
        label: "Meta History",
        path: "/admin/meta-history",
        icon: MessageCircle,
        permissions: ["read:system_config"],
        roles: ["Managing Director", "Director", "Department Head", "Recruitment Team Lead", "Admin"],
        activePathPatterns: ["^/admin/meta-history"],
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
