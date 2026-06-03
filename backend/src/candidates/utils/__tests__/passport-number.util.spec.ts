import {
  normalizePassportNumber,
  passportNumbersMatch,
  resolvePassportNumberForCandidate,
  syncCandidatePassportNumberFromDocument,
} from '../passport-number.util';

describe('passport-number.util', () => {
  describe('normalizePassportNumber', () => {
    it('trims and collapses spaces', () => {
      expect(normalizePassportNumber('  A12  345  ')).toBe('A12 345');
    });

    it('returns null for empty input', () => {
      expect(normalizePassportNumber('')).toBeNull();
      expect(normalizePassportNumber('   ')).toBeNull();
    });
  });

  describe('resolvePassportNumberForCandidate', () => {
    it('prefers candidate.passportNumber over documents', () => {
      expect(
        resolvePassportNumberForCandidate({
          passportNumber: 'P123',
          documents: [{ docType: 'passport', documentNumber: 'DOC999' }],
        }),
      ).toBe('P123');
    });

    it('falls back to passport document number when field is empty', () => {
      expect(
        resolvePassportNumberForCandidate({
          passportNumber: null,
          documents: [{ docType: 'passport', documentNumber: 'DOC999' }],
        }),
      ).toBe('DOC999');
    });

    it('returns null when neither field nor passport doc exists', () => {
      expect(
        resolvePassportNumberForCandidate({
          passportNumber: null,
          documents: [{ docType: 'resume', documentNumber: 'X' }],
        }),
      ).toBeNull();
    });
  });

  describe('syncCandidatePassportNumberFromDocument', () => {
    it('updates candidate when passport doc has documentNumber', async () => {
      const update = jest.fn().mockResolvedValue({});
      const db = { candidate: { update } } as any;

      await syncCandidatePassportNumberFromDocument(
        db,
        'cand-1',
        'passport_copy',
        '  AB123  ',
      );

      expect(update).toHaveBeenCalledWith({
        where: { id: 'cand-1' },
        data: { passportNumber: 'AB123' },
      });
    });

    it('skips non-passport doc types', async () => {
      const update = jest.fn();
      const db = { candidate: { update } } as any;

      await syncCandidatePassportNumberFromDocument(
        db,
        'cand-1',
        'resume',
        'AB123',
      );

      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('passportNumbersMatch', () => {
    it('compares case-insensitively', () => {
      expect(passportNumbersMatch('ab123', 'AB123')).toBe(true);
    });

    it('returns false when either side is empty', () => {
      expect(passportNumbersMatch('', 'AB123')).toBe(false);
    });
  });
});
