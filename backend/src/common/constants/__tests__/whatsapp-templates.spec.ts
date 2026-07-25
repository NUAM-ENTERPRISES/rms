import {
  WHATSAPP_TEMPLATE_TYPES,
  getWhatsAppTemplateForStatus,
  isWhatsAppStatusAllowed,
  normalizeWhatsAppStatusKey,
} from '../whatsapp-templates';

describe('whatsapp-templates status mapping', () => {
  it.each([
    ['Interested', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_INTERESTED],
    ['Not Interested', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOT_INTERESTED],
    ['Qualified', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_QUALIFIED],
    ['Deployed', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_DEPLOYED],
    ['Future', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_FUTURE],
    ['Call Back', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_CALLBACK],
    ['On Hold', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_ON_HOLD],
    ['RNR', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_RNR],
  ])('maps %s to %s', (statusName, templateName) => {
    expect(getWhatsAppTemplateForStatus(statusName)).toBe(templateName);
    expect(isWhatsAppStatusAllowed(statusName)).toBe(true);
  });

  it('is case-insensitive and ignores separators', () => {
    expect(getWhatsAppTemplateForStatus('call_back')).toBe(
      WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_CALLBACK,
    );
    expect(getWhatsAppTemplateForStatus('ON-HOLD')).toBe(
      WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_ON_HOLD,
    );
    expect(getWhatsAppTemplateForStatus('not_interested')).toBe(
      WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOT_INTERESTED,
    );
  });

  it('returns null for statuses that should not send WhatsApp', () => {
    expect(getWhatsAppTemplateForStatus('Untouched')).toBeNull();
    expect(getWhatsAppTemplateForStatus('Not Eligible')).toBeNull();
    expect(getWhatsAppTemplateForStatus('Other Enquiry')).toBeNull();
    expect(isWhatsAppStatusAllowed('Untouched')).toBe(false);
  });

  it('normalizes status keys to alphanumeric lowercase', () => {
    expect(normalizeWhatsAppStatusKey('Call Back')).toBe('callback');
    expect(normalizeWhatsAppStatusKey('On_Hold')).toBe('onhold');
  });
});
