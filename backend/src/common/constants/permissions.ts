/**
 * Permission Constants - Affiniks RMS
 *
 * This file defines all permissions in the system.
 * These are synced with the database via seed.ts
 *
 * @module common/constants/permissions
 */

export const PERMISSIONS = {
  // Global permissions
  ALL: '*',
  READ_ALL: 'read:all',
  WRITE_ALL: 'write:all',
  MANAGE_ALL: 'manage:all',

  // User management
  READ_USERS: 'read:users',
  WRITE_USERS: 'write:users',
  MANAGE_USERS: 'manage:users',

  // Team management
  READ_TEAMS: 'read:teams',
  WRITE_TEAMS: 'write:teams',
  MANAGE_TEAMS: 'manage:teams',
  READ_ASSIGNED_TEAMS: 'read:assigned_teams',
  WRITE_ASSIGNED_TEAMS: 'write:assigned_teams',

  // Project management
  READ_PROJECTS: 'read:projects',
  WRITE_PROJECTS: 'write:projects',
  MANAGE_PROJECTS: 'manage:projects',
  READ_ASSIGNED_PROJECTS: 'read:assigned_projects',
  WRITE_ASSIGNED_PROJECTS: 'write:assigned_projects',

  // Candidate management
  READ_CANDIDATES: 'read:candidates',
  WRITE_CANDIDATES: 'write:candidates',
  MANAGE_CANDIDATES: 'manage:candidates',
  READ_ASSIGNED_CANDIDATES: 'read:assigned_candidates',
  WRITE_ASSIGNED_CANDIDATES: 'write:assigned_candidates',
  NOMINATE_CANDIDATES: 'nominate:candidates',
  APPROVE_CANDIDATES: 'approve:candidates',
  REJECT_CANDIDATES: 'reject:candidates',
  SHORTLIST_CANDIDATES: 'shortlist:candidates',
  TRANSFER_CANDIDATES: 'transfer:candidates',
  TRANSFER_BACK_CANDIDATES: 'transfer_back:candidates',

  // Document management
  READ_DOCUMENTS: 'read:documents',
  WRITE_DOCUMENTS: 'write:documents',
  VERIFY_DOCUMENTS: 'verify:documents',
  MANAGE_DOCUMENTS: 'manage:documents',
  REQUEST_RESUBMISSION: 'request:resubmission',

  // Processing management
  READ_PROCESSING: 'read:processing',
  WRITE_PROCESSING: 'write:processing',
  MANAGE_PROCESSING: 'manage:processing',
  TRANSFER_TO_PROCESSING: 'transfer:processing',

  // Interview management
  READ_INTERVIEWS: 'read:interviews',
  WRITE_INTERVIEWS: 'write:interviews',
  MANAGE_INTERVIEWS: 'manage:interviews',
  SCHEDULE_INTERVIEWS: 'schedule:interviews',

  // Recruiter management
  MANAGE_RECRUITERS: 'manage:recruiters',
  READ_RECRUITERS: 'read:recruiters',
  WRITE_RECRUITERS: 'write:recruiters',

  // Operations (RNR escalation) management
  READ_CRE: 'read:cre',
  WRITE_CRE: 'write:cre',
  MANAGE_CRE: 'manage:cre',
  ASSIGN_CRE: 'assign:cre',
  HANDLE_RNR_CANDIDATES: 'handle:rnr_candidates',
  READ_OPERATIONS_CALL_HISTORY: 'read:operations_call_history',

  // Role management
  READ_ROLES: 'read:roles',
  WRITE_ROLES: 'write:roles',
  MANAGE_ROLES: 'manage:roles',

  // Agent management
  READ_AGENTS: 'read:agents',
  WRITE_AGENTS: 'write:agents',
  EDIT_AGENTS: 'edit:agents',
  DELETE_AGENTS: 'delete:agents',

  // Client management
  READ_CLIENTS: 'read:clients',
  WRITE_CLIENTS: 'write:clients',
  MANAGE_CLIENTS: 'manage:clients',

  // Analytics
  READ_ANALYTICS: 'read:analytics',
  WRITE_ANALYTICS: 'write:analytics',
  MANAGE_ANALYTICS: 'manage:analytics',

  // Settings
  READ_SETTINGS: 'read:settings',
  WRITE_SETTINGS: 'write:settings',
  MANAGE_SETTINGS: 'manage:settings',

  // Screening Interview & Training management
  READ_SCREENINGS: 'read:screenings',
  WRITE_SCREENINGS: 'write:screenings',
  MANAGE_SCREENINGS: 'manage:screenings',
  CONDUCT_SCREENINGS: 'conduct:screenings',
  READ_INTERVIEW_TEMPLATES: 'read:interview_templates',
  WRITE_INTERVIEW_TEMPLATES: 'write:interview_templates',
  MANAGE_INTERVIEW_TEMPLATES: 'manage:interview_templates',
  READ_TRAINING: 'read:training',
  WRITE_TRAINING: 'write:training',
  MANAGE_TRAINING: 'manage:training',
  ASSIGN_TRAINING: 'assign:training',

  // Admin dashboard
  READ_ADMIN_DASHBOARD: 'read:admin-dashboard',

  // System configuration (RNR / HRD) - admin only
  READ_SYSTEM_CONFIG: 'read:system_config',
  MANAGE_SYSTEM_CONFIG: 'manage:system_config',

  // Audit
  READ_AUDIT: 'read:audit',
  WRITE_AUDIT: 'write:audit',
  MANAGE_AUDIT: 'manage:audit',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * All permissions as array (for seeding)
 */
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/**
 * Permission groups for easier management
 */
export const PERMISSION_GROUPS = {
  GLOBAL: [
    PERMISSIONS.ALL,
    PERMISSIONS.READ_ALL,
    PERMISSIONS.WRITE_ALL,
    PERMISSIONS.MANAGE_ALL,
  ],
  USER: [
    PERMISSIONS.READ_USERS,
    PERMISSIONS.WRITE_USERS,
    PERMISSIONS.MANAGE_USERS,
  ],
  TEAM: [
    PERMISSIONS.READ_TEAMS,
    PERMISSIONS.WRITE_TEAMS,
    PERMISSIONS.MANAGE_TEAMS,
    PERMISSIONS.READ_ASSIGNED_TEAMS,
    PERMISSIONS.WRITE_ASSIGNED_TEAMS,
  ],
  PROJECT: [
    PERMISSIONS.READ_PROJECTS,
    PERMISSIONS.WRITE_PROJECTS,
    PERMISSIONS.MANAGE_PROJECTS,
    PERMISSIONS.READ_ASSIGNED_PROJECTS,
    PERMISSIONS.WRITE_ASSIGNED_PROJECTS,
  ],
  CANDIDATE: [
    PERMISSIONS.READ_CANDIDATES,
    PERMISSIONS.WRITE_CANDIDATES,
    PERMISSIONS.MANAGE_CANDIDATES,
    PERMISSIONS.READ_ASSIGNED_CANDIDATES,
    PERMISSIONS.WRITE_ASSIGNED_CANDIDATES,
    PERMISSIONS.NOMINATE_CANDIDATES,
    PERMISSIONS.APPROVE_CANDIDATES,
    PERMISSIONS.REJECT_CANDIDATES,
    PERMISSIONS.SHORTLIST_CANDIDATES,
    PERMISSIONS.TRANSFER_CANDIDATES,
    PERMISSIONS.TRANSFER_BACK_CANDIDATES,
  ],
  DOCUMENT: [
    PERMISSIONS.READ_DOCUMENTS,
    PERMISSIONS.WRITE_DOCUMENTS,
    PERMISSIONS.VERIFY_DOCUMENTS,
    PERMISSIONS.MANAGE_DOCUMENTS,
    PERMISSIONS.REQUEST_RESUBMISSION,
  ],
  INTERVIEW: [
    PERMISSIONS.READ_INTERVIEWS,
    PERMISSIONS.WRITE_INTERVIEWS,
    PERMISSIONS.MANAGE_INTERVIEWS,
    PERMISSIONS.SCHEDULE_INTERVIEWS,
  ],
  PROCESSING: [
    PERMISSIONS.READ_PROCESSING,
    PERMISSIONS.WRITE_PROCESSING,
    PERMISSIONS.MANAGE_PROCESSING,
    PERMISSIONS.TRANSFER_TO_PROCESSING,
  ],
  RECRUITER: [
    PERMISSIONS.READ_RECRUITERS,
    PERMISSIONS.WRITE_RECRUITERS,
    PERMISSIONS.MANAGE_RECRUITERS,
  ],
  OPERATIONS: [
    PERMISSIONS.READ_CRE,
    PERMISSIONS.WRITE_CRE,
    PERMISSIONS.MANAGE_CRE,
    PERMISSIONS.ASSIGN_CRE,
    PERMISSIONS.HANDLE_RNR_CANDIDATES,
    PERMISSIONS.READ_OPERATIONS_CALL_HISTORY,
  ],
  AGENT: [
    PERMISSIONS.READ_AGENTS,
    PERMISSIONS.WRITE_AGENTS,
    PERMISSIONS.EDIT_AGENTS,
    PERMISSIONS.DELETE_AGENTS,
  ],
  ADMIN_DASHBOARD: [
    PERMISSIONS.READ_ADMIN_DASHBOARD,
  ],
  SCREENING_TRAINING: [
    PERMISSIONS.READ_SCREENINGS,
    PERMISSIONS.WRITE_SCREENINGS,
    PERMISSIONS.MANAGE_SCREENINGS,
    PERMISSIONS.CONDUCT_SCREENINGS,
    PERMISSIONS.READ_INTERVIEW_TEMPLATES,
    PERMISSIONS.WRITE_INTERVIEW_TEMPLATES,
    PERMISSIONS.MANAGE_INTERVIEW_TEMPLATES,
    PERMISSIONS.READ_TRAINING,
    PERMISSIONS.WRITE_TRAINING,
    PERMISSIONS.MANAGE_TRAINING,
    PERMISSIONS.ASSIGN_TRAINING,
  ],
} as const;
