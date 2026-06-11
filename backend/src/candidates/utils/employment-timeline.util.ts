/** Minimum idle period (days) before counting as an employment gap. */
export const MIN_GAP_DAYS = 30;

/** Grace period after latest graduation before first job (months). */
export const EDUCATION_TO_WORK_GRACE_MONTHS = 12;

export type CareerGapType =
  | 'between_jobs'
  | 'education_to_work'
  | 'current_unemployment';

export interface EmploymentRange {
  startDate: Date;
  endDate: Date;
}

export interface WorkExperienceInput {
  startDate: Date | string;
  endDate?: Date | string | null;
  isCurrent?: boolean;
  companyName?: string | null;
  jobTitle?: string | null;
  countryCode?: string | null;
}

export const GCC_COUNTRY_CODES = ['SA', 'AE', 'QA', 'OM', 'BH', 'KW'] as const;
export const INDIA_COUNTRY_CODE = 'IN';

export interface QualificationInput {
  graduationYear?: number | null;
  isCompleted?: boolean;
  qualification?: { name?: string | null } | null;
}

export interface CareerGap {
  type: CareerGapType;
  startDate: string;
  endDate: string;
  months: number;
  label: string;
}

export interface CareerGapAnalysis {
  totalExperienceMonths: number;
  totalGapMonths: number;
  longestGapMonths: number;
  hasCurrentEmployment: boolean;
  gaps: CareerGap[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Month-boundary difference aligned with existing candidate experience math. */
export function monthsBetween(start: Date, end: Date): number {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
}

function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / MS_PER_DAY);
}

function normalizeWorkExperiences(
  workExperiences: WorkExperienceInput[],
): EmploymentRange[] {
  const now = new Date();
  return workExperiences.map((exp) => ({
    startDate: toDate(exp.startDate),
    endDate: exp.isCurrent || !exp.endDate ? now : toDate(exp.endDate),
  }));
}

export function mergeEmploymentRanges(
  workExperiences: WorkExperienceInput[],
): EmploymentRange[] {
  if (!workExperiences.length) {
    return [];
  }

  const dateRanges = normalizeWorkExperiences(workExperiences);
  dateRanges.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const mergedRanges: EmploymentRange[] = [];
  let currentRange = { ...dateRanges[0] };

  for (let i = 1; i < dateRanges.length; i++) {
    const nextRange = dateRanges[i];

    if (nextRange.startDate <= currentRange.endDate) {
      currentRange.endDate = new Date(
        Math.max(currentRange.endDate.getTime(), nextRange.endDate.getTime()),
      );
    } else {
      mergedRanges.push(currentRange);
      currentRange = { ...nextRange };
    }
  }

  mergedRanges.push(currentRange);
  return mergedRanges;
}

export function calculateTotalExperienceMonths(
  workExperiences: WorkExperienceInput[],
): number {
  const mergedRanges = mergeEmploymentRanges(workExperiences);
  return mergedRanges.reduce(
    (total, range) => total + monthsBetween(range.startDate, range.endDate),
    0,
  );
}

export function calculateTotalExperienceYears(
  workExperiences: WorkExperienceInput[],
): number {
  const totalMonths = calculateTotalExperienceMonths(workExperiences);
  return Math.round((totalMonths / 12) * 10) / 10;
}

export function filterWorkExperiencesByCountries(
  workExperiences: WorkExperienceInput[],
  countryCodes: readonly string[],
): WorkExperienceInput[] {
  const normalized = new Set(
    countryCodes.map((code) => code.trim().toUpperCase()).filter(Boolean),
  );
  return workExperiences.filter(
    (exp) =>
      exp.countryCode &&
      normalized.has(String(exp.countryCode).trim().toUpperCase()),
  );
}

export function calculateExperienceMonthsByCountries(
  workExperiences: WorkExperienceInput[],
  countryCodes: readonly string[],
): number {
  return calculateTotalExperienceMonths(
    filterWorkExperiencesByCountries(workExperiences, countryCodes),
  );
}

export function calculateExperienceYearsByCountries(
  workExperiences: WorkExperienceInput[],
  countryCodes: readonly string[],
): number {
  const months = calculateExperienceMonthsByCountries(
    workExperiences,
    countryCodes,
  );
  return Math.round((months / 12) * 10) / 10;
}

