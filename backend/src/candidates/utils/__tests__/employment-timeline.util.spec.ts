import {
  calculateCareerGaps,
  calculateTotalExperienceMonths,
  calculateTotalExperienceYears,
  mergeEmploymentRanges,
} from '../employment-timeline.util';

describe('employment-timeline.util', () => {
  describe('mergeEmploymentRanges', () => {
    it('merges overlapping concurrent jobs', () => {
      const merged = mergeEmploymentRanges([
        { startDate: '2020-01-01', endDate: '2022-01-01' },
        { startDate: '2021-06-01', endDate: '2023-01-01' },
      ]);

      expect(merged).toHaveLength(1);
      expect(merged[0].startDate.toISOString()).toContain('2020-01-01');
      expect(merged[0].endDate.toISOString()).toContain('2023-01-01');
    });
  });

  describe('calculateTotalExperienceMonths', () => {
    it('returns zero for empty history', () => {
      expect(calculateTotalExperienceMonths([])).toBe(0);
    });

    it('does not double-count overlapping jobs', () => {
      const months = calculateTotalExperienceMonths([
        { startDate: '2020-01-01', endDate: '2022-01-01' },
        { startDate: '2021-06-01', endDate: '2023-01-01' },
      ]);

      expect(months).toBe(36);
    });
  });

  describe('calculateTotalExperienceYears', () => {
    it('rounds to one decimal place', () => {
      const years = calculateTotalExperienceYears([
        { startDate: '2024-01-01', endDate: '2025-07-01' },
      ]);

      expect(years).toBe(1.5);
    });
  });

  describe('calculateCareerGaps', () => {
    it('detects nursing scenario: no education gap, one between-job gap', () => {
      const analysis = calculateCareerGaps(
        [
          {
            companyName: 'Aster Hospital',
            startDate: '2024-01-01',
            endDate: '2025-01-01',
          },
          {
            companyName: 'City Clinic',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
          },
        ],
        [
          { graduationYear: 2020, isCompleted: true, qualification: { name: 'BSc Nursing' } },
          { graduationYear: 2023, isCompleted: true, qualification: { name: 'MSc Nursing' } },
        ],
      );

      expect(analysis.gaps.some((g) => g.type === 'education_to_work')).toBe(false);
      expect(analysis.gaps.filter((g) => g.type === 'between_jobs')).toHaveLength(1);
      expect(analysis.gaps[0].months).toBeGreaterThanOrEqual(12);
      expect(analysis.totalGapMonths).toBeGreaterThanOrEqual(12);
    });

    it('excludes short between-job transitions under 30 days', () => {
      const analysis = calculateCareerGaps([
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        { startDate: '2025-01-15', isCurrent: true },
      ]);

      expect(analysis.gaps.filter((g) => g.type === 'between_jobs')).toHaveLength(0);
    });

    it('flags education_to_work when idle exceeds 12 months after latest degree', () => {
      const analysis = calculateCareerGaps(
        [{ startDate: '2023-06-01', endDate: '2024-06-01' }],
        [{ graduationYear: 2020, isCompleted: true, qualification: { name: 'BSc Nursing' } }],
      );

      expect(analysis.gaps.some((g) => g.type === 'education_to_work')).toBe(true);
    });

    it('does not flag education_to_work when MSc 2023 and first job 2024', () => {
      const analysis = calculateCareerGaps(
        [{ startDate: '2024-01-01', endDate: '2024-12-31' }],
        [{ graduationYear: 2023, isCompleted: true, qualification: { name: 'MSc Nursing' } }],
      );

      expect(analysis.gaps.some((g) => g.type === 'education_to_work')).toBe(false);
    });

    it('suppresses education_to_work when an ongoing qualification exists', () => {
      const analysis = calculateCareerGaps(
        [{ startDate: '2024-01-01', endDate: '2024-12-31' }],
        [
          { graduationYear: 2020, isCompleted: true, qualification: { name: 'BSc Nursing' } },
          { graduationYear: null, isCompleted: false, qualification: { name: 'MSc Nursing' } },
        ],
      );

      expect(analysis.gaps.some((g) => g.type === 'education_to_work')).toBe(false);
    });

    it('flags current unemployment when no current job', () => {
      const pastEnd = new Date();
      pastEnd.setMonth(pastEnd.getMonth() - 6);

      const analysis = calculateCareerGaps([
        {
          startDate: '2020-01-01',
          endDate: pastEnd.toISOString(),
          isCurrent: false,
        },
      ]);

      expect(analysis.hasCurrentEmployment).toBe(false);
      expect(analysis.gaps.some((g) => g.type === 'current_unemployment')).toBe(true);
    });

    it('returns empty gaps for empty work history', () => {
      const analysis = calculateCareerGaps([], []);

      expect(analysis.totalExperienceMonths).toBe(0);
      expect(analysis.totalGapMonths).toBe(0);
      expect(analysis.gaps).toHaveLength(0);
    });
  });
});
