import { ROLE_NAMES } from "@/config/role-names";

/** Roles that may open recruiter documentation pages (list + project/candidate detail). */
export const RECRUITER_DOCS_ROUTE_ROLES = [
  "Recruiter",
  "System Admin",
  ROLE_NAMES.AGENT_COORDINATOR,
  "Interview Coordinator",
  "Processing Executive",
] as const;

/**
 * Permission fallback for offer-letter notification deep links and coordinator views.
 * `matchRolesOrPermissions` on recruiter-docs routes uses roles OR these permissions.
 */
export const RECRUITER_DOCS_ROUTE_PERMISSIONS = [
  "nominate:candidates",
  "read:interviews",
  "read:processing",
] as const;
