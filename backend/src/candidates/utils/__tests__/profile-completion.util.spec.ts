import {
  computeCandidateProfileCompletion,
  CANDIDATE_PROFILE_REQUIRED_DOCUMENTS,
  withProfileCompletion,
} from '../profile-completion.util';

describe('computeCandidateProfileCompletion', () => {
  it('returns 100% when all personal fields and required documents exist (with aliases)', () => {
    const result = computeCandidateProfileCompletion(
      {
        email: 'a@b.com',
        countryCode: '+91',
        mobileNumber: '9000000000',
        dateOfBirth: new Date('1990-01-01'),
      },
      [
        { docType: 'cv' },
        { docType: 'degree_certificate' },
        { docType: 'photo' },
        { docType: 'passport_copy' },
        { docType: 'aadhaar' },
        { docType: 'registration_certificate' },
      ],
    );
    expect(result.percent).toBe(100);
    expect(result.requiredCount).toBe(
      3 + CANDIDATE_PROFILE_REQUIRED_DOCUMENTS.length,
    );
    expect(result.missing).toHaveLength(0);
  });

  it('flags missing personal fields and documents', () => {
    const result = computeCandidateProfileCompletion(
      {
        email: null,
        countryCode: '',
        mobileNumber: '1',
        dateOfBirth: null,
      },
      [],
    );
    expect(result.percent).toBe(0);
    expect(result.missing.some((m) => m.kind === 'personal' && m.key === 'email')).toBe(
      true,
    );
    expect(
      result.missing.some((m) => m.kind === 'document' && m.key === 'resume'),
    ).toBe(true);
    expect(result.breakdown.personal.completed).toBe(0);
    expect(result.breakdown.documents.completed).toBe(0);
  });

  it('withProfileCompletion strips documents from output', () => {
    const merged = withProfileCompletion({
      id: '1',
      email: 'x@y.z',
      countryCode: '+1',
      mobileNumber: '2',
      dateOfBirth: new Date(),
      documents: [{ docType: 'resume' }],
    } as any);
    expect((merged as any).documents).toBeUndefined();
    expect(merged.profileCompletion.percent).toBeLessThan(100);
  });
});
