export type ParsedEducationEntry = {
  rawDegree: string;
  university?: string;
  graduationYear?: number;
  notes?: string;
};

export type ParsedWorkExperienceEntry = {
  jobTitle: string;
  companyName?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
};

export type ParsedResumeFields = {
  firstName: string;
  lastName: string;
  /** high = labeled/header/scored line; low = email fallback or Unknown */
  nameConfidence: 'high' | 'low';
  email?: string;
  countryCode?: string;
  mobileNumber?: string;
  passportNumber?: string;
  dateOfBirth?: string;
  address?: string;
  educations: ParsedEducationEntry[];
  workExperiences: ParsedWorkExperienceEntry[];
};

const DIAL_CODES = [
  '+971', '+966', '+974', '+968', '+965', '+973', '+880', '+977', '+960',
  '+994', '+993', '+992', '+998', '+234', '+254', '+233', '+212', '+213',
  '+216', '+218', '+249', '+251', '+255', '+256', '+260', '+263', '+353',
  '+358', '+420', '+421', '+351', '+352', '+354', '+356', '+357', '+359',
  '+380', '+381', '+385', '+386', '+387', '+389', '+370', '+371', '+372',
  '+373', '+374', '+375', '+376', '+377', '+378', '+382', '+383', '+91',
  '+92', '+93', '+94', '+95', '+98', '+60', '+61', '+62', '+63', '+64',
  '+65', '+66', '+81', '+82', '+84', '+86', '+90', '+44', '+49', '+33',
  '+34', '+39', '+31', '+32', '+41', '+43', '+45', '+46', '+47', '+48',
  '+20', '+27', '+7', '+1',
].sort((a, b) => b.length - a.length);

const EMAIL_RE =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

const PHONE_RE =
  /(?:(?:\+|00)\d{1,4}[\s\-.]*)?(?:\(?\d{2,5}\)?[\s\-.]*)?\d{3,5}[\s\-.]?\d{3,6}(?:[\s\-.]?\d{1,5})?/g;

