import {
  isRecruiterRoleName,
  ROLE_NAMES,
  userHasAnyRole,
} from '../role-ids';

describe('isRecruiterRoleName', () => {
  it('matches Recruiter and Recruitment Executive', () => {
    expect(isRecruiterRoleName('Recruiter')).toBe(true);
    expect(isRecruiterRoleName('Recruitment Executive')).toBe(true);
    expect(isRecruiterRoleName('recruitment executive')).toBe(true);
  });

  it('does not match other roles', () => {
    expect(isRecruiterRoleName('Manager')).toBe(false);
    expect(isRecruiterRoleName('Recruitment Team Lead')).toBe(false);
    expect(isRecruiterRoleName('Recruitment Lead')).toBe(false);
  });
});

describe('leadership role aliases', () => {
  it('treats Recruiter Manager and Recruitment Team Lead as Recruitment Lead', () => {
    expect(
      userHasAnyRole(['Recruiter Manager'], [ROLE_NAMES.RECRUITMENT_LEAD]),
    ).toBe(true);
    expect(
      userHasAnyRole(['Recruitment Team Lead'], [ROLE_NAMES.RECRUITMENT_LEAD]),
    ).toBe(true);
  });

  it('treats Processing Manager and Processing Team Lead as Processing Lead', () => {
    expect(
      userHasAnyRole(['Processing Manager'], [ROLE_NAMES.PROCESSING_LEAD]),
    ).toBe(true);
    expect(
      userHasAnyRole(['Processing Team Lead'], [ROLE_NAMES.PROCESSING_LEAD]),
    ).toBe(true);
  });
});
