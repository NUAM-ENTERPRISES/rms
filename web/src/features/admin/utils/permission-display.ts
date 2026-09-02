import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  Headphones,
  LayoutDashboard,
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
  detail?: string;
}

export const PERMISSION_DISPLAY: Record<string, PermissionDisplayEntry> = {
  "*": {
    label: "Full System Access",
    description: "Complete access to all features in the system",
  },
  "read:all": {
    label: "See everything",
    description: "Open every screen and read every record in the system.",
    detail:
      "Use only for trusted people. They can open staff, candidates, jobs, documents, and reports. They still cannot change or delete items unless they also have change or full access.",
  },
  "write:all": {
    label: "Change everything",
    description: "Add or update records in every part of the system.",
    detail:
      "They can create and edit almost any record. This is powerful — give it only to senior staff who should work across the whole company.",
  },
  "manage:all": {
    label: "Full control of everything",
    description: "Add, change, delete, and set up every part of the system.",
    detail:
      "This is the same level of control as a system owner. They can change settings, roles, and data everywhere. Do not give this to day-to-day recruiters.",
  },
  "read:users": {
    label: "See staff accounts",
    description: "Open the staff directory and look at people’s profiles.",
    detail:
      "Shows the Users screen in Administration. They can search staff and open a profile, but they cannot create logins or change access unless you also tick those actions.",
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
    label: "Assigned to project",
    description:
      "Assign a candidate to a project from the project board or candidate profile.",
    detail:
      "Lets someone drag or nominate a candidate onto a project. Without it they can open projects and candidates but cannot assign anyone to a project.",
  },
  "send:verification": {
    label: "Send for Verification",
    description: "Send candidates for document verification",
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
    label: "Shortlist for a job",
    description: "Add candidates to a project shortlist.",
    detail:
      "Lets someone add people to a job’s shortlist on the project. Shown under Projects with other job-board actions.",
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
  "reject:documents": {
    label: "Reject Documents",
    description: "Reject submitted documents that do not meet requirements",
    detail:
      "Shows Reject on the document verification page. Separate from Verify — someone can be allowed to verify only, reject only, or both.",
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
    label: "Send for Ready Processing",
    description:
      "Mark passed interviews ready for processing, and move candidates into the processing workflow.",
    detail:
      "On Interviews, this shows Send for Processing for passed candidates. On Processing, it also allows transferring those candidates into a processing assignee queue.",
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
    label: "See operations follow-up",
    description:
      "Open operations work: follow-ups, cases, and status after documents.",
    detail:
      "This is the Operations area (sometimes called CRE). They can see who needs a call or follow-up. They cannot assign work or change records unless those actions are also ticked.",
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
    label: "Work right-to-represent cases",
    description:
      "Open and update candidates who still need right-to-represent (RNR) clearance.",
    detail:
      "RNR means the candidate has given permission to be represented. This is the operations queue for that clearance — not the main recruiter candidate list.",
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
    description: "Update interview records and outcomes.",
  },
  "manage:interviews": {
    label: "Manage Interviews",
    description: "Full interview workflow management",
  },
  "schedule:interviews": {
    label: "Schedule Interviews",
    description: "Schedule and reschedule interviews",
  },
  "upload:offer_letters": {
    label: "Upload Offer Letter",
    description:
      "Upload or re-upload signed offer letters for passed interviews.",
    detail:
      "Shows Upload / Re-upload on interview passed views and send-for-processing. Does not include requesting a recruiter to upload — that stays under Edit Interviews.",
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
    label: "View Screening Templates",
    description: "View screening templates",
  },
  "write:interview_templates": {
    label: "Edit Screening Templates",
    description: "Create and update screening templates",
  },
  "manage:interview_templates": {
    label: "Manage Screening Templates",
    description: "Full control over screening templates",
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
    label: "Open admin home",
    description: "See the Administration home page with company-wide summaries.",
    detail:
      "This is the admin landing page (tiles and shortcuts). It does not by itself let them edit roles, users, or settings — tick those separately.",
  },
  "read:admin_dashboard": {
    label: "Open admin home",
    description: "See the Administration home page with company-wide summaries.",
    detail:
      "This is the admin landing page (tiles and shortcuts). It does not by itself let them edit roles, users, or settings — tick those separately.",
  },
  "bulk_create:candidates": {
    label: "Add many candidates at once",
    description: "Create several candidate profiles from a list or resume files.",
    detail:
      "Shows the bulk-create tool. They can upload many resumes or a list and create candidate records without adding each person by hand.",
  },
  "update:candidates": {
    label: "Update candidate details",
    description: "Change information on existing candidate profiles.",
    detail:
      "Lets them edit contact details, experience, and other profile fields. It does not let them delete candidates or put them on a job unless those actions are also ticked.",
  },
  "write:candidates_bulk_resume": {
    label: "Create candidates from resumes",
    description: "Turn uploaded resume files into new candidate profiles.",
    detail:
      "Opens resume bulk upload. Each file is read and a candidate record is created from it. Use this for sourcing teams who add people from CVs.",
  },
  "read:notifications": {
    label: "See notifications",
    description: "Read in-app alerts and the notification list.",
    detail:
      "Lets them open the bell icon and read alerts about their work. It does not send company-wide announcements.",
  },
  "read:country_coverage": {
    label: "View Country Coverage",
    description: "Browse countries and see which users cover them",
  },
  "read:system_config": {
    label: "All company setup (legacy)",
    description:
      "View every system settings area at once. Prefer the specific RNR, HRD, and catalog ticks instead.",
    detail:
      "Kept for older roles. Prefer ticking RNR, HRD, Leadgen, Office Addresses, or Master Catalog separately.",
  },
  "manage:system_config": {
    label: "Change all company setup (legacy)",
    description:
      "Update every system settings area at once. Prefer the specific manage ticks instead.",
    detail:
      "Kept for older admin roles. Prefer granting manage on each settings area you want them to change.",
  },
  "read:rnr_settings": {
    label: "View RNR Settings",
    description: "See RNR reminders, office hours, and CRE assignment rules.",
    detail:
      "Opens the RNR Settings tab. They can look at the setup but cannot change it unless Manage RNR Settings is also ticked.",
  },
  "manage:rnr_settings": {
    label: "Manage RNR Settings",
    description: "Change RNR reminders, office hours, and CRE assignment rules.",
  },
  "read:hrd_settings": {
    label: "View HRD Settings",
    description: "See human resource development reminder rules.",
  },
  "manage:hrd_settings": {
    label: "Manage HRD Settings",
    description: "Change human resource development reminder rules.",
  },
  "read:leadgen_channels": {
    label: "View Leadgen Channels",
    description:
      "See whether WhatsApp, Instagram, Messenger, and Lead Ads are on or off.",
  },
  "manage:leadgen_channels": {
    label: "Manage Leadgen Channels",
    description:
      "Turn WhatsApp, Instagram, Messenger, and Lead Ads channels on or off.",
  },
  "read:office_addresses": {
    label: "View Office Addresses",
    description: "See office address presets used for courier and documents.",
  },
  "manage:office_addresses": {
    label: "Manage Office Addresses",
    description: "Update office address presets for courier and documents.",
  },
  "read:master_catalog": {
    label: "View Master Catalog",
    description: "Browse professions, departments, and role catalog entries.",
  },
  "manage:master_catalog": {
    label: "Manage Master Catalog",
    description:
      "Create, update, and deactivate professions, departments, and roles.",
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

export type PermissionCategory = {
  label: string;
  description: string;
  icon: LucideIcon;
  patterns: string[];
};

/**
 * Catalog keys hidden from Role Form — legacy, duplicate, or not needed yet.
 * - `shortlist:candidates`: unused; assign-to-project uses `nominate:candidates`.
 * - `bulk_create:candidates` / `write:candidates_bulk_resume`: bulk resume tools (hidden for now).
 */
export const ROLE_FORM_HIDDEN_PERMISSION_KEYS = new Set([
  "shortlist:candidates",
  "bulk_create:candidates",
  "write:candidates_bulk_resume",
]);

export function isPermissionVisibleInRoleForm(key: string): boolean {
  return !ROLE_FORM_HIDDEN_PERMISSION_KEYS.has(key);
}

export const PERMISSION_CATEGORIES: Record<string, PermissionCategory> = {
  global: {
    label: "Whole system",
    description: "Powerful shortcuts that unlock almost every screen. Give these only to trusted admins.",
    icon: Shield,
    patterns: ["*", "all"],
  },
  users: {
    label: "Staff accounts",
    description: "Who can log in, and their staff profiles.",
    icon: Users,
    patterns: ["users"],
  },
  teams: {
    label: "Teams",
    description: "Recruiting teams and who belongs to them.",
    icon: Users,
    patterns: ["teams", "assigned_teams"],
  },
  projects: {
    label: "Projects",
    description:
      "Job orders, project pages, and putting candidates onto a job.",
    icon: Briefcase,
    // Exact keys first: these use a :candidates resource but belong on the job board.
    patterns: [
      "nominate:candidates",
      "projects",
      "assigned_projects",
    ],
  },
  candidates: {
    label: "Candidates",
    description:
      "People records — profiles, transfers, and pipeline status (not placing them on a job).",
    icon: UserCheck,
    patterns: ["candidates", "assigned_candidates", "candidates_bulk_resume"],
  },
  documents: {
    label: "Documents",
    description: "Files, checks, original papers, and courier.",
    icon: FileText,
    patterns: [
      "documents",
      "resubmission",
      "verification",
      "original_document_intake",
      "courier_management",
    ],
  },
  processing: {
    label: "Processing",
    description: "Visa and deployment steps after a candidate is selected.",
    icon: ClipboardCheck,
    patterns: ["processing"],
  },
  interviews: {
    label: "Interviews",
    description:
      "Scheduling interviews, screening sessions, question templates, and sending passed interviews to Ready for Processing.",
    icon: Headphones,
    patterns: ["interviews", "screenings", "interview_templates", "offer_letters"],
  },
  training: {
    label: "Training",
    description: "Training sessions and who is assigned to them.",
    icon: ClipboardCheck,
    patterns: ["training"],
  },
  recruiters: {
    label: "Recruiters",
    description: "Recruiter profiles and assignments.",
    icon: UserCheck,
    patterns: ["recruiters"],
  },
  cre: {
    label: "Operations Executive",
    description: "Follow-ups after documents — calls and right-to-represent cases.",
    icon: Headphones,
    patterns: ["cre", "operations_call_history", "rnr_candidates"],
  },
  roles: {
    label: "Roles",
    description: "Creating roles and deciding what each role can do.",
    icon: Shield,
    patterns: ["roles"],
  },
  agents: {
    label: "Agents",
    description: "Agency partners who send candidates.",
    icon: Briefcase,
    patterns: ["agents"],
  },
  clients: {
    label: "Clients",
    description: "Client companies and contacts.",
    icon: Briefcase,
    patterns: ["clients"],
  },
  analytics: {
    label: "Reports",
    description: "Dashboards and exported reports.",
    icon: BarChart3,
    patterns: ["analytics"],
  },
  settings: {
    label: "Settings",
    description:
      "Admin home, RNR/HRD rules, leadgen channels, office addresses, and master catalog.",
    icon: LayoutDashboard,
    patterns: [
      "settings",
      "system_config",
      "rnr_settings",
      "hrd_settings",
      "leadgen_channels",
      "admin-dashboard",
      "admin_dashboard",
      "office_addresses",
      "master_catalog",
      "country_coverage",
      "qualifications",
    ],
  },
  notifications: {
    label: "Notifications",
    description: "In-app alerts and the notification list.",
    icon: Bell,
    patterns: ["notifications"],
  },
  audit: {
    label: "Activity history",
    description: "Who did what, and when.",
    icon: Eye,
    patterns: ["audit"],
  },
};

/**
 * Catalog keys that also appear under additional Role Form groups
 * (beyond their primary category from PERMISSION_CATEGORIES).
 * Same permission key — one checkbox value, shown in two places for discoverability.
 */
export const PERMISSION_ADDITIONAL_CATEGORIES: Record<string, string[]> = {
  "transfer:processing": ["interviews"],
};

const EDIT_ACTION_PREFIXES = [
  "write:",
  "nominate:",
  "send:",
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
  "bulk_create:",
  "upload:",
  "update:",
];

const ACTION_WORD: Record<string, string> = {
  read: "See",
  write: "Change",
  edit: "Change",
  update: "Change",
  manage: "Full access to",
  delete: "Remove",
  bulk_create: "Add many",
};

function getPermissionResource(key: string): string {
  if (key === "*") return "*";
  const separator = key.indexOf(":");
  return separator >= 0 ? key.slice(separator + 1) : key;
}

function alternateResourceKey(key: string): string | undefined {
  const separator = key.indexOf(":");
  if (separator < 0) return undefined;
  const action = key.slice(0, separator);
  const resource = key.slice(separator + 1);
  const alternateResource = resource.includes("-")
    ? resource.replace(/-/g, "_")
    : resource.replace(/_/g, "-");
  if (alternateResource === resource) return undefined;
  return `${action}:${alternateResource}`;
}

function resolveDisplayKey(key: string): string {
  if (PERMISSION_DISPLAY[key]) return key;
  const alternate = alternateResourceKey(key);
  if (alternate && PERMISSION_DISPLAY[alternate]) return alternate;
  return key;
}

function resourceMatchesPattern(resource: string, pattern: string): boolean {
  const normalizedResource = resource.replace(/-/g, "_");
  const normalizedPattern = pattern.replace(/-/g, "_");
  return normalizedResource === normalizedPattern;
}

export function permissionMatchesCategory(
  key: string,
  patterns: string[],
): boolean {
  if (patterns.includes(key)) return true;
  const resource = getPermissionResource(key);
  return patterns.some(
    (pattern) => pattern === key || resourceMatchesPattern(resource, pattern),
  );
}

export function getPermissionCategoryId(key: string): string {
  for (const [id, category] of Object.entries(PERMISSION_CATEGORIES)) {
    if (permissionMatchesCategory(key, category.patterns)) return id;
  }
  return "other";
}

export function humanizePermissionKey(key: string): string {
  const separator = key.indexOf(":");
  const action = separator >= 0 ? key.slice(0, separator) : key;
  const resource =
    separator >= 0
      ? key.slice(separator + 1).replace(/[_-]/g, " ")
      : key.replace(/[_-]/g, " ");
  const resourceLabel = resource.replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
  const actionLabel =
    ACTION_WORD[action] ??
    action.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return `${actionLabel} ${resourceLabel}`.replace(/\s+/g, " ").trim();
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
  const resolved = resolveDisplayKey(key);
  return PERMISSION_DISPLAY[resolved]?.label ?? humanizePermissionKey(key);
}

export function getPermissionDescription(
  key: string,
  apiDescription?: string | null,
): string | undefined {
  const resolved = resolveDisplayKey(key);
  const catalog = PERMISSION_DISPLAY[resolved]?.description;
  if (catalog) return catalog;
  if (
    apiDescription?.trim() &&
    !isGenericPermissionDescription(key, apiDescription)
  ) {
    return apiDescription.trim();
  }
  if (apiDescription?.trim()) return apiDescription.trim();
  return undefined;
}

export function getPermissionDetail(
  key: string,
  apiDescription?: string | null,
): string {
  const resolved = resolveDisplayKey(key);
  const catalogDetail = PERMISSION_DISPLAY[resolved]?.detail;
  if (catalogDetail) return catalogDetail;

  const description = getPermissionDescription(key, apiDescription);
  const category = PERMISSION_CATEGORIES[getPermissionCategoryId(key)];
  const access = getPermissionAccessLabel(key);

  return [
    description ?? `${getPermissionLabel(key)}.`,
    category
      ? `This sits under ${category.label}. ${category.description}`
      : null,
    `Access type: ${access}. Tick this only if this person should be allowed to do that.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function getPermissionAccessLabel(key: string): string {
  switch (getPermissionActionTier(key)) {
    case "view":
      return "See";
    case "edit":
      return "Change";
    case "manage":
      return "Full access";
    case "global":
      return "Everything";
    default:
      return "Special";
  }
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

  for (const permission of permissions) {
    const categoryId = getPermissionCategoryId(permission);
    if (!grouped[categoryId]) grouped[categoryId] = [];
    grouped[categoryId].push(permission);
  }

  return grouped;
}

export type CatalogPermissionGroup<T extends { key: string }> = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  items: T[];
};

const OTHER_CATEGORY = {
  label: "Other",
  description: "Extra access that does not fit the groups above.",
  icon: Shield,
} as const;

function sortPermissionsForDisplay<T extends { key: string }>(left: T, right: T) {
  const tierRank: Record<PermissionActionTier, number> = {
    view: 0,
    edit: 1,
    other: 2,
    manage: 3,
    global: 4,
  };
  const rankDelta =
    tierRank[getPermissionActionTier(left.key)] -
    tierRank[getPermissionActionTier(right.key)];
  if (rankDelta !== 0) return rankDelta;
  return getPermissionLabel(left.key).localeCompare(getPermissionLabel(right.key));
}

export function groupCatalogPermissionsByResource<T extends { key: string }>(
  permissions: T[],
): CatalogPermissionGroup<T>[] {
  const buckets = new Map<string, T[]>();

  const pushInto = (categoryId: string, permission: T) => {
    const items = buckets.get(categoryId) ?? [];
    if (items.some((item) => item.key === permission.key)) return;
    items.push(permission);
    buckets.set(categoryId, items);
  };

  for (const permission of permissions) {
    if (permission.key === "*") continue;
    if (!isPermissionVisibleInRoleForm(permission.key)) continue;
    pushInto(getPermissionCategoryId(permission.key), permission);
    for (const extraId of PERMISSION_ADDITIONAL_CATEGORIES[permission.key] ?? []) {
      pushInto(extraId, permission);
    }
  }

  const groups: CatalogPermissionGroup<T>[] = [];

  for (const [id, category] of Object.entries(PERMISSION_CATEGORIES)) {
    const items = buckets.get(id);
    if (!items?.length) continue;
    groups.push({
      id,
      label: category.label,
      description: category.description,
      icon: category.icon,
      items: [...items].sort(sortPermissionsForDisplay),
    });
  }

  const leftover = buckets.get("other");
  if (leftover?.length) {
    groups.push({
      id: "other",
      label: OTHER_CATEGORY.label,
      description: OTHER_CATEGORY.description,
      icon: OTHER_CATEGORY.icon,
      items: [...leftover].sort(sortPermissionsForDisplay),
    });
  }

  return groups;
}

export function groupPermissionKeysByResource(keys: string[]) {
  return groupCatalogPermissionsByResource(keys.map((key) => ({ key }))).map(
    (group) => ({
      id: group.id,
      label: group.label,
      description: group.description,
      icon: group.icon,
      items: group.items.map((item) => item.key),
    }),
  );
}
