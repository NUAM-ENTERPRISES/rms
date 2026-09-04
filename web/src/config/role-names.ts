/**
 * Role display names for JWT / nav checks.
 * Keep in sync with backend `common/constants/role-ids.ts`.
 */
export const ROLE_NAMES = {
  CEO: "Managing Director",
  DIRECTOR: "Director",
  MANAGER: "Manager",
  TEAM_HEAD: "Team Head",
  TEAM_LEAD: "Team Lead",
  RECRUITER: "Recruitment Executive",
  DOCUMENTATION_EXECUTIVE: "Documentation Executive",
  DOCUMENTS_CONTROL_EXECUTIVE: "Document Control Executive",
  PROCESSING_EXECUTIVE: "Processing Executive",
  INTERVIEW_COORDINATOR: "Interview Coordinator",
  SYSTEM_ADMIN: "System Admin",
  OPERATIONS: "Operations Executive",
  AGENT_COORDINATOR: "Agent Coordinator",
  PROJECT_COORDINATOR: "Project Coordinator",
} as const;

/** Previous role names kept for JWT / UI compatibility until re-login. */
export const LEGACY_ROLE_NAMES = {
  CEO: "CEO",
  RECRUITER: "Recruiter",
  DOCUMENTS_CONTROL_EXECUTIVE: "Documents Control Executive",
  OPERATIONS: "Operations",
} as const;

/** @deprecated Legacy CRE role name — prefer ROLE_NAMES.OPERATIONS */
export const LEGACY_CRE_ROLE_NAME = "CRE";

/** @deprecated Legacy role name — prefer ROLE_NAMES.AGENT_COORDINATOR */
export const LEGACY_CLIENT_COORDINATOR_ROLE_NAME = "Client Coordinator";

const ROLE_ALIAS_GROUPS: readonly (readonly string[])[] = [
  [ROLE_NAMES.CEO, LEGACY_ROLE_NAMES.CEO],
  [ROLE_NAMES.RECRUITER, LEGACY_ROLE_NAMES.RECRUITER],
  [
    ROLE_NAMES.DOCUMENTS_CONTROL_EXECUTIVE,
    LEGACY_ROLE_NAMES.DOCUMENTS_CONTROL_EXECUTIVE,
  ],
  [ROLE_NAMES.OPERATIONS, LEGACY_ROLE_NAMES.OPERATIONS, LEGACY_CRE_ROLE_NAME],
  [ROLE_NAMES.AGENT_COORDINATOR, LEGACY_CLIENT_COORDINATOR_ROLE_NAME],
];

export function roleNameAliases(roleName: string): string[] {
  const group = ROLE_ALIAS_GROUPS.find((names) => names.includes(roleName));
  if (group) return [...group];
  return [roleName];
}

export function expandRoleNames(roleNames: readonly string[]): string[] {
  const out = new Set<string>();
  for (const name of roleNames) {
    for (const alias of roleNameAliases(name)) {
      out.add(alias);
    }
  }
  return [...out];
}

export function roleNameEquals(left: string, right: string): boolean {
  return (
    roleNameAliases(left).includes(right) ||
    roleNameAliases(right).includes(left)
  );
}

export function userHasAnyRole(
  userRoles: readonly string[],
  requiredRoles: readonly string[],
): boolean {
  const expandedRequired = expandRoleNames(requiredRoles);
  return userRoles.some((role) => expandedRequired.includes(role));
}

/** JWT role strings that identify Agent Coordinator (includes legacy alias). */
export const AGENT_COORDINATOR_ROLE_NAMES = [
  ROLE_NAMES.AGENT_COORDINATOR,
  LEGACY_CLIENT_COORDINATOR_ROLE_NAME,
] as const;

export function isOperationsRole(roleName: string): boolean {
  return roleNameAliases(ROLE_NAMES.OPERATIONS).includes(roleName);
}

export function isRecruiterRole(roleName: string): boolean {
  return roleNameAliases(ROLE_NAMES.RECRUITER).includes(roleName);
}

export function isDocumentsControlExecutiveRole(roleName: string): boolean {
  return roleNameAliases(ROLE_NAMES.DOCUMENTS_CONTROL_EXECUTIVE).includes(
    roleName,
  );
}

export function isAgentCoordinatorRole(roleName: string): boolean {
  return (AGENT_COORDINATOR_ROLE_NAMES as readonly string[]).includes(roleName);
}

export function isManagingDirectorRole(roleName: string): boolean {
  return roleNameAliases(ROLE_NAMES.CEO).includes(roleName);
}
