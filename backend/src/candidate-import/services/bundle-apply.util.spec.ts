import {
  filterApplyableSaveableSegments,
  filterConfirmedSaveableSegments,
  hasResumeRole,
  identityProfileUpdate,
  usablePassportExpiry,
} from './bundle-apply.util';
import { SEGMENT_STATUS } from '../constants/candidate-import.constants';

describe('bundle-apply.util', () => {
  describe('filterConfirmedSaveableSegments', () => {
    it('keeps only confirmed allow-listed types', () => {
      const kept = filterConfirmedSaveableSegments(
        [
          { status: SEGMENT_STATUS.CONFIRMED, docType: 'resume' },
          { status: SEGMENT_STATUS.CONFIRMED, docType: 'transcript' },
          { status: SEGMENT_STATUS.SUGGESTED, docType: 'passport_copy' },
          { status: SEGMENT_STATUS.CONFIRMED, docType: 'aadhaar' },
          { status: SEGMENT_STATUS.CONFIRMED, docType: 'other' },
        ],
        SEGMENT_STATUS.CONFIRMED,
      );

      expect(kept.map((segment) => segment.docType)).toEqual([
        'resume',
        'aadhaar',
      ]);
    });
  });

  describe('filterApplyableSaveableSegments', () => {
    it('saves suggested and confirmed allow-listed types, not skipped ones', () => {
      const kept = filterApplyableSaveableSegments([
        { status: SEGMENT_STATUS.CONFIRMED, docType: 'resume' },
        { status: SEGMENT_STATUS.SUGGESTED, docType: 'degree_certificate' },
        { status: SEGMENT_STATUS.SUGGESTED, docType: 'passport_photo' },
        { status: SEGMENT_STATUS.SUGGESTED, docType: 'passport_copy' },
        { status: SEGMENT_STATUS.REJECTED, docType: 'aadhaar' },
        { status: SEGMENT_STATUS.CONFIRMED, docType: 'transcript' },
      ]);

      expect(kept.map((segment) => segment.docType)).toEqual([
        'resume',
        'degree_certificate',
        'passport_photo',
        'passport_copy',
      ]);
    });
  });

  describe('usablePassportExpiry', () => {
    it('drops past and invalid dates so the passport file can still save', () => {
      expect(usablePassportExpiry('2019-01-01')).toBeNull();
      expect(usablePassportExpiry('not-a-date')).toBeNull();
      expect(usablePassportExpiry('2099-05-29')).toBe('2099-05-29');
    });
  });

  describe('identityProfileUpdate', () => {
    it('fills empty profile fields without overwriting existing ones', () => {
      const update = identityProfileUpdate(
        {
          dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
          email: null,
          passportNumber: 'P111',
        },
        {
          dateOfBirth: '1995-05-05',
          email: 'laya@example.com',
          passportNumber: 'P222',
          identityEdited: false,
        },
      );

      expect(update.dateOfBirth).toBeUndefined();
      expect(update.email).toBe('laya@example.com');
      expect(update.passportNumber).toBeUndefined();
    });

    it('overwrites existing values when the reviewer edited identity', () => {
      const update = identityProfileUpdate(
        {
          dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
          email: 'old@example.com',
          passportNumber: 'P111',
        },
        {
          dateOfBirth: '1995-05-05',
          email: 'laya@example.com',
          passportNumber: 'P222',
          identityEdited: true,
        },
      );

      expect(update.dateOfBirth?.toISOString()).toBe(
        '1995-05-05T00:00:00.000Z',
      );
      expect(update.email).toBe('laya@example.com');
      expect(update.passportNumber).toBe('P222');
    });
  });

  describe('hasResumeRole', () => {
    it('accepts catalog ids', () => {
      expect(
        hasResumeRole({ departmentId: 'd1', roleCatalogId: 'r1' }),
      ).toBe(true);
    });

    it('accepts proposed names when catalog ids are missing', () => {
      expect(
        hasResumeRole({
          departmentId: null,
          roleCatalogId: null,
          proposedDepartment: { name: 'ICU' },
          proposedRole: { label: 'Staff Nurse' },
        }),
      ).toBe(true);
    });

    it('rejects a missing department or role', () => {
      expect(
        hasResumeRole({
          departmentId: 'd1',
          roleCatalogId: null,
          proposedRole: { label: '' },
        }),
      ).toBe(false);
    });
  });
});
