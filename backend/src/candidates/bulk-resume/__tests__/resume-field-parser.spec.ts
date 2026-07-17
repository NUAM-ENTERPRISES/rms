import { parseResumeText } from '../resume-field-parser';

describe('parseResumeText', () => {
  it('extracts name, email, and Indian phone from labeled resume text', () => {
    const text = `
      Name: Priya Sharma
      Email: priya.sharma@example.com
      Phone: +91 98765 43210
      Passport No: A1234567
      Date of Birth: 15/08/1992
      Address: Kochi, Kerala, India
      Experience
      Staff Nurse at City Hospital
    `;

    const result = parseResumeText(text);

    expect(result.firstName).toBe('Priya');
    expect(result.lastName).toBe('Sharma');
    expect(result.email).toBe('priya.sharma@example.com');
    expect(result.countryCode).toBe('+91');
    expect(result.mobileNumber).toBe('9876543210');
    expect(result.passportNumber).toBe('A1234567');
    expect(result.dateOfBirth).toBe('1992-08-15');
    expect(result.address).toContain('Kochi');
  });

  it('defaults 10-digit local Indian mobile to +91', () => {
    const text = `
      Rahul Menon
      rahul@example.com
      Mobile: 9123456789
    `;

    const result = parseResumeText(text);
    expect(result.countryCode).toBe('+91');
    expect(result.mobileNumber).toBe('9123456789');
    expect(result.firstName).toBe('Rahul');
    expect(result.lastName).toBe('Menon');
  });

  it('returns name/email without phone when phone is missing', () => {
    const text = `
      Name: Anitha R
      Email: anitha@example.com
      Skills: Nursing, ICU
    `;

    const result = parseResumeText(text);
    expect(result.firstName).toBe('Anitha');
    expect(result.email).toBe('anitha@example.com');
    expect(result.countryCode).toBeUndefined();
    expect(result.mobileNumber).toBeUndefined();
  });

  it('handles empty / tiny text without throwing', () => {
    const result = parseResumeText('   ');
    expect(result.firstName).toBe('Unknown');
    expect(result.lastName).toBe('Candidate');
  });

  it('strips null bytes from resume text', () => {
    const text = `Name: Priya\u0000 Sharma
      Email: priya@example.com
      Phone: +91 9876543210
      Education
      BSc Nursing\u0000
      University of Calicut 2018
    `;
    const result = parseResumeText(text);
    expect(result.firstName).toBe('Priya');
    expect(JSON.stringify(result).includes('\u0000')).toBe(false);
  });

  it('parses named month and year ranges under Career / Academic headers', () => {
    const text = `
      Name: Alex Kumar
      Email: alex@example.com
      Phone: +91 9876543210
      Career
      Software Engineer Acme Corp Jan 2020 – Present
      Built APIs
      Academic
      Bachelor of Science in Computer Science University of Kerala 2019-2022
    `;
    const result = parseResumeText(text);
    expect(result.workExperiences.length).toBeGreaterThanOrEqual(1);
    expect(result.workExperiences[0].isCurrent).toBe(true);
    expect(result.workExperiences[0].startDate).toBe('2020-01-01');
    expect(result.educations.length).toBeGreaterThanOrEqual(1);
  });

  it('parses MM-YYYY to MM-YYYY date ranges', () => {
    const text = `
      EXPERIENCE
      Staff Nurse City Hospital 01-2020 to 06-2022
      EDUCATION
      BSc Nursing University of Calicut 06/2016 - 04/2019
    `;
    const result = parseResumeText(text);
    expect(result.workExperiences[0]?.startDate).toBe('2020-01-01');
    expect(result.workExperiences[0]?.endDate).toBe('2022-06-01');
    expect(result.educations[0]?.graduationYear).toBe(2019);
  });
});
