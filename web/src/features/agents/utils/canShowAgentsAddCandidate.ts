import { userHasAnyRole } from "@/config/role-names";
import { hasAnyPermission } from "@/shared/utils/canAccess";

export const CREATE_AGENT_CANDIDATES_PERMISSION = "create:agent_candidates";

const AGENTS_ADD_CANDIDATE_HIDDEN_ROLES = ["System Admin", "Admin"] as const;

export function canShowAgentsAddCandidate(params: {
  permissions: string[] | undefined;
  roles: string[] | undefined;
}): boolean {
  const roles = params.roles ?? [];
  const permissions = params.permissions ?? [];

  if (userHasAnyRole(roles, AGENTS_ADD_CANDIDATE_HIDDEN_ROLES)) {
    return false;
  }

  return hasAnyPermission(permissions, [
    CREATE_AGENT_CANDIDATES_PERMISSION,
    "write:candidates",
    "manage:candidates",
  ]);
}
