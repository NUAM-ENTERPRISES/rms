import { QualificationLevel } from '@prisma/client';
import { MergedPdfProfileExtractorService } from './merged-pdf-profile-extractor.service';

describe('MergedPdfProfileExtractorService.normalize', () => {
  const service = new MergedPdfProfileExtractorService(
    {} as never,
    {} as never,
  );

  const qualifications = [
    {
      id: 'q_bsc',
      name: 'Bachelor of Science in Nursing (BSc Nursing)',
      shortName: 'BSc Nursing',
      level: 'BACHELOR' as QualificationLevel,
      field: 'Nursing',
    },
    {
      id: 'q_pb_bsc',
      name: 'Post Basic Bachelor of Science in Nursing (Post Basic BSc Nursing)',
      shortName: 'Post Basic BSc Nursing',
      level: 'BACHELOR' as QualificationLevel,
      field: 'Nursing',
    },
    {
      id: 'q_hsc',
      name: 'Higher Secondary',
      shortName: 'HSC',
      level: 'CERTIFICATE' as QualificationLevel,
      field: 'General',
    },
    {
      id: 'q_sslc',
      name: 'SSLC',
      shortName: 'SSLC',
      level: 'CERTIFICATE' as QualificationLevel,
      field: 'General',
      aliases: [{ alias: 'Secondary School Leaving Certificate' }],
    },
  ];

  const departments = [
    { id: 'd_icu', name: 'icu', label: 'ICU' },
  ];

  const roles = [
    {
      id: 'r_staff',
      name: 'staff_nurse',
      label: 'Staff Nurse',
      roleDepartmentId: 'd_icu',
    },
  ];

  it('maps a matched qualification and keeps optional university and year', () => {
    const result = service.normalize(
      {
        qualifications: [
          {
            rawLabel: 'BSc Nursing',
            matchedQualificationId: 'q_bsc',
            university: 'Kerala University',
            graduationYear: 2022,
            notes: 'Class of 2022',
          },
        ],
        workExperiences: [],
      },
      qualifications,
      departments,
      roles,
      new Set(),
    );

    expect(result.qualifications).toHaveLength(1);
    expect(result.qualifications[0].qualificationId).toBe('q_bsc');
    expect(result.qualifications[0].university).toBe('Kerala University');
    expect(result.qualifications[0].graduationYear).toBe(2022);
    expect(result.qualifications[0].included).toBe(true);
  });

  it('proposes a new qualification when nothing in the catalog matches', () => {
    const result = service.normalize(
      {
        qualifications: [
          {
            rawLabel: 'GNM',
            proposedName: 'GNM',
            proposedLevel: 'DIPLOMA',
            proposedField: 'Nursing',
          },
        ],
        workExperiences: [],
      },
      qualifications,
      departments,
      roles,
      new Set(),
    );

    expect(result.qualifications[0].qualificationId).toBeNull();
    expect(result.qualifications[0].proposedNew).toEqual({
      name: 'GNM',
      level: 'DIPLOMA',
      field: 'Nursing',
      shortName: undefined,
    });
  });

  it('maps a printed school name onto the catalog short name instead of creating a new one', () => {
    const result = service.normalize(
      {
        qualifications: [
          {
            rawLabel: 'Higher Secondary Certificate',
            proposedName: 'Higher Secondary Certificate',
            proposedLevel: 'CERTIFICATE',
            proposedField: 'General',
          },
        ],
        workExperiences: [],
      },
      qualifications,
      departments,
      roles,
      new Set(),
    );

    expect(result.qualifications[0].qualificationId).toBe('q_hsc');
    expect(result.qualifications[0].proposedNew).toBeNull();
  });

  it('maps the resume wording onto BSc Nursing instead of Post Basic BSc Nursing', () => {
    const result = service.normalize(
      {
        qualifications: [
          {
            rawLabel: 'Bachelor of Science in Nursing',
            proposedName: 'Bachelor of Science in Nursing',
            proposedLevel: 'BACHELOR',
            proposedField: 'Nursing',
          },
        ],
        workExperiences: [],
      },
      qualifications,
      departments,
      roles,
      new Set(),
    );

    expect(result.qualifications[0].qualificationId).toBe('q_bsc');
    expect(result.qualifications[0].qualificationLabel).toBe('BSc Nursing');
    expect(result.qualifications[0].proposedNew).toBeNull();
  });

  it('proposes HSC and SSLC when those rows are missing from the catalog', () => {
    const withoutSchool = qualifications.filter(
      (row) => row.id !== 'q_hsc' && row.id !== 'q_sslc',
    );
    const result = service.normalize(
      {
        qualifications: service.suggestQualificationsFromText(
          'EDUCATION Bachelor of Science in Nursing Varadaraja College of Nursing Science , Tumkur 2019 - 2023 Higher Secondary Certificate PJMSGHSS Kandassankadavu 2017- 2019 Secondary School Leaving Certificate LFCGHS Olarikkara 2017',
        ),
        workExperiences: [],
      },
      withoutSchool,
      departments,
      roles,
      new Set(),
    );

    const labels = result.qualifications.map(
      (row) => row.qualificationLabel || row.proposedNew?.name,
    );
    expect(labels).toEqual([
      'BSc Nursing',
      'Higher Secondary Certificate',
      'Secondary School Leaving Certificate',
    ]);
    expect(result.qualifications[1].proposedNew?.level).toBe('CERTIFICATE');
    expect(result.qualifications[2].proposedNew?.level).toBe('CERTIFICATE');
  });

  it('fills school certificates Vertex omitted from resume education text', () => {
    const merged = service.mergeQualificationSuggestions(
      [
        {
          rawLabel: 'Bachelor of Science in Nursing',
          proposedName: 'BSc Nursing',
        },
      ],
      service.suggestQualificationsFromText(
        'Bachelor of Science in Nursing Higher Secondary Certificate Secondary School Leaving Certificate',
      ),
    );

    expect(merged.map((row) => row.rawLabel)).toEqual([
      'Bachelor of Science in Nursing',
      'Higher Secondary Certificate',
      'Secondary School Leaving Certificate',
    ]);
  });

  it('maps a long school name onto a catalog alias', () => {
    const result = service.normalize(
      {
        qualifications: [
          {
            rawLabel: 'Secondary School Leaving Certificate',
            proposedName: 'Secondary School Leaving Certificate',
            proposedLevel: 'CERTIFICATE',
          },
        ],
        workExperiences: [],
      },
      qualifications,
      departments,
      roles,
      new Set(),
    );

    expect(result.qualifications[0].qualificationId).toBe('q_sslc');
    expect(result.qualifications[0].proposedNew).toBeNull();
  });

  it('keeps a current role without an end date and links experience certs', () => {
    const result = service.normalize(
      {
        qualifications: [],
        workExperiences: [
          {
            departmentRaw: 'ICU',
            jobTitleRaw: 'Staff Nurse',
            matchedDepartmentId: 'd_icu',
            matchedRoleCatalogId: 'r_staff',
            companyName: 'Cloudnine',
            startDate: '2023-01-01',
            isCurrent: true,
            linkedSegmentIds: ['seg_exp_1', 'missing'],
          },
        ],
      },
      qualifications,
      departments,
      roles,
      new Set(['seg_exp_1']),
    );

    expect(result.workExperiences).toHaveLength(1);
    expect(result.workExperiences[0].isCurrent).toBe(true);
    expect(result.workExperiences[0].endDate).toBeNull();
    expect(result.workExperiences[0].linkedSegmentIds).toEqual(['seg_exp_1']);
    expect(result.workExperiences[0].roleCatalogId).toBe('r_staff');
  });

  it('extracts resume role and identity fields', () => {
    const result = service.normalize(
      {
        qualifications: [],
        workExperiences: [
          {
            departmentRaw: 'ICU',
            jobTitleRaw: 'Staff Nurse',
            matchedDepartmentId: 'd_icu',
            matchedRoleCatalogId: 'r_staff',
            startDate: '2023-01-01',
            isCurrent: true,
            linkedSegmentIds: ['seg_exp_1'],
          },
        ],
        resumeRole: {
          departmentRaw: 'ICU',
          jobTitleRaw: 'Staff Nurse',
          matchedDepartmentId: 'd_icu',
          matchedRoleCatalogId: 'r_staff',
        },
        identity: {
          dateOfBirth: '1998-04-12',
          email: 'laya@example.com',
          passportNumber: 'P1234567',
          passportExpiry: '2028-05-29',
        },
      },
      qualifications,
      departments,
      roles,
      new Set(['seg_exp_1']),
    );

    expect(result.resumeRole?.departmentId).toBe('d_icu');
    expect(result.resumeRole?.roleCatalogId).toBe('r_staff');
    expect(result.identity).toEqual({
      dateOfBirth: '1998-04-12',
      email: 'laya@example.com',
      passportNumber: 'P1234567',
      passportExpiry: '2028-05-29',
      identityEdited: false,
    });
  });

  it('falls back to the first job when resumeRole is omitted', () => {
    const result = service.normalize(
      {
        qualifications: [],
        workExperiences: [
          {
            departmentRaw: 'ICU',
            jobTitleRaw: 'Staff Nurse',
            matchedDepartmentId: 'd_icu',
            matchedRoleCatalogId: 'r_staff',
            startDate: '2023-01-01',
            isCurrent: true,
          },
        ],
      },
      qualifications,
      departments,
      roles,
      new Set(),
    );

    expect(result.resumeRole?.departmentId).toBe('d_icu');
    expect(result.resumeRole?.roleCatalogId).toBe('r_staff');
  });

  it('drops an invalid email from identity', () => {
    const result = service.normalize(
      {
        qualifications: [],
        workExperiences: [],
        identity: { email: 'not-an-email', dateOfBirth: '1990-01-01' },
      },
      qualifications,
      departments,
      roles,
      new Set(),
    );

    expect(result.identity?.email).toBeNull();
    expect(result.identity?.dateOfBirth).toBe('1990-01-01');
  });

  it('fills a missing passport number from labeled page text', () => {
    const merged = service.mergeIdentityFromText(null, {
      documentNumber: 'Y4403682',
      expiryDate: '2028-05-29',
    });

    expect(merged).toEqual({
      passportNumber: 'Y4403682',
      passportExpiry: '2028-05-29',
    });
  });

  it('drops a past job that is missing an end date', () => {
    const result = service.normalize(
      {
        qualifications: [],
        workExperiences: [
          {
            departmentRaw: 'ICU',
            jobTitleRaw: 'Staff Nurse',
            matchedDepartmentId: 'd_icu',
            matchedRoleCatalogId: 'r_staff',
            startDate: '2020-01-01',
            isCurrent: false,
          },
        ],
      },
      qualifications,
      departments,
      roles,
      new Set(),
    );

    expect(result.workExperiences).toHaveLength(0);
  });
});
