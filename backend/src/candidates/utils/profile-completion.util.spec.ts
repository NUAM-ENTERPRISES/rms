import { DOCUMENT_TYPE } from '../../common/constants/document-types';
import { computeCandidateProfileCompletion } from './profile-completion.util';

const ALL_PROFILE_DOC_TYPES = [
  DOCUMENT_TYPE.RESUME,
  DOCUMENT_TYPE.DEGREE_CERTIFICATE,
  DOCUMENT_TYPE.PASSPORT_PHOTO,
  DOCUMENT_TYPE.PASSPORT_COPY,
  DOCUMENT_TYPE.AADHAAR,
  DOCUMENT_TYPE.REGISTRATION_CERTIFICATE,
];

describe('computeCandidateProfileCompletion', () => {
  it('returns 100% when personal fields and all required doc types are present', () => {
    const result = computeCandidateProfileCompletion({
      email: 'a@b.com',
      mobileNumber: '123',
      dateOfBirth: '1990-01-01',
      documents: ALL_PROFILE_DOC_TYPES.map((docType) => ({ docType })),
    });
    expect(result.percent).toBe(100);
    expect(result.missing).toHaveLength(0);
    expect(result.requiredCount).toBe(9);
  });

  it('flags missing personal fields and documents', () => {
    const result = computeCandidateProfileCompletion({
      email: '',
      mobileNumber: undefined,
      dateOfBirth: null,
      documents: [{ docType: DOCUMENT_TYPE.RESUME }],
    });
    expect(result.missing.some((m) => m.type === 'personal')).toBe(true);
    expect(result.missing.some((m) => m.type === 'document')).toBe(true);
    expect(result.percent).toBeLessThan(100);
  });

  it('normalizes legacy doc type aliases like passport and degree', () => {
    const result = computeCandidateProfileCompletion({
      email: 'a@b.com',
      mobileNumber: '1',
      dateOfBirth: '1990-01-01',
      documents: [
        { docType: DOCUMENT_TYPE.RESUME },
        { docType: 'passport' },
        { docType: 'degree' },
        { docType: 'photo' },
        { docType: DOCUMENT_TYPE.AADHAAR },
        { docType: DOCUMENT_TYPE.REGISTRATION_CERTIFICATE },
      ],
    });
    expect(result.percent).toBe(100);
  });
});
