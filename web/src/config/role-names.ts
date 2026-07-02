/** Mirrors backend `ROLE_NAMES` for JWT role string checks in the web app. */
export const ROLE_NAMES = {
  OPERATIONS: "Operations",
  AGENT_COORDINATOR: "Agent Coordinator",
  PROJECT_COORDINATOR: "Project Coordinator",
} as const;

/** @deprecated Legacy CRE role name — prefer ROLE_NAMES.OPERATIONS */
export const LEGACY_CRE_ROLE_NAME = "CRE";

/** @deprecated Legacy role name — prefer ROLE_NAMES.AGENT_COORDINATOR */
export const LEGACY_CLIENT_COORDINATOR_ROLE_NAME = "Client Coordinator";

/** JWT role strings that identify Agent Coordinator (includes legacy alias). */
export const AGENT_COORDINATOR_ROLE_NAMES = [
  ROLE_NAMES.AGENT_COORDINATOR,
  LEGACY_CLIENT_COORDINATOR_ROLE_NAME,
] as const;

export function isOperationsRole(roleName: string): boolean {
  return roleName === ROLE_NAMES.OPERATIONS || roleName === LEGACY_CRE_ROLE_NAME;
}

export function isAgentCoordinatorRole(roleName: string): boolean {
  return (AGENT_COORDINATOR_ROLE_NAMES as readonly string[]).includes(roleName);
}