function buildBetweenJobLabel(
  workExperiences: WorkExperienceInput[],
  gapStart: Date,
  gapEnd: Date,
): string {
  const sorted = [...workExperiences].sort(
    (a, b) => toDate(a.startDate).getTime() - toDate(b.startDate).getTime(),
  );

  const previousJob = [...sorted]
    .reverse()
    .find((exp) => {
      const end = exp.isCurrent || !exp.endDate ? new Date() : toDate(exp.endDate);
      return end.getTime() <= gapStart.getTime() + MS_PER_DAY;
    });

  const nextJob = sorted.find(
    (exp) => toDate(exp.startDate).getTime() >= gapEnd.getTime() - MS_PER_DAY,
  );

  const previousName = previousJob?.companyName?.trim() || 'previous role';
  const nextName = nextJob?.companyName?.trim() || 'next role';

  return `Between ${previousName} and ${nextName}`;
}

function addGapIfValid(
  gaps: CareerGap[],
  type: CareerGapType,
  start: Date,
  end: Date,
  label: string,
): void {
  if (daysBetween(start, end) <= MIN_GAP_DAYS) {
    return;
  }

  const months = Math.max(0, monthsBetween(start, end));
  gaps.push({
    type,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    months,
    label,
  });
}

function getLatestCompletedGraduationDate(
  qualifications: QualificationInput[],
): Date | null {
  const completedYears = qualifications
    .filter((q) => q.isCompleted !== false && q.graduationYear != null)
    .map((q) => q.graduationYear as number);

  if (!completedYears.length) {
    return null;
  }

  const latestYear = Math.max(...completedYears);
  return new Date(Date.UTC(latestYear, 11, 31));
}

function hasOngoingQualification(qualifications: QualificationInput[]): boolean {
  return qualifications.some((q) => q.isCompleted === false);
}

function getLatestQualificationName(
  qualifications: QualificationInput[],
): string {
  const completed = qualifications.filter(
    (q) => q.isCompleted !== false && q.graduationYear != null,
  );
  if (!completed.length) {
    return 'latest qualification';
  }

  const latest = completed.reduce((acc, q) =>
    (q.graduationYear as number) > (acc.graduationYear as number) ? q : acc,
  );

  return latest.qualification?.name?.trim() || 'latest qualification';
}

export function calculateCareerGaps(
  workExperiences: WorkExperienceInput[],
  qualifications: QualificationInput[] = [],
): CareerGapAnalysis {
  const mergedRanges = mergeEmploymentRanges(workExperiences);
  const hasCurrentEmployment = workExperiences.some((exp) => exp.isCurrent === true);
  const gaps: CareerGap[] = [];

  for (let i = 0; i < mergedRanges.length - 1; i++) {
    const current = mergedRanges[i];
    const next = mergedRanges[i + 1];
    addGapIfValid(
      gaps,
      'between_jobs',
      current.endDate,
      next.startDate,
      buildBetweenJobLabel(workExperiences, current.endDate, next.startDate),
    );
  }

  const graduationDate = getLatestCompletedGraduationDate(qualifications);
  if (
    graduationDate &&
    mergedRanges.length > 0 &&
    !hasOngoingQualification(qualifications)
  ) {
    const firstJobStart = mergedRanges[0].startDate;
    const idleMonths = monthsBetween(graduationDate, firstJobStart);

    if (idleMonths > EDUCATION_TO_WORK_GRACE_MONTHS) {
      const qualName = getLatestQualificationName(qualifications);
      addGapIfValid(
        gaps,
        'education_to_work',
        graduationDate,
        firstJobStart,
        `After ${qualName}`,
      );
    }
  }

  if (!hasCurrentEmployment && mergedRanges.length > 0) {
    const lastRange = mergedRanges[mergedRanges.length - 1];
    const today = new Date();
    if (lastRange.endDate < today) {
      addGapIfValid(
        gaps,
        'current_unemployment',
        lastRange.endDate,
        today,
        'Since last employment',
      );
    }
  }

  const totalExperienceMonths = calculateTotalExperienceMonths(workExperiences);
  const totalGapMonths = gaps.reduce((sum, gap) => sum + gap.months, 0);
  const longestGapMonths = gaps.reduce(
    (max, gap) => Math.max(max, gap.months),
    0,
  );

  return {
    totalExperienceMonths,
    totalGapMonths,
    longestGapMonths,
    hasCurrentEmployment,
    gaps,
  };
}
