import { isRecruiterRoleName } from '../role-ids';

describe('isRecruiterRoleName', () => {
  it('matches Recruiter and Recruitment Executive', () => {
    expect(isRecruiterRoleName('Recruiter')).toBe(true);
    expect(isRecruiterRoleName('Recruitment Executive')).toBe(true);
    expect(isRecruiterRoleName('recruitment executive')).toBe(true);
  });

  it('does not match other roles', () => {
    expect(isRecruiterRoleName('Manager')).toBe(false);
    expect(isRecruiterRoleName('Recruitment Team Lead')).toBe(false);
  });
});
