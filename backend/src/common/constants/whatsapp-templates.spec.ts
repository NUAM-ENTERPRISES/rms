import {
  WHATSAPP_TEMPLATE_TYPES,
  buildCandidateStatusWhatsAppBodyParameters,
  isCandidateStatusWhatsAppNotifiable,
  normalizeCandidateStatusKey,
  resolveCandidateStatusWhatsAppTemplate,
} from './whatsapp-templates';

describe('whatsapp-templates', () => {
  describe('normalizeCandidateStatusKey', () => {
    it('normalizes display labels to snake_case keys', () => {
      expect(normalizeCandidateStatusKey('Not Interested')).toBe('not_interested');
      expect(normalizeCandidateStatusKey('Call Back')).toBe('call_back');
      expect(normalizeCandidateStatusKey('interview_scheduled')).toBe(
        'interview_scheduled',
      );
    });
  });

  describe('resolveCandidateStatusWhatsAppTemplate', () => {
    it('maps all 15 candidate status templates', () => {
      const cases: Array<[string, string]> = [
        ['Interested', WHATSAPP_TEMPLATE_TYPES.HELLO_WORLD],
        ['Not Interested', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOT_INTERESTED],
        ['Not Eligible', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOT_ELIGIBLE],
        ['Call Back', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_CALLBACK],
        ['RNR', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_RNR],
        ['nominated', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOMINATED],
        ['interview', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_INTERVIEW],
        ['shortlisted', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_SHORTLISTED],
        ['interview_scheduled', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_SCHEDULED],
        ['interview_passed', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_PASSED],
        ['processing', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_PROCESSING],
        ['visa', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_VISA],
        ['ticket', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_TICKET],
        ['hired', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_HIRED],
        ['Deployed', WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_DEPLOYED],
      ];

      for (const [statusName, expectedTemplate] of cases) {
        expect(resolveCandidateStatusWhatsAppTemplate(statusName)).toBe(
          expectedTemplate,
        );
      }
    });

    it('returns null for unmapped statuses', () => {
      expect(resolveCandidateStatusWhatsAppTemplate('Qualified')).toBeNull();
      expect(resolveCandidateStatusWhatsAppTemplate('Future')).toBeNull();
    });
  });

  describe('isCandidateStatusWhatsAppNotifiable', () => {
    it('returns true only for mapped statuses', () => {
      expect(isCandidateStatusWhatsAppNotifiable('RNR')).toBe(true);
      expect(isCandidateStatusWhatsAppNotifiable('Untouched')).toBe(false);
    });
  });

  describe('buildCandidateStatusWhatsAppBodyParameters', () => {
    it('builds one-parameter body for not interested', () => {
      expect(
        buildCandidateStatusWhatsAppBodyParameters(
          WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOT_INTERESTED,
          { candidateName: 'Rajesh Kumar' },
        ),
      ).toEqual(['Rajesh']);
    });

    it('builds no-parameter body for hello_world (temp Interested)', () => {
      expect(
        buildCandidateStatusWhatsAppBodyParameters(
          WHATSAPP_TEMPLATE_TYPES.HELLO_WORLD,
          {
            candidateName: 'Rajesh Kumar',
            roleOrProjectName: 'Staff Nurse - UAE',
          },
        ),
      ).toEqual([]);
    });

    it('builds two-parameter body for nominated', () => {
      expect(
        buildCandidateStatusWhatsAppBodyParameters(
          WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_NOMINATED,
          {
            candidateName: 'Rajesh Kumar',
            roleOrProjectName: 'Staff Nurse - UAE',
          },
        ),
      ).toEqual(['Rajesh', 'Staff Nurse - UAE']);
    });

    it('builds three-parameter body for callback', () => {
      expect(
        buildCandidateStatusWhatsAppBodyParameters(
          WHATSAPP_TEMPLATE_TYPES.CANDIDATE_STATUS_CALLBACK,
          {
            candidateName: 'Rajesh Kumar',
            roleOrProjectName: 'Staff Nurse - UAE',
            additionalDetail: '10 Jul 2026, 3:00 PM IST',
          },
        ),
      ).toEqual(['Rajesh', 'Staff Nurse - UAE', '10 Jul 2026, 3:00 PM IST']);
    });
  });
});
