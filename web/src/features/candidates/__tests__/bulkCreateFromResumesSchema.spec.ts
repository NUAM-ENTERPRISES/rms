import {
  bulkCreateFromResumesSchema,
  bulkResumeReviewSchema,
  BULK_RESUME_MAX_FILES,
  BULK_RESUME_PARSE_PAGE_LIMIT,
} from '../bulkCreateFromResumesSchema';

describe('bulkCreateFromResumesSchema', () => {
  it('accepts default source', () => {
    const parsed = bulkCreateFromResumesSchema.parse({});
    expect(parsed.source).toBe('direct_application');
  });

  it('accepts an explicit source', () => {
    const parsed = bulkCreateFromResumesSchema.parse({
      source: 'referral',
    });
    expect(parsed.source).toBe('referral');
  });

  it('exposes a file cap constant', () => {
    expect(BULK_RESUME_MAX_FILES).toBe(25);
  });

  it('exposes parse page limit of 10', () => {
    expect(BULK_RESUME_PARSE_PAGE_LIMIT).toBe(10);
  });
});

describe('bulkResumeReviewSchema', () => {
  const baseDraft = {
    draftId: 'draft-1',
    fileName: 'resume.pdf',
    included: true,
    parseWarnings: ['No education detected'],
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya@example.com',
    countryCode: '+91',
    mobileNumber: '9876543210',
    educations: [] as Array<{ qualificationId?: string }>,
    workExperiences: [] as Array<{ jobTitle: string }>,
  };

  it('accepts included draft with phone and empty education', () => {
    const parsed = bulkResumeReviewSchema.parse({
      source: 'direct_application',
      drafts: [baseDraft],
    });
    expect(parsed.drafts[0].parseWarnings).toContain('No education detected');
    expect(parsed.drafts[0].educations).toEqual([]);
  });

  it('rejects included draft missing phone', () => {
    const result = bulkResumeReviewSchema.safeParse({
      source: 'direct_application',
      drafts: [
        {
          ...baseDraft,
          countryCode: '',
          mobileNumber: '',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('allows excluded draft without phone', () => {
    const parsed = bulkResumeReviewSchema.parse({
      source: 'direct_application',
      drafts: [
        {
          ...baseDraft,
          included: false,
          countryCode: undefined,
          mobileNumber: undefined,
        },
      ],
    });
    expect(parsed.drafts[0].included).toBe(false);
  });

  it('allows adding education rows with qualification', () => {
    const parsed = bulkResumeReviewSchema.parse({
      source: 'direct_application',
      drafts: [
        {
          ...baseDraft,
          educations: [
            {
              qualificationId: 'q-bsc',
              university: 'Calicut',
              graduationYear: 2018,
            },
          ],
          workExperiences: [
            {
              jobTitle: 'Staff Nurse',
              companyName: 'City Hospital',
              isCurrent: true,
            },
          ],
        },
      ],
    });
    expect(parsed.drafts[0].educations).toHaveLength(1);
    expect(parsed.drafts[0].workExperiences[0].jobTitle).toBe('Staff Nurse');
  });
});
