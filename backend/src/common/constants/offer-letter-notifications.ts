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

/** Roles that should open the passed interview detail page from offer-letter notifications. */
export const OFFER_LETTER_INTERVIEW_DETAIL_ROLES = [
  ROLE_NAMES.INTERVIEW_COORDINATOR,
  ROLE_NAMES.PROCESSING_EXECUTIVE,
] as const;

export function buildOfferLetterUploadedNotificationLink(options: {
  roleNames: string[];
  interviewId?: string | null;
  projectId: string;
  candidateId: string;
}): string {
  const { roleNames, interviewId, projectId, candidateId } = options;
  const prefersInterviewDetail =
    !!interviewId &&
    roleNames.some((name) =>
      (OFFER_LETTER_INTERVIEW_DETAIL_ROLES as readonly string[]).includes(name),
    );

  if (prefersInterviewDetail && interviewId) {
    return `/interviews/detail/${interviewId}`;
  }

  return `/recruiter-docs/${projectId}/${candidateId}`;
}
