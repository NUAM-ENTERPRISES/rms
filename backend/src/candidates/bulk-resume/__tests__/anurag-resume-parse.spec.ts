import { parseResumeText } from '../resume-field-parser';
import { matchEducationsToCatalog } from '../qualification-catalog-matcher';

const ANURAG_RESUME_SAMPLE = `
ANURAG P Full Stack Developer | React | Nextjs | Node js
+91 7510719747 anuragp212@gmail.com Kochi, Kerala
SUMMARY Full Stack Developer with 3 years of experience
EXPERIENCE Software Engineer infopark kochi, india Retyn 10/2025 - Present https://www.retyn.ai/ Worked on Proptyn CRM
Software Engineer infopark Kochi, India Rexav 12/2023 - 10/2025 https://rexavllp.com/ Built production web apps
Software Engineer Kochi, India Gofreelab Technologies 10/2022 - 12/2023 https://gofreelab.com/ Developed MERN apps
EDUCATION Bachelor of Science in Computer Science Konni, Kerala Mahatma Gandhi University 06/2019 - 04/2022
SKILLS React, Node.js, NestJS
`;

describe('Anurag-style resume parsing', () => {
  it('extracts education and three work experiences', () => {
    const parsed = parseResumeText(ANURAG_RESUME_SAMPLE);

    expect(parsed.email).toBe('anuragp212@gmail.com');
    expect(parsed.countryCode).toBe('+91');
    expect(parsed.mobileNumber).toBe('7510719747');

    expect(parsed.educations.length).toBeGreaterThan(0);
    expect(parsed.educations[0].rawDegree.toLowerCase()).toContain(
      'computer science',
    );
    expect(parsed.educations[0].graduationYear).toBe(2022);
    expect(parsed.educations[0].university?.toLowerCase()).toContain(
      'gandhi',
    );

    expect(parsed.workExperiences.length).toBe(3);
    expect(parsed.workExperiences[0].jobTitle.toLowerCase()).toContain(
      'software engineer',
    );
    expect(parsed.workExperiences[0].isCurrent).toBe(true);
    expect(parsed.workExperiences[0].companyName?.toLowerCase()).toContain(
      'retyn',
    );
    expect(parsed.workExperiences[1].companyName?.toLowerCase()).toContain(
      'rexav',
    );
    expect(parsed.workExperiences[2].companyName?.toLowerCase()).toContain(
      'gofreelab',
    );
  });

  it('matches BSc Computer Science to catalog', () => {
    const parsed = parseResumeText(ANURAG_RESUME_SAMPLE);
    const matched = matchEducationsToCatalog(parsed.educations, [
      {
        id: 'q-bsc-cs',
        name: 'Bachelor of Science in Computer Science (BSc Computer Science)',
        shortName: 'BSc Computer Science',
        field: 'Computer Science',
        aliases: ['Bachelor of Science in Computer Science', 'BSc CS'],
      },
      {
        id: 'q-btech',
        name: 'Bachelor of Technology - Computer Science (B.Tech CSE)',
        shortName: 'B.Tech CSE',
        field: 'Computer Science',
        aliases: [],
      },
    ]);

    expect(matched.length).toBe(1);
    expect(matched[0].qualificationId).toBe('q-bsc-cs');
    expect(matched[0].graduationYear).toBe(2022);
  });
});
