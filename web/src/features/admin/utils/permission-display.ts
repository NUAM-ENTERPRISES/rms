import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Cog,
  Eye,
  FileText,
  Headphones,
  PenLine,
  Settings,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";

export type PermissionActionTier = "global" | "manage" | "edit" | "view" | "other";

export interface PermissionDisplayEntry {
  label: string;
  description?: string;
}

export const PERMISSION_DISPLAY: Record<string, PermissionDisplayEntry> = {
  "*": {
    label: "Full System Access",
    description: "Complete access to all features in the system",
  },
  "read:all": {
    label: "View Everything",
    description: "Can view all data across the application",
  },
  "write:all": {
    label: "Edit Everything",
    description: "Can create and update data across the application",
  },
  "manage:all": {
    label: "Manage Everything",
    description: "Full control over all data and settings",
  },
  "read:users": {
    label: "View Users",
    description: "Browse the user directory and view user profiles",
  },
  "write:users": {
    label: "Edit Users",
    description: "Update user profile details and assignments",
  },
  "manage:users": {
    label: "Manage Users",
    description: "Create, edit, delete users and manage accounts",
  },
  "read:teams": {
    label: "View Teams",
    description: "View team structure and membership",
  },
  "write:teams": {
    label: "Edit Teams",
    description: "Update team details and assignments",
  },
  "manage:teams": {
    label: "Manage Teams",
    description: "Create, edit, and delete teams",
  },
  "read:assigned_teams": {
    label: "View Assigned Teams",
    description: "View teams assigned to the current user",
  },
  "write:assigned_teams": {
    label: "Edit Assigned Teams",
    description: "Update teams the user is assigned to",
  },
  "read:projects": {
    label: "View Projects",
    description: "Browse projects and project details",
  },
  "write:projects": {
    label: "Edit Projects",
    description: "Update project information and settings",
  },
  "manage:projects": {
    label: "Manage Projects",
    description: "Create, edit, and delete projects",
  },
  "read:assigned_projects": {
    label: "View Assigned Projects",
    description: "View projects assigned to the user",
  },
  "write:assigned_projects": {
    label: "Edit Assigned Projects",
    description: "Update assigned project details",
  },
  "read:candidates": {
    label: "View Candidates",
    description: "Browse candidates and view candidate profiles",
  },
  "write:candidates": {
    label: "Edit Candidates",
    description: "Update candidate records and details",
  },
  "manage:candidates": {
    label: "Manage Candidates",
    description: "Full candidate lifecycle management",
  },
  "read:assigned_candidates": {
    label: "View Assigned Candidates",
    description: "View candidates assigned to the user",
  },
  "write:assigned_candidates": {
    label: "Edit Assigned Candidates",
    description: "Update assigned candidate records",
  },
  "nominate:candidates": {
    label: "Nominate Candidates",
    description: "Nominate candidates for projects or roles",
  },
  "approve:candidates": {
    label: "Approve Candidates",
    description: "Approve candidate status or workflow steps",
  },
  "reject:candidates": {
    label: "Reject Candidates",
    description: "Reject candidates in workflow steps",
  },
  "shortlist:candidates": {
    label: "Shortlist Candidates",
    description: "Add candidates to shortlists for projects",
  },
  "transfer:candidates": {
    label: "Transfer Candidates",
    description: "Transfer candidates between recruiters or teams",
  },
  "transfer_back:candidates": {
    label: "Transfer Candidates Back",
    description: "Return transferred candidates to the previous owner",
  },
  "read:documents": {
    label: "View Documents",
    description: "View candidate and process documents",
  },
  "write:documents": {
    label: "Upload Documents",
    description: "Upload and update documents",
  },
  "verify:documents": {
    label: "Verify Documents",
    description: "Verify submitted documents for compliance",
  },
  "manage:documents": {
    label: "Manage Documents",
    description: "Full document management including verification workflows",
  },
  "request:resubmission": {
    label: "Request Resubmission",
    description: "Request candidates to resubmit documents",
  },
  "read:original_document_intake": {
    label: "View Original Document Intake",
    description: "View original document intake register and collections",
  },
  "write:original_document_intake": {
    label: "Manage Original Document Intake",
    description: "Create and manage original document intake collections",
  },
  "read:courier_management": {
    label: "View Courier Management",
    description: "View courier management register and legs",
  },
  "write:courier_management": {
    label: "Manage Courier Management",
    description: "Create and manage courier legs",
  },
  "read:processing": {
    label: "View Processing",
    description: "View processing workflow and steps",
  },
  "write:processing": {
    label: "Edit Processing",
    description: "Update processing steps and records",
  },
  "manage:processing": {
    label: "Manage Processing",
    description: "Full control over processing workflows",
  },
  "transfer:processing": {
    label: "Transfer to Processing",
    description: "Move candidates into processing workflow",
  },
  "read:recruiters": {
    label: "View Recruiters",
    description: "View recruiter profiles and performance data",
  },
  "write:recruiters": {
    label: "Edit Recruiters",
    description: "Update recruiter records and assignments",
  },
  "manage:recruiters": {
    label: "Manage Recruiters",
    description: "Manage recruiter accounts and assignments",
  },
  "read:cre": {
    label: "View Operations",
    description: "View operations (CRE) workflows and data",
  },
  "write:cre": {
    label: "Edit Operations",
    description: "Update operations records and follow-ups",
  },
  "manage:cre": {
    label: "Manage Operations",
    description: "Manage operations team workflows",
  },
  "assign:cre": {
    label: "Assign Operations",
    description: "Assign operations handlers to candidates",
  },
  "handle:rnr_candidates": {
    label: "Handle RNR Candidates",
    description: "Work right-to-represent (RNR) candidate cases",
  },
  "read:operations_call_history": {
    label: "View Operations Call History",
    description: "View call history for operations follow-ups",
  },
  "read:roles": {
    label: "View Roles",
    description: "View roles and their permission assignments",
  },
  "write:roles": {
    label: "Edit Roles",
    description: "Update custom role details",
  },
  "manage:roles": {
    label: "Manage Roles",
    description: "Create, edit, and delete custom roles",
  },
  "read:agents": {
    label: "View Agents",
    description: "View agent profiles and details",
  },
  "write:agents": {
    label: "Create Agents",
    description: "Create new agent records",
  },
  "edit:agents": {
    label: "Edit Agents",
    description: "Update existing agent records",
  },
  "delete:agents": {
    label: "Delete Agents",
    description: "Remove agent records from the system",
  },
  "read:clients": {
    label: "View Clients",
    description: "View client organizations and contacts",
  },
  "write:clients": {
    label: "Edit Clients",
    description: "Update client records and relationships",
  },
  "manage:clients": {
    label: "Manage Clients",
    description: "Create, edit, and delete clients",
  },
  "read:interviews": {
    label: "View Interviews",
    description: "View interview schedules and outcomes",
  },
  "write:interviews": {
    label: "Edit Interviews",
    description: "Update interview records",
  },
  "manage:interviews": {
    label: "Manage Interviews",
    description: "Full interview workflow management",
  },
  "schedule:interviews": {
    label: "Schedule Interviews",
    description: "Schedule and reschedule interviews",
  },
  "read:screenings": {
    label: "View Screenings",
    description: "View screening sessions and coordination data",
  },
  "write:screenings": {
    label: "Edit Screenings",
    description: "Update screening sessions and coordination",
  },
  "manage:screenings": {
    label: "Manage Screenings",
    description: "Manage screening coordination workflows",
  },
  "conduct:screenings": {
    label: "Conduct Screenings",
    description: "Run and complete screening sessions",
  },
  "read:interview_templates": {
    label: "View Interview Templates",
    description: "View screening interview templates",
  },
  "write:interview_templates": {
    label: "Edit Interview Templates",
    description: "Create and update interview templates",
  },
  "manage:interview_templates": {
    label: "Manage Interview Templates",
    description: "Full control over interview templates",
  },
  "read:training": {
    label: "View Training",
    description: "View training sessions and schedules",
  },
  "write:training": {
    label: "Edit Training",
    description: "Update training sessions and content",
  },
  "manage:training": {
    label: "Manage Training",
    description: "Manage training programs and sessions",
  },
  "assign:training": {
    label: "Assign Training",
    description: "Assign training sessions to users or candidates",
  },
  "read:analytics": {
    label: "View Analytics",
    description: "View reports and analytics dashboards",
  },
  "write:analytics": {
    label: "Edit Analytics",
    description: "Configure analytics views and exports",
  },
  "manage:analytics": {
    label: "Manage Analytics",
    description: "Full analytics configuration access",
  },
  "read:settings": {
    label: "View Settings",
    description: "View application settings",
  },
  "write:settings": {
    label: "Edit Settings",
    description: "Update application settings",
  },
  "manage:settings": {
    label: "Manage Settings",
    description: "Full settings administration",
  },
  "read:admin-dashboard": {
    label: "View Admin Dashboard",
    description: "Access the administration dashboard",
  },
  "read:country_coverage": {
    label: "View Country Coverage",
    description: "Browse countries and see which users cover them",
  },
  "read:system_config": {
    label: "View System Config",
    description: "View system configuration (RNR, HRD, etc.)",
  },
  "manage:system_config": {
    label: "Manage System Config",
    description: "Update system configuration settings",
  },
  "manage:office_addresses": {
    label: "Manage Office Addresses",
    description: "Manage office address presets for courier and documents",
  },
  "read:qualifications": {
    label: "View Qualifications",
    description:
      "View the educational qualification catalog including inactive entries",
  },
  "manage:qualifications": {
    label: "Manage Qualifications",
    description: "Create, update, and deactivate qualifications and aliases",
  },
  "read:audit": {
    label: "View Audit Logs",
    description: "View system audit and activity logs",
  },
  "write:audit": {
    label: "Write Audit Logs",
    description: "Create audit log entries",
  },
  "manage:audit": {
    label: "Manage Audit Logs",
    description: "Manage audit log configuration and retention",
  },
};

