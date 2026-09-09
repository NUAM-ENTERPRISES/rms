import { ROLE_NAMES } from "./role-names";

/** Roles that can use Import Sheet and AI merged-PDF upload, matching Manager. */
export const CANDIDATE_IMPORT_AND_AI_ROLES = [
  ROLE_NAMES.RECRUITER,
  "Recruiter Manager",
  "Recruitment Lead",
] as const;
