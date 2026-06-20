import { ROLE_NAMES } from './role-ids';

/** Admin and manager roles notified when an offer letter is uploaded. */
export const OFFER_LETTER_UPLOAD_LEADERSHIP_ROLES = [
  ROLE_NAMES.SYSTEM_ADMIN,
  'Admin',
  'System Administrator',
  ROLE_NAMES.MANAGER,
  'Recruiter Manager',
  ROLE_NAMES.CEO,
  ROLE_NAMES.DIRECTOR,
  'Processing Manager',
] as const;