const PASSPORT_LABEL_RE =
  /(?:passport(?:\s*(?:no|number|#|num))?)\s*[:\-]?\s*([A-Z0-9]{6,12})/i;

const PASSPORT_LOOSE_RE = /\b([A-Z]{1,2}\d{6,9})\b/;

const DOB_LABEL_RE =
  /(?:date\s*of\s*birth|d\.?o\.?b\.?|born)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/i;

const NAME_LABEL_RE =
  /(?:(?:full\s*)?name|candidate\s*name)\s*[:\-]?\s*([A-Za-z][A-Za-z .'-]{1,60})/i;

const ADDRESS_LABEL_RE =
  /(?:address|location|reside[sd]?)\s*[:\-]\s*([^\n]{8,120})/i;

const SKIP_NAME_LINE_RE =
  /^(resume|curriculum|cv|email|phone|mobile|tel|address|objective|summary|profile|experience|education|skills|contact|full\s+stack|career\s+objective|linkedin|github|internships?|projects?|technical\s+skills|soft\s+skills|certifications?|achievements?|languages?|tools|technologies|coursework|cgpa|references?)/i;

/** Lone tokens that are never a person name */
const REJECT_NAME_TOKEN_RE =
  /^(engineering|engineer|software|developer|intern|internship|education|experience|university|college|institute|computer|science|objective|summary|profile|skills|projects?|training|workshop|courses?|professional|candidate|unknown|data|python|javascript|html|css|java|mysql|linux|github|linkedin)$/i;

const MONTH_NAME =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

/** Matches day+Mon+YYYY, MM/YYYY, Mon YYYY, YYYY-MM, MM-YYYY, YYYY */
const DATE_TOKEN =
  `(?:\\d{1,2}\\s+${MONTH_NAME}\\s+\\d{4}|\\d{1,2}\\/\\d{4}|${MONTH_NAME}\\s+\\d{4}|\\d{4}-\\d{1,2}|\\d{1,2}-\\d{4}|\\d{4})`;

const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:[-–—]|to)\\s*(Present|present|CURRENT|Current|current|Till\\s+Date|till\\s+date|${DATE_TOKEN})`,
  'g',
);

/** Single month-year (e.g. "July 2025") for short internships without an end date */
const SINGLE_MONTH_YEAR_RE = new RegExp(
  `\\b(${MONTH_NAME}\\s+\\d{4})\\b`,
  'gi',
);

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const DEGREE_PHRASE_RE =
  /\b(?:post\s*basic\s*b\.?\s*sc\.?\s*(?:nursing|n)|b\.?\s*sc\.?\s*(?:nursing|n|computer\s+science|cs|mlt|rt|him)|m\.?\s*sc\.?\s*(?:nursing|n|computer\s+science)|bachelor\s+of\s+science\s+in\s+[a-z][a-z\s]{2,40}|master\s+of\s+science\s+in\s+[a-z][a-z\s]{2,40}|bachelor\s+of\s+technology(?:\s*[-–]?\s*(?:computer\s+science(?:\s+and\s+engineering)?|information\s+technology|cse|it))?|master\s+of\s+technology(?:\s*[-–]?\s*(?:computer\s+science(?:\s+and\s+engineering)?|cse))?|b\.?\s*tech\.?(?:\s+in)?\s+computer\s+science(?:\s+and\s+engineering)?|btech(?:\s+in)?\s+computer\s+science(?:\s+and\s+engineering)?|bachelor\s+of\s+computer\s+applications|master\s+of\s+computer\s+applications|general\s+nursing\s+(?:and|&)\s+midwifery|b\.?\s*pharm\.?|m\.?\s*pharm\.?|bachelor\s+of\s+pharmacy|master\s+of\s+pharmacy|bachelor\s+of\s+physiotherapy|b\.?\s*tech\.?(?:\s*\(?\s*cse\s*\)?)?|m\.?\s*tech\.?|bca|mca|mbbs|bds|mds|bams|bhms|bnys|md|ms|dm|mch|gnm|anm|phd|ph\.?\s*d\.?|diploma\s+in\s+[a-z][a-z\s/&-]{2,40}|bachelor\s+of\s+[a-z][a-z\s]{2,40}|master\s+of\s+[a-z][a-z\s]{2,40}|b\.?\s*sc\.?|m\.?\s*sc\.?)\b/gi;

const UNIVERSITY_RE =
  /\b((?:Mahatma\s+Gandhi|MG)\s+University|University\s+of\s+[A-Z][A-Za-z\s&.,'-]{2,50}|[A-Z][A-Za-z.&'-]+(?:\s+[A-Z][A-Za-z.&'-]+){0,6}\s+(?:University|College|Institute))\b/;

const JOB_TITLE_RE =
  /\b((?:IOT Training|Python Training|Data Science|Registered Nurse|Staff Nurse|Charge Nurse|Nursing Officer|Intern)|(?:Senior|Junior|Lead|Staff|Associate|Assistant|Principal)?\s*(?:Software|Full[\s-]?Stack|Backend|Frontend|Front[\s-]?End|Web|Mobile|DevOps|Data|Machine Learning|ML|AI|IOT|IoT|Python)?\s*(?:Engineer|Developer|Programmer|Architect|Analyst|Consultant|Intern|Nurse|Doctor|Therapist|Technician|Coordinator|Manager|Executive|Specialist|Officer|Training))\b/gi;

const LOCATION_NOISE_RE =
  /\b(?:infopark|technopark|cyberpark|kochi|cochin|kerala|india|uae|dubai|abu\s+dhabi|saudi|riyadh|qatar|doha|remote|onsite)\b/gi;

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function extractEmail(text: string): string | undefined {
  const match = text.match(EMAIL_RE);
  return match?.[0]?.toLowerCase();
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function splitPhone(
  raw: string,
): { countryCode: string; mobileNumber: string } | undefined {
  let cleaned = raw.trim();
  if (cleaned.startsWith('00')) cleaned = `+${cleaned.slice(2)}`;
  const hasPlus = cleaned.startsWith('+');
  const digitBlob = digitsOnly(cleaned);
  if (digitBlob.length < 8 || digitBlob.length > 15) return undefined;

  if (hasPlus || cleaned.startsWith('00')) {
    const withPlus = `+${digitBlob}`;
    for (const code of DIAL_CODES) {
      if (withPlus.startsWith(code)) {
        const national = withPlus.slice(code.length);
        if (national.length >= 6 && national.length <= 15) {
          return { countryCode: code, mobileNumber: national };
        }
      }
    }
  }
  if (digitBlob.length === 10 && /^[6-9]/.test(digitBlob)) {
    return { countryCode: '+91', mobileNumber: digitBlob };
  }
  if (digitBlob.length === 9 && digitBlob.startsWith('5')) {
    return { countryCode: '+971', mobileNumber: digitBlob };
  }
  return undefined;
}

function extractPhone(
  text: string,
): { countryCode: string; mobileNumber: string } | undefined {
  const candidates = text.match(PHONE_RE) ?? [];
  for (const candidate of candidates) {
    if (digitsOnly(candidate).length < 8) continue;
    const parsed = splitPhone(candidate);
    if (parsed) return parsed;
  }
  return undefined;
}

function extractPassport(text: string): string | undefined {
  const labeled = text.match(PASSPORT_LABEL_RE);
  if (labeled?.[1]) return labeled[1].toUpperCase();
  const loose = text.match(PASSPORT_LOOSE_RE);
  return loose?.[1]?.toUpperCase();
}

function parseDobToIso(raw: string): string | undefined {
  const parts = raw.split(/[\/\-.]/).map((p) => p.trim());
  if (parts.length !== 3) return undefined;
  let year: number;
  let month: number;
  let day: number;
  if (parts[0].length === 4) {
    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2]);
  } else {
    day = Number(parts[0]);
    month = Number(parts[1]);
    year = Number(parts[2]);
    if (year < 100) year += year > 30 ? 1900 : 2000;
  }
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return undefined;
  }
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date >= new Date()) return undefined;
  return iso;
}

function extractDateOfBirth(text: string): string | undefined {
  const match = text.match(DOB_LABEL_RE);
  if (!match?.[1]) return undefined;
  return parseDobToIso(match[1]);
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const cleaned = fullName
    .replace(/[^A-Za-z .'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length === 0) return { firstName: 'Unknown', lastName: 'Candidate' };
  if (tokens.length === 1) return { firstName: tokens[0], lastName: tokens[0] };
  return { firstName: tokens[0], lastName: tokens.slice(1).join(' ') };
}

function isLikelyNameToken(token: string): boolean {
  if (!token) return false;
  if (REJECT_NAME_TOKEN_RE.test(token)) return false;
  // Initials like M, A, M.
  if (/^[A-Za-z]\.?$/.test(token)) return true;
  if (token.length < 2) return false;
  return /^[A-Za-z][A-Za-z'.-]*$/.test(token);
}

function scoreNameLine(line: string): number {
  const cleaned = line
    .replace(/[^A-Za-z .'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 60) return -1;
  if (SKIP_NAME_LINE_RE.test(cleaned)) return -1;
  if (EMAIL_RE.test(line)) return -1;
  if (digitsOnly(line).length >= 8 && PHONE_RE.test(line)) return -1;
  if (/https?:\/\//i.test(line) || /linkedin\.com|github\.com/i.test(line)) {
    return -1;
  }

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length < 1 || tokens.length > 5) return -1;
  if (!tokens.every(isLikelyNameToken)) return -1;
  if (tokens.length === 1 && REJECT_NAME_TOKEN_RE.test(tokens[0])) return -1;
  // Prefer 2–4 tokens (first + last, optionally middle initials)
  if (tokens.length === 1) return 1;
  if (tokens.length >= 2 && tokens.length <= 4) return 10 + tokens.length;
  return 5;
}

function extractName(
  text: string,
  email?: string,
): {
  firstName: string;
  lastName: string;
  nameConfidence: 'high' | 'low';
} {
  const labeled = text.match(NAME_LABEL_RE);
  if (labeled?.[1]) {
    const name = splitName(labeled[1]);
    if (name.firstName !== 'Unknown') {
      return { ...name, nameConfidence: 'high' };
    }
  }

  // Prefer leading "FIRST LAST Title |" style headers (common resume top line)
  const header = text.split(/\n/)[0] ?? text.slice(0, 120);
  const headerName = header.match(
    /^([A-Z][A-Za-z]+(?:\s+[A-Z](?:\.|[A-Za-z]{0,20})){0,3})\s+(?:Full\s+Stack|Software|Developer|Engineer|Nurse|Doctor|\|)/,
  );
  if (headerName?.[1] && headerName[1].split(/\s+/).length <= 4) {
    return { ...splitName(headerName[1]), nameConfidence: 'high' };
  }

  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let best: { line: string; score: number } | null = null;
  for (const [idx, line] of lines.slice(0, 12).entries()) {
    const score = scoreNameLine(line);
    if (score < 0) continue;
    // Prefer earlier lines slightly
    const ranked = score + Math.max(0, 5 - idx);
    if (!best || ranked > best.score) {
      best = { line, score: ranked };
    }
  }

  if (best && best.score >= 10) {
    return { ...splitName(best.line), nameConfidence: 'high' };
  }
  // Accept weaker multi-token early lines (e.g. "Anjana M A")
  if (best && best.score >= 6) {
    return { ...splitName(best.line), nameConfidence: 'high' };
  }

  if (email) {
    const local = email
      .split('@')[0]
      .replace(/[._0-9]+/g, ' ')
      .trim();
    if (local && !REJECT_NAME_TOKEN_RE.test(local.split(/\s+/)[0] ?? '')) {
      return { ...splitName(local), nameConfidence: 'low' };
    }
  }
  return {
    firstName: 'Unknown',
    lastName: 'Candidate',
    nameConfidence: 'low',
  };
}

function extractAddress(text: string): string | undefined {
  const match = text.match(ADDRESS_LABEL_RE);
  if (!match?.[1]) return undefined;
  return match[1].trim().slice(0, 500);
}

/**
 * Find a resume section header at the start of a line (avoids "Career Objective"
 * and mid-sentence "years of experience").
 */
function findSectionStart(
  text: string,
  headerPattern: RegExp,
): number {
  const flags = headerPattern.flags.includes('g')
    ? headerPattern.flags
    : `${headerPattern.flags}g`;
  const re = new RegExp(
    headerPattern.source,
    flags.includes('m') ? flags : `${flags}m`,
  );
  re.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const idx = match.index;
    const lineStart = text.lastIndexOf('\n', idx - 1) + 1;
    const prefix = text.slice(lineStart, idx);
    if (!/^\s*$/.test(prefix)) continue;

    const lineEnd = text.indexOf('\n', idx);
    const line = text
      .slice(lineStart, lineEnd < 0 ? text.length : lineEnd)
      .trim();
    // Reject "Career Objective / Summary" but allow bare "Career" or "Career History"
    if (/^career\s+(objective|summary|profile|goal)\b/i.test(line)) {
      continue;
    }
    return idx;
  }
  return -1;
}

function sliceExperienceSection(text: string): string {
  let start = findSectionStart(
    text,
    /\b(?:EXPERIENCE|INTERNSHIPS?|TRAININGS?|Work\s+Experience|Professional\s+Experience|Employment\s+History|Work\s+History|Career\s+History|Career)\b/i,
  );
  if (start < 0) return '';

  const after = text.slice(start);
  const endRel = findSectionStart(
    after.slice(1), // skip current header line
    /\b(?:EDUCATION|ACADEMIC|QUALIFICATIONS?|SKILLS|TECHNICAL\s+SKILLS|SOFT\s+SKILLS|PROJECTS|CERTIFICATIONS?|ACHIEVEMENTS?|LANGUAGES?|COURSES|WORKSHOPS|Academic)\b/i,
  );
  // endRel is relative to after.slice(1), so +1
  if (endRel >= 0) {
    const absoluteEnd = endRel + 1;
    if (absoluteEnd > 30) return after.slice(0, Math.min(absoluteEnd, 3500));
  }
  return after.slice(0, 3500);
}

function sliceEducationSection(text: string): string {
  let start = findSectionStart(
    text,
    /\b(?:EDUCATION|Educational\s+Qualification|Academic\s+(?:Qualification|Background|History)|Qualifications?|Academics|Academic)\b/i,
  );
  if (start < 0) return text;

  const after = text.slice(start);
  const endRel = findSectionStart(
    after.slice(1),
    /\b(?:SKILLS|TECHNICAL\s+SKILLS|SOFT\s+SKILLS|PROJECTS|CERTIFICATIONS?|ACHIEVEMENTS?|EXPERIENCE|INTERNSHIPS?|EMPLOYMENT|CAREER\s+HISTORY|LANGUAGES?|COURSES|WORKSHOPS)\b/i,
  );
  if (endRel >= 0) {
    const absoluteEnd = endRel + 1;
    if (absoluteEnd > 30) return after.slice(0, Math.min(absoluteEnd, 2000));
  }
  return after.slice(0, 2000);
}

function monthYearToIso(raw: string): string | undefined {
  const trimmed = raw.trim();

  const dayMonYear = trimmed.match(
    new RegExp(`^(\\d{1,2})\\s+(${MONTH_NAME})\\s+(\\d{4})$`, 'i'),
  );
  if (dayMonYear) {
    const month = MONTH_INDEX[dayMonYear[2].toLowerCase()];
    const year = Number(dayMonYear[3]);
    const day = Number(dayMonYear[1]);
    if (
      !month ||
      year < 1950 ||
      year > 2100 ||
      day < 1 ||
      day > 31
    ) {
      return undefined;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const slash = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const month = Number(slash[1]);
    const year = Number(slash[2]);
    if (month < 1 || month > 12 || year < 1950 || year > 2100) return undefined;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  const dashYm = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (dashYm) {
    const year = Number(dashYm[1]);
    const month = Number(dashYm[2]);
    if (month < 1 || month > 12 || year < 1950 || year > 2100) return undefined;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  const dashMy = trimmed.match(/^(\d{1,2})-(\d{4})$/);
  if (dashMy) {
    const month = Number(dashMy[1]);
    const year = Number(dashMy[2]);
    if (month < 1 || month > 12 || year < 1950 || year > 2100) return undefined;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  const named = trimmed.match(
    new RegExp(`^(${MONTH_NAME})\\s+(\\d{4})$`, 'i'),
  );
  if (named) {
    const month = MONTH_INDEX[named[1].toLowerCase()];
    const year = Number(named[2]);
    if (!month || year < 1950 || year > 2100) return undefined;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    const year = Number(yearOnly[1]);
    if (year < 1950 || year > 2100) return undefined;
    return `${year}-01-01`;
  }

  return undefined;
}

function extractYearFromDateToken(raw: string): number | undefined {
  const iso = monthYearToIso(raw);
  if (!iso) return undefined;
  const year = Number(iso.slice(0, 4));
  return year >= 1950 && year <= 2035 ? year : undefined;
}

function cleanDegreePhrase(raw: string): string {
  return raw
    .replace(/\b(?:konni|kochi|kerala|india|uae)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:.\-–—]+|[\s:.\-–—]+$/g, '')
    .trim()
    .slice(0, 120);
}

function extractUniversityNear(text: string, index: number): string | undefined {
  const window = text.slice(Math.max(0, index - 160), index + 220);
  const match = window.match(UNIVERSITY_RE);
  if (!match?.[1]) return undefined;
  return match[1]
    .replace(
      /^(?:Education|Academic|Qualifications?|Academics)\s+/i,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/**
 * Education: prefer date-anchored EDUCATION blocks, then fall back to degree phrases.
 */
export function extractEducations(text: string): ParsedEducationEntry[] {
  const section = sliceEducationSection(text) || text;

  const educations: ParsedEducationEntry[] = [];
  const seen = new Set<string>();

  // Date-anchored: "... Bachelor of Science ... University 06/2019 - 04/2022"
  DATE_RANGE_RE.lastIndex = 0;
  let dateMatch: RegExpExecArray | null;
  const dateMatches: RegExpExecArray[] = [];
  while ((dateMatch = DATE_RANGE_RE.exec(section)) !== null) {
    dateMatches.push(dateMatch);
  }

  for (const dm of dateMatches) {
    const before = section.slice(Math.max(0, dm.index - 180), dm.index);
    DEGREE_PHRASE_RE.lastIndex = 0;
    const degreeMatches = [...before.matchAll(DEGREE_PHRASE_RE)];
    const degree = degreeMatches.length
      ? cleanDegreePhrase(degreeMatches[degreeMatches.length - 1][0])
      : undefined;
    if (!degree || degree.length < 3) continue;

    const key = degree.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const endRaw = dm[2];
    const graduationYear = /present|current|till\s+date/i.test(endRaw)
      ? undefined
      : extractYearFromDateToken(endRaw);
    const university = extractUniversityNear(before, before.length - 1);

    educations.push({
      rawDegree: degree,
      university,
      graduationYear:
        graduationYear && graduationYear >= 1950 && graduationYear <= 2035
          ? graduationYear
          : undefined,
      notes: `Parsed from resume: ${degree}`,
    });
  }

  // Phrase fallback if no date-anchored hits
  if (educations.length === 0) {
    DEGREE_PHRASE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = DEGREE_PHRASE_RE.exec(section)) !== null) {
      const rawDegree = cleanDegreePhrase(match[0]);
      if (rawDegree.length < 3) continue;
      const key = rawDegree.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const nearby = section.slice(
        Math.max(0, match.index - 20),
        match.index + 180,
      );
      const slashYears = [...nearby.matchAll(/(\d{1,2})\/(\d{4})/g)].map((m) =>
        Number(m[2]),
      );
      const bareYears = [...nearby.matchAll(/\b((?:19|20)\d{2})\b/g)]
        .map((m) => Number(m[1]))
        .filter((y) => y >= 1950 && y <= new Date().getFullYear() + 1);
      const graduationYear = slashYears.length
        ? slashYears[slashYears.length - 1]
        : bareYears.length
          ? bareYears[bareYears.length - 1]
          : undefined;
      educations.push({
        rawDegree,
        university: extractUniversityNear(section, match.index),
        graduationYear,
        notes: `Parsed from resume: ${rawDegree}`,
      });
      if (educations.length >= 8) break;
    }
  }

  return educations.slice(0, 8);
}

function stripUrls(value: string): string {
  return value.replace(/https?:\/\/\S+/gi, ' ').replace(/\s+/g, ' ').trim();
}

function parseExperienceHeader(headerRaw: string): {
  jobTitle: string;
  companyName?: string;
  location?: string;
} {
  const header = stripUrls(headerRaw)
    .replace(/\b(?:EXPERIENCE|INTERNSHIPS?|TRAININGS?)\b/i, ' ')
    .replace(/^[•\-\*]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();

  JOB_TITLE_RE.lastIndex = 0;
  const titleMatch = JOB_TITLE_RE.exec(header);
  let jobTitle = titleMatch?.[1]
    ? titleMatch[1].replace(/\s+/g, ' ').trim()
    : undefined;

  let remainder = header;
  if (titleMatch) {
    remainder = (
      header.slice(0, titleMatch.index) +
      header.slice(titleMatch.index + titleMatch[0].length)
    ).trim();
  }

  // "Role , Company." bullet style when title regex missed
  if (!jobTitle) {
    const roleCompany = header.match(
      /^([A-Za-z][A-Za-z0-9 /&+.-]{1,40})\s*[,|]\s*([A-Za-z][A-Za-z0-9 .&'-]{1,60})/,
    );
    if (roleCompany) {
      jobTitle = roleCompany[1].replace(/\.$/, '').trim();
      remainder = roleCompany[2].replace(/\.$/, '').trim();
    }
  }

  if (!jobTitle) jobTitle = 'Professional';

  const locationBits = [...remainder.matchAll(LOCATION_NOISE_RE)].map((m) =>
    m[0],
  );
  const location =
    locationBits.length > 0
      ? Array.from(new Set(locationBits.map((s) => s.toLowerCase())))
          .join(', ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : undefined;

  let companyName: string | undefined = remainder
    .replace(LOCATION_NOISE_RE, ' ')
    .replace(/[,|.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Drop leftover sentence fragments from previous job descriptions
  if (companyName) {
    const tokens = companyName.split(' ').filter(Boolean);
    // Prefer trailing proper-looking tokens (company is right before the date)
    const trailing = tokens.slice(-4).join(' ');
    companyName = trailing.replace(/^[^A-Za-z0-9]+/, '').trim();
    if (companyName.length > 40) {
      companyName = tokens.slice(-2).join(' ');
    }
  }
  if (!companyName || companyName.length < 2) companyName = undefined;

  return { jobTitle, companyName, location };
}

/**
 * Work experience: split EXPERIENCE/INTERNSHIPS section on date-range anchors,
 * with a single month-year fallback for short internships.
 */
export function extractWorkExperiences(
  text: string,
): ParsedWorkExperienceEntry[] {
  const section = sliceExperienceSection(text);
  if (!section) return [];

  const experiences: ParsedWorkExperienceEntry[] = [];
  const seenKeys = new Set<string>();

  const pushExperience = (entry: ParsedWorkExperienceEntry) => {
    const key = `${entry.startDate}|${entry.jobTitle}|${entry.companyName ?? ''}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    experiences.push(entry);
  };

  const lines = section.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1) Line-anchored ranges (internship bullets with day-month dates)
  for (const line of lines) {
    if (/^(experience|internships?|trainings?)$/i.test(line)) continue;

    DATE_RANGE_RE.lastIndex = 0;
    const ranges = [...line.matchAll(DATE_RANGE_RE)];
    for (const rangeMatch of ranges) {
      const startDate = monthYearToIso(rangeMatch[1]);
      if (!startDate) continue;

      const isCurrent = /present|current|till\s+date/i.test(rangeMatch[2]);
      const endDate = isCurrent ? undefined : monthYearToIso(rangeMatch[2]);

      const header = line
        .slice(0, rangeMatch.index ?? 0)
        .replace(/^[•\-\*]\s*/, '')
        .replace(/(?:^|\s)\d{1,2}\s*$/, '')
        .trim();
      if (!header || header.length < 3) continue;

      const { jobTitle, companyName, location } = parseExperienceHeader(header);
      pushExperience({
        jobTitle: jobTitle.slice(0, 100),
        companyName:
          companyName
            ?.replace(/\b\d{1,2}\b/g, ' ')
            .replace(/\s*[-–—]\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 150) || undefined,
        location: location?.slice(0, 150),
        startDate,
        endDate,
        isCurrent,
      });
    }
    if (experiences.length >= 10) break;
  }

  // 2) Section-wide ranges for dense one-line EXPERIENCE blocks (Anurag-style)
  if (experiences.length === 0) {
    DATE_RANGE_RE.lastIndex = 0;
    const matches = [...section.matchAll(DATE_RANGE_RE)];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const startIdx = m.index ?? 0;
      const prevEnd =
        i === 0
          ? 0
          : (matches[i - 1].index ?? 0) + matches[i - 1][0].length;
      const beforeDate = section.slice(prevEnd, startIdx);

      JOB_TITLE_RE.lastIndex = 0;
      const titleHits = [...beforeDate.matchAll(JOB_TITLE_RE)];
      let header = '';
      if (titleHits.length > 0) {
        const lastTitle = titleHits[titleHits.length - 1];
        header = beforeDate.slice(lastTitle.index ?? 0).trim();
      } else {
        header = beforeDate.slice(-140).trim();
      }
      if (!header || header.length < 3) continue;

      const startDate = monthYearToIso(m[1]);
      if (!startDate) continue;

      const isCurrent = /present|current|till\s+date/i.test(m[2]);
      const endDate = isCurrent ? undefined : monthYearToIso(m[2]);
      const { jobTitle, companyName, location } = parseExperienceHeader(header);

      const afterDate = section.slice(startIdx + m[0].length);
      JOB_TITLE_RE.lastIndex = 0;
      const nextTitle = afterDate.search(JOB_TITLE_RE);
      DATE_RANGE_RE.lastIndex = 0;
      const nextDateMatch = DATE_RANGE_RE.exec(afterDate);
      const nextDate = nextDateMatch?.index ?? -1;
      let descEnd = afterDate.length;
      if (nextTitle >= 0) descEnd = Math.min(descEnd, nextTitle);
      if (nextDate >= 0) descEnd = Math.min(descEnd, nextDate);

      pushExperience({
        jobTitle: jobTitle.slice(0, 100),
        companyName: companyName?.slice(0, 150),
        location: location?.slice(0, 150),
        startDate,
        endDate,
        isCurrent,
        description:
          stripUrls(afterDate.slice(0, Math.min(descEnd, 500)))
            .slice(0, 500)
            .trim() || undefined,
      });

      if (experiences.length >= 10) break;
    }
  }

  // 3) Single month-year (e.g. "Intern July 2025") when still empty
  if (experiences.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^(experience|internships?|trainings?)$/i.test(line)) continue;
      DATE_RANGE_RE.lastIndex = 0;
      if (DATE_RANGE_RE.test(line)) continue;

      SINGLE_MONTH_YEAR_RE.lastIndex = 0;
      const single = SINGLE_MONTH_YEAR_RE.exec(line);
      if (!single) continue;

      const startDate = monthYearToIso(single[1]);
      if (!startDate) continue;

      const header = line
        .slice(0, single.index)
        .replace(/^[•\-\*]\s*/, '')
        .trim();
      if (
        !header ||
        header.length < 3 ||
        !/\b(intern|engineer|developer|nurse|officer|manager|analyst|trainee|training|data\s+science)\b/i.test(
          header,
        )
      ) {
        continue;
      }

      const companyLine = lines[i + 1];
      const useCompany =
        !!companyLine &&
        companyLine.length < 80 &&
        !companyLine.startsWith('•');
      SINGLE_MONTH_YEAR_RE.lastIndex = 0;
      const companyHasDate =
        useCompany && SINGLE_MONTH_YEAR_RE.test(companyLine);

      const { jobTitle, companyName, location } = parseExperienceHeader(
        useCompany && !companyHasDate ? `${header} ${companyLine}` : header,
      );

      const descLines: string[] = [];
      for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
        if (
          /^(projects?|education|skills|courses?|workshops?)$/i.test(lines[j])
        ) {
          break;
        }
        if (lines[j].startsWith('•') || lines[j].length > 40) {
          descLines.push(lines[j]);
        }
      }

      pushExperience({
        jobTitle: jobTitle.slice(0, 100),
        companyName: companyName?.slice(0, 150),
        location: location?.slice(0, 150),
        startDate,
        isCurrent: false,
        description: stripUrls(descLines.join(' ').slice(0, 500)) || undefined,
      });

      if (experiences.length >= 5) break;
    }
  }

  return experiences;
}

/**
 * Rule-based resume field extraction (no AI).
 */
export function parseResumeText(rawText: string): ParsedResumeFields {
  const text = normalizeWhitespace(rawText);
  if (!text || text.length < 10) {
    return {
      firstName: 'Unknown',
      lastName: 'Candidate',
      nameConfidence: 'low',
      educations: [],
      workExperiences: [],
    };
  }

  const email = extractEmail(text);
  const phone = extractPhone(text);
  const { firstName, lastName, nameConfidence } = extractName(text, email);

  return {
    firstName: firstName.slice(0, 50),
    lastName: lastName.slice(0, 50),
    nameConfidence,
    email,
    countryCode: phone?.countryCode,
    mobileNumber: phone?.mobileNumber,
    passportNumber: extractPassport(text),
    dateOfBirth: extractDateOfBirth(text),
    address: extractAddress(text),
    educations: extractEducations(text),
    workExperiences: extractWorkExperiences(text),
  };
}
