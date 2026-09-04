import { ROLE_NAMES, userHasAnyRole } from "@/config/role-names";

export const PROCESSING_STATUS_CHANGE_DIRECT_ROLES = [
  ROLE_NAMES.MANAGER,
  ROLE_NAMES.PROCESSING_LEAD,
] as const;

export function canDirectApplyProcessingStatusChange(
  roles: string[] | undefined,
): boolean {
  return userHasAnyRole(roles ?? [], PROCESSING_STATUS_CHANGE_DIRECT_ROLES);
}