export const PERMISSION_CATEGORIES: Record<
  string,
  { label: string; icon: LucideIcon; patterns: string[] }
> = {
  global: {
    label: "Global Access",
    icon: Shield,
    patterns: ["*", "read:all", "write:all", "manage:all"],
  },
  users: { label: "Users", icon: Users, patterns: ["users"] },
  teams: {
    label: "Teams",
    icon: Users,
    patterns: ["teams", "assigned_teams"],
  },
  projects: {
    label: "Projects",
    icon: Briefcase,
    patterns: ["projects", "assigned_projects"],
  },
  candidates: {
    label: "Candidates",
    icon: UserCheck,
    patterns: ["candidates", "assigned_candidates"],
  },
  documents: {
    label: "Documents",
    icon: FileText,
    patterns: [
      "documents",
      "resubmission",
      "original_document_intake",
      "courier_management",
    ],
  },
  processing: {
    label: "Processing",
    icon: ClipboardCheck,
    patterns: ["processing"],
  },
  interviews: {
    label: "Interviews",
    icon: Headphones,
    patterns: ["interviews", "screenings", "interview_templates"],
  },
  training: {
    label: "Training",
    icon: ClipboardCheck,
    patterns: ["training"],
  },
  recruiters: {
    label: "Recruiters",
    icon: UserCheck,
    patterns: ["recruiters"],
  },
  cre: {
    label: "Operations",
    icon: Headphones,
    patterns: ["cre", "operations", "rnr_candidates"],
  },
  roles: { label: "Roles", icon: Shield, patterns: ["roles"] },
  agents: { label: "Agents", icon: Briefcase, patterns: ["agents"] },
  clients: { label: "Clients", icon: Briefcase, patterns: ["clients"] },
  analytics: {
    label: "Analytics",
    icon: BarChart3,
    patterns: ["analytics"],
  },
  settings: {
    label: "Settings & Config",
    icon: Cog,
    patterns: [
      "settings",
      "system_config",
      "admin-dashboard",
      "office_addresses",
      "country_coverage",
      "qualifications",
    ],
  },
  audit: { label: "Audit", icon: Eye, patterns: ["audit"] },
};

