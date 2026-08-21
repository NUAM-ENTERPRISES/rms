/** Mirrors backend `ROLE_NAMES` for JWT role string checks in the web app. */
export const ROLE_NAMES = {
  CEO: "Managing Director",
  DIRECTOR: "Director",
  MANAGER: "Department Head",
  TEAM_HEAD: "Team Head",
  TEAM_LEAD: "Team Lead",
  RECRUITER: "Recruitment Executive",
  RECRUITER_MANAGER: "Recruitment Team Lead",
  PROCESSING_MANAGER: "Processing Team Lead",
  DOCUMENTATION_EXECUTIVE: "Documentation Executive",
  DOCUMENTS_CONTROL_EXECUTIVE: "Document Control Executive",
  PROCESSING_EXECUTIVE: "Processing Executive",
  INTERVIEW_COORDINATOR: "Interview Coordinator",
  SCREENING_TRAINER: "Screening & Training Executive",
  SYSTEM_ADMIN: "Admin",
  OPERATIONS: "Operations Executive",
  AGENT_COORDINATOR: "Agent Coordinator",
  PROJECT_COORDINATOR: "Project Coordinator",
} as const;

/** @deprecated Legacy CRE role name — prefer ROLE_NAMES.OPERATIONS */
export const LEGACY_CRE_ROLE_NAME = "CRE";

/** @deprecated Legacy Operations name before rename to Operations Executive */
export const LEGACY_OPERATIONS_ROLE_NAME = "Operations";

/** @deprecated Legacy role name — prefer ROLE_NAMES.AGENT_COORDINATOR */
export const LEGACY_CLIENT_COORDINATOR_ROLE_NAME = "Client Coordinator";

/** JWT role strings that identify Operations (includes legacy aliases). */
export const OPERATIONS_ROLE_NAMES = [
  ROLE_NAMES.OPERATIONS,
  LEGACY_OPERATIONS_ROLE_NAME,
  LEGACY_CRE_ROLE_NAME,
] as const;

/** JWT role strings that identify Agent Coordinator (includes legacy alias). */
export const AGENT_COORDINATOR_ROLE_NAMES = [
  ROLE_NAMES.AGENT_COORDINATOR,
  LEGACY_CLIENT_COORDINATOR_ROLE_NAME,
] as const;

export function isOperationsRole(roleName: string): boolean {
  return (OPERATIONS_ROLE_NAMES as readonly string[]).includes(roleName);
}

export function isAgentCoordinatorRole(roleName: string): boolean {
  return (AGENT_COORDINATOR_ROLE_NAMES as readonly string[]).includes(roleName);
}

export function isSystemAdminRole(roleName: string): boolean {
  return roleName === ROLE_NAMES.SYSTEM_ADMIN || roleName === "System Admin";
}

export function isRecruiterRole(roleName: string): boolean {
  return roleName === ROLE_NAMES.RECRUITER || roleName === "Recruiter";
}

export function isDocumentsControlRole(roleName: string): boolean {
  return (
    roleName === ROLE_NAMES.DOCUMENTS_CONTROL_EXECUTIVE ||
    roleName === "Documents Control Executive"
  );
}
