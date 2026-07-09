export const WHATSAPP_TEMPLATE_TYPES = {
  NUAM_ACCOUNT_CREATION_V1: 'num_account_creation_v1',
  HELLO_WORLD: 'hello_world',
  TEST_STATUS: 'test_status',
  SCREENING_SCHEDULED: 'screening_scheduled_v1',

  // TEMP: use HELLO_WORLD for Interested until candidate_status_interested is approved in Meta.
  // CANDIDATE_STATUS_INTERESTED: 'candidate_status_interested',
  CANDIDATE_STATUS_NOT_INTERESTED: 'candidate_status_not_interested',
  CANDIDATE_STATUS_NOT_ELIGIBLE: 'candidate_status_not_eligible',
  CANDIDATE_STATUS_CALLBACK: 'candidate_status_callback',
  CANDIDATE_STATUS_RNR: 'candidate_status_rnr',
  CANDIDATE_STATUS_NOMINATED: 'candidate_status_nominated',
  CANDIDATE_STATUS_INTERVIEW: 'candidate_status_interview',
  CANDIDATE_STATUS_SHORTLISTED: 'candidate_status_shortlisted',
  CANDIDATE_STATUS_SCHEDULED: 'candidate_status_scheduled',
  CANDIDATE_STATUS_PASSED: 'candidate_status_passed',
  CANDIDATE_STATUS_PROCESSING: 'candidate_status_processing',
  CANDIDATE_STATUS_VISA: 'candidate_status_visa',
  CANDIDATE_STATUS_TICKET: 'candidate_status_ticket',
  CANDIDATE_STATUS_HIRED: 'candidate_status_hired',
  CANDIDATE_STATUS_DEPLOYED: 'candidate_status_deployed',
} as const;

export type WhatsAppTemplateType =
  (typeof WHATSAPP_TEMPLATE_TYPES)[keyof typeof WHATSAPP_TEMPLATE_TYPES];

export const CANDIDATE_STATUS_WHATSAPP_TEMPLATE_NAMES = [
  // TEMP: Interested uses hello_world — see CANDIDATE_STATUS_TO_WHATSAPP_TEMPLATE.
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOT_INTERESTED,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOT_ELIGIBLE,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_CALLBACK,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_RNR,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOMINATED,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_INTERVIEW,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_SHORTLISTED,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_SCHEDULED,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_PASSED,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_PROCESSING,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_VISA,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_TICKET,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_HIRED,
  WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_DEPLOYED,
] as const;

export type CandidateStatusWhatsAppTemplateName =
  (typeof CANDIDATE_STATUS_WHATSAPP_TEMPLATE_NAMES)[number];

const CANDIDATE_STATUS_WHATSAPP_NO_PARAM_TEMPLATES = new Set<WhatsAppTemplateType>([
  WHATSAPP_TEMPLATE_TYPES.HELLO_WORLD,
]);

const CANDIDATE_STATUS_WHATSAPP_ONE_PARAM_TEMPLATES =
  new Set<WhatsAppTemplateType>([
    WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOT_INTERESTED,
  ]);

const CANDIDATE_STATUS_WHATSAPP_THREE_PARAM_TEMPLATES =
  new Set<WhatsAppTemplateType>([
    WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_CALLBACK,
    WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_SCHEDULED,
    WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_TICKET,
  ]);

export const CANDIDATE_STATUS_TO_WHATSAPP_TEMPLATE: Record<
  string,
  WhatsAppTemplateType
> = {
  // TEMP: route Interested to pre-approved hello_world template for testing.
  interested: WHATSAPP_TEMPLATE_TYPES.HELLO_WORLD,
  not_interested: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOT_INTERESTED,
  not_eligible: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOT_ELIGIBLE,
  call_back: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_CALLBACK,
  rnr: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_RNR,
  nominated: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOMINATED,
  interview: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_INTERVIEW,
  interviewing: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_INTERVIEW,
  shortlisted: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_SHORTLISTED,
  interview_scheduled: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_SCHEDULED,
  scheduled: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_SCHEDULED,
  interview_passed: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_PASSED,
  screening_passed: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_PASSED,
  passed: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_PASSED,
  processing: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_PROCESSING,
  visa: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_VISA,
  ticket: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_TICKET,
  hired: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_HIRED,
  deployed: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_DEPLOYED,
};

export function normalizeCandidateStatusKey(statusName: string): string {
  return statusName.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function resolveCandidateStatusWhatsAppTemplate(
  statusName: string,
): WhatsAppTemplateType | null {
  const key = normalizeCandidateStatusKey(statusName);
  return CANDIDATE_STATUS_TO_WHATSAPP_TEMPLATE[key] ?? null;
}

export function isCandidateStatusWhatsAppNotifiable(statusName: string): boolean {
  return resolveCandidateStatusWhatsAppTemplate(statusName) !== null;
}

export interface CandidateStatusWhatsAppBodyOptions {
  candidateName: string;
  roleOrProjectName?: string;
  additionalDetail?: string;
}

export function getCandidateFirstName(candidateName: string): string {
  const trimmed = candidateName.trim();
  if (!trimmed) {
    return 'Candidate';
  }

  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function buildCandidateStatusWhatsAppBodyParameters(
  templateName: WhatsAppTemplateType,
  options: CandidateStatusWhatsAppBodyOptions,
): string[] {
  const firstName = getCandidateFirstName(options.candidateName);
  const role = options.roleOrProjectName?.trim() || 'your application';
  const detail = options.additionalDetail?.trim() || 'TBD';

  if (CANDIDATE_STATUS_WHATSAPP_NO_PARAM_TEMPLATES.has(templateName)) {
    return [];
  }

  if (CANDIDATE_STATUS_WHATSAPP_ONE_PARAM_TEMPLATES.has(templateName)) {
    return [firstName];
  }

  if (CANDIDATE_STATUS_WHATSAPP_THREE_PARAM_TEMPLATES.has(templateName)) {
    return [firstName, role, detail];
  }

  return [firstName, role];
}
