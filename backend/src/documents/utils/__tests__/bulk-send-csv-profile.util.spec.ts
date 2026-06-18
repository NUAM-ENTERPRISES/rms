import { mapCandidateProjectToBulkSendCsvProfile } from '../bulk-send-csv-profile.util';

describe('mapCandidateProjectToBulkSendCsvProfile', () => {
  const baseCandidateProject = {
    id: 'cpm-1',
    projectId: 'proj-1',
    recruiter: { name: 'Recruiter One' },
    roleNeeded: {
      roleCatalog: {
        roleDepartment: { label: 'Nursing' },
      },
    },
    candidate: {
      firstName: 'Jane',
      lastName: 'Doe',
      passportNumber: 'P1234567',
      gender: 'FEMALE',
      dateOfBirth: new Date('1995-06-15'),
      height: 165,
      weight: 60,
      dataFlow: true,
      licensingExam: 'Prometric Passed',
      totalExperience: 5,
      graduationYear: 2018,
      email: 'jane@example.com',
      countryCode: '+966',
      mobileNumber: '501234567',
      address: 'Riyadh',
      addressState: { name: 'Riyadh Region' },
      addressCountry: { name: 'Saudi Arabia' },
      religion: { id: 'rel-1', name: 'Islam' },
      eligibilityNumber: 'CAND-ELIG-1',
      qualifications: [
        {
          qualification: { name: 'BSc Nursing', shortName: 'BSc' },
          university: 'King Saud University',
        },
      ],
      workExperiences: [
        {
          startDate: '2020-01-01',
          endDate: '2022-01-01',
          countryCode: 'SA',
        },
        {
          startDate: '2018-01-01',
          endDate: '2020-01-01',
          countryCode: 'IN',
        },
      ],
      documents: [
        {
          docType: 'scfhs',
          documentNumber: 'SCFHS-99',
          expiryDate: new Date('2027-01-01'),
          verifiedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          status: 'verified',
          isDeleted: false,
        },
      ],
      processingTasks: [
        {
          projectId: 'proj-1',
          processingSteps: [
            {
              template: { key: 'eligibility' },
              eligibilityNumber: 'ELIG-1',
              eligibilityValidAt: new Date('2026-12-31'),
            },
          ],
        },
      ],
    },
  };

  it('maps mandatory and optional profile fields', () => {
    const profile = mapCandidateProjectToBulkSendCsvProfile(baseCandidateProject);

    expect(profile.candidateProjectMapId).toBe('cpm-1');
    expect(profile.fullName).toBe('Jane Doe');
    expect(profile.passportNumber).toBe('P1234567');
    expect(profile.qualifications).toContain('BSc');
    expect(profile.department).toBe('Nursing');
    expect(profile.totalYearsExperience).toBe('5');
    expect(profile.dataFlow).toBe('Yes');
    expect(profile.prometric).toBe('Prometric Passed');
    expect(profile.recruiterName).toBe('Recruiter One');
    expect(profile.gccExperience).toBe('2');
    expect(profile.indianExperience).toBe('2');
    expect(profile.saudiLicense).toBe('SCFHS-99');
    expect(profile.eligibilityNumber).toBe('CAND-ELIG-1');
    expect(profile.religion).toBe('Islam');
    expect(profile.emailId).toBe('jane@example.com');
    expect(profile.nationality).toBe('Saudi Arabia');
    expect(profile.mumarisId).toBe('');
  });

  it('filters processing steps to the current project', () => {
    const profile = mapCandidateProjectToBulkSendCsvProfile({
      ...baseCandidateProject,
      candidate: {
        ...baseCandidateProject.candidate,
        eligibilityNumber: undefined,
        processingTasks: [
          {
            projectId: 'other-project',
            processingSteps: [
              {
                template: { key: 'eligibility' },
                eligibilityNumber: 'WRONG',
              },
            ],
          },
        ],
      },
    });

    expect(profile.eligibilityNumber).toBe('');
  });

  it('falls back to addressCountryCode when address country name is missing', () => {
    const profile = mapCandidateProjectToBulkSendCsvProfile({
      ...baseCandidateProject,
      candidate: {
        ...baseCandidateProject.candidate,
        addressCountry: null,
        addressCountryCode: 'IN',
      },
    });

    expect(profile.nationality).toBe('IN');
  });

  it('prefers candidate eligibility expiry over processing step and document', () => {
    const profile = mapCandidateProjectToBulkSendCsvProfile({
      ...baseCandidateProject,
      candidate: {
        ...baseCandidateProject.candidate,
        eligibilityExpiryAt: new Date('2028-06-01'),
        documents: [
          ...(baseCandidateProject.candidate.documents ?? []),
          {
            docType: 'eligibility_letter',
            documentNumber: 'DOC-ELIG-9',
            expiryDate: new Date('2029-01-01'),
            status: 'verified',
            isDeleted: false,
          },
        ],
      },
    });

    expect(profile.eligibilityExpiryDate).toBe('01 Jun 2028');
  });

  it('falls back to eligibility letter document number when candidate number is missing', () => {
    const profile = mapCandidateProjectToBulkSendCsvProfile({
      ...baseCandidateProject,
      candidate: {
        ...baseCandidateProject.candidate,
        eligibilityNumber: undefined,
        documents: [
          ...(baseCandidateProject.candidate.documents ?? []),
          {
            docType: 'eligibility_letter',
            documentNumber: 'DOC-ELIG-9',
            expiryDate: new Date('2029-01-01'),
            status: 'verified',
            isDeleted: false,
          },
        ],
        processingTasks: [],
      },
    });

    expect(profile.eligibilityNumber).toBe('DOC-ELIG-9');
    expect(profile.eligibilityExpiryDate).toBe('01 Jan 2029');
  });
});
