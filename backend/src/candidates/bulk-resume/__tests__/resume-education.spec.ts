import { parseResumeText } from '../resume-field-parser';
import { matchEducationsToCatalog } from '../qualification-catalog-matcher';

describe('parseResumeText education', () => {
  it('extracts education degree, university, and year', () => {
    const text = `
      Name: Priya Sharma
      Email: priya.sharma@example.com
      Phone: +91 98765 43210
      Education
      BSc Nursing
      University of Calicut
      2018
      Experience
      Staff Nurse at City Hospital
    `;

    const result = parseResumeText(text);
    expect(result.educations.length).toBeGreaterThan(0);
    expect(result.educations[0].rawDegree.toLowerCase()).toContain('nursing');
    expect(result.educations[0].university?.toLowerCase()).toContain(
      'university',
    );
    expect(result.educations[0].graduationYear).toBe(2018);
  });

  it('extracts GNM diploma from education section', () => {
    const text = `
      Name: Anitha R
      Mobile: 9123456789
      Educational Qualification
      GNM from Kerala Nursing College 2015
      Work Experience
      Nurse
    `;

    const result = parseResumeText(text);
    expect(
      result.educations.some((e) => /gnm/i.test(e.rawDegree)),
    ).toBe(true);
  });
});

describe('matchEducationsToCatalog', () => {
  const catalog = [
    {
      id: 'q-bsc-n',
      name: 'Bachelor of Science in Nursing (BSc Nursing)',
      shortName: 'BSc Nursing',
      aliases: ['Bachelor of Nursing', 'B.Sc Nursing'],
    },
    {
      id: 'q-gnm',
      name: 'General Nursing and Midwifery (GNM)',
      shortName: 'GNM',
      aliases: ['General Nursing Midwifery'],
    },
  ];

  it('matches BSc Nursing phrase to catalog', () => {
    const matched = matchEducationsToCatalog(
      [
        {
          rawDegree: 'BSc Nursing',
          university: 'University of Calicut',
          graduationYear: 2018,
        },
      ],
      catalog,
    );

    expect(matched).toHaveLength(1);
    expect(matched[0].qualificationId).toBe('q-bsc-n');
    expect(matched[0].university).toBe('University of Calicut');
    expect(matched[0].graduationYear).toBe(2018);
  });

  it('skips unmatched degrees', () => {
    const matched = matchEducationsToCatalog(
      [{ rawDegree: 'Certificate in Basket Weaving' }],
      catalog,
    );
    expect(matched).toHaveLength(0);
  });
});
