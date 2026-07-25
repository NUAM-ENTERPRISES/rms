export const WHATSAPP_TEMPLATE_TYPES = {
  NUAM_ACCOUNT_CREATION_V1: 'num_account_creation_v1',
  HELLO_WORLD: 'hello_world',
  SCREENING_SCHEDULED: 'screening_scheduled_v1',
  CANDIDATE_STATUS_INTERESTED: 'candidate_status_interested',
  CANDIDATE_STATUS_NOT_INTERESTED: 'candidate_status_not_interested',
  CANDIDATE_STATUS_QUALIFIED: 'candidate_status_qualified',
  CANDIDATE_STATUS_DEPLOYED: 'candidate_status_deployed',
  CANDIDATE_STATUS_FUTURE: 'candidate_status_future',
  CANDIDATE_STATUS_CALLBACK: 'candidate_status_callback',
  CANDIDATE_STATUS_ON_HOLD: 'candidate_status_on_hold',
  CANDIDATE_STATUS_RNR: 'candidate_status_rnr',
} as const;

export type WhatsAppTemplateType =
  (typeof WHATSAPP_TEMPLATE_TYPES)[keyof typeof WHATSAPP_TEMPLATE_TYPES];

/** Normalized keys (lowercase, alphanumeric only) for statuses that send WhatsApp. */
export const WHATSAPP_STATUS_ALLOWED = [
  'interested',
  'notinterested',
  'qualified',
  'deployed',
  'future',
  'callback',
  'onhold',
  'rnr',
] as const;

export type WhatsAppAllowedStatusKey =
  (typeof WHATSAPP_STATUS_ALLOWED)[number];

const STATUS_TEMPLATE_MAP: Record<WhatsAppAllowedStatusKey, string> = {
  interested: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_INTERESTED,
  notinterested: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOT_INTERESTED,
  qualified: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_QUALIFIED,
  deployed: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_DEPLOYED,
  future: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_FUTURE,
  callback: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_CALLBACK,
  onhold: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_ON_HOLD,
  rnr: WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_RNR,
};

export function normalizeWhatsAppStatusKey(statusName: string): string {
  return statusName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Resolve Meta WhatsApp template name for a candidate status.
 * Returns null when the status is not configured for WhatsApp.
 */
export function getWhatsAppTemplateForStatus(
  statusName: string,
): string | null {
  const key = normalizeWhatsAppStatusKey(statusName);
  if (!(WHATSAPP_STATUS_ALLOWED as readonly string[]).includes(key)) {
    return null;
  }
  return STATUS_TEMPLATE_MAP[key as WhatsAppAllowedStatusKey];
}

export function isWhatsAppStatusAllowed(statusName: string): boolean {
  return getWhatsAppTemplateForStatus(statusName) !== null;
}