const EDIT_ACTION_PREFIXES = [
  "write:",
  "nominate:",
  "approve:",
  "reject:",
  "schedule:",
  "verify:",
  "assign:",
  "transfer:",
  "transfer_back:",
  "handle:",
  "request:",
  "conduct:",
  "edit:",
  "delete:",
  "shortlist:",
];

export function humanizePermissionKey(key: string): string {
  return key.replace(/[_:]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function isGenericPermissionDescription(
  key: string,
  description?: string | null,
): boolean {
  if (!description?.trim()) return true;
  const normalized = description.trim().toLowerCase();
  const legacy = `permission to ${key.replace(":", " ")}`.toLowerCase();
  return normalized === legacy;
}

export function getPermissionLabel(key: string): string {
  return PERMISSION_DISPLAY[key]?.label ?? humanizePermissionKey(key);
}

export function getPermissionDescription(
  key: string,
  apiDescription?: string | null,
): string | undefined {
  const catalog = PERMISSION_DISPLAY[key]?.description;
  if (apiDescription?.trim() && !isGenericPermissionDescription(key, apiDescription)) {
    return apiDescription.trim();
  }
  if (catalog) return catalog;
  if (apiDescription?.trim()) return apiDescription.trim();
  return undefined;
}

export function getPermissionActionTier(key: string): PermissionActionTier {
  if (key === "*" || key === "manage:all") return "global";
  if (key.startsWith("manage:")) return "manage";
  if (
    key.startsWith("write:") ||
    EDIT_ACTION_PREFIXES.some(
      (prefix) => prefix !== "write:" && key.startsWith(prefix),
    )
  ) {
    return "edit";
  }
  if (key.startsWith("read:")) return "view";
  return "other";
}

export function getPermissionBadgeClassName(key: string): string {
  const tier = getPermissionActionTier(key);
  switch (tier) {
    case "global":
      return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300";
    case "manage":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300";
    case "edit":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
    case "view":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300";
    default:
      return "border-border bg-muted text-foreground";
  }
}

export function getPermissionIcon(key: string): LucideIcon {
  const tier = getPermissionActionTier(key);
  if (tier === "view") return Eye;
  if (tier === "edit") return PenLine;
  if (tier === "manage" || tier === "global") return Settings;
  return CheckCircle2;
}

export function groupPermissionKeys(permissions: string[]) {
  const grouped: Record<string, string[]> = {};

  for (const perm of permissions) {
    let placed = false;
    for (const [catKey, cat] of Object.entries(PERMISSION_CATEGORIES)) {
      if (
        cat.patterns.some((pattern) => perm === pattern || perm.includes(pattern))
      ) {
        if (!grouped[catKey]) grouped[catKey] = [];
        grouped[catKey].push(perm);
        placed = true;
        break;
      }
    }
    if (!placed) {
      if (!grouped.other) grouped.other = [];
      grouped.other.push(perm);
    }
  }

  return grouped;
}

export function groupCatalogPermissionsByResource(
  permissions: Array<{ key: string }>,
) {
  const groups = new Map<string, Array<{ key: string }>>();

  for (const permission of permissions) {
    if (permission.key === "*") continue;
    const resource = permission.key.includes(":")
      ? permission.key.split(":")[1] || "other"
      : "other";
    const label = resource.replace(/_/g, " ");
    const existing = groups.get(label) ?? [];
    existing.push(permission);
    groups.set(label, existing);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, items]) => ({
      label,
      items: items.sort((a, b) => a.key.localeCompare(b.key)),
    }));
}

export function groupPermissionKeysByResource(keys: string[]) {
  return groupCatalogPermissionsByResource(keys.map((key) => ({ key }))).map(
    (group) => ({
      label: group.label,
      items: group.items.map((item) => item.key),
    }),
  );
}
