import type { CareerGapAnalysis } from "../api";
import { DateUtils } from "@/shared/utils/date";

type WorkExperienceLike = {
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
};

type CandidateExperienceSource = {
  careerGapAnalysis?: CareerGapAnalysis | null;
  workExperiences?: WorkExperienceLike[] | null;
  totalExperience?: number | null;
  experience?: number | null;
};

/** Total experience label for list/overview views (years, months, days when dates exist). */
export function getCandidateExperienceLabel(
  candidate: CandidateExperienceSource
): string {
  const workExperiences = candidate.workExperiences ?? [];
  if (workExperiences.length > 0) {
    const { years, months, days } =
      DateUtils.calculateTotalExperience(workExperiences);
    return DateUtils.formatDuration(years, months, days);
  }

  if (candidate.careerGapAnalysis) {
    return DateUtils.formatDurationFromTotalMonths(
      candidate.careerGapAnalysis.totalExperienceMonths
    );
  }

  const manualYears = candidate.totalExperience ?? candidate.experience;
  if (manualYears != null) {
    const n = Number(manualYears);
    if (!Number.isNaN(n) && n > 0) {
      return `${n} yr${n === 1 ? "" : "s"}`;
    }
  }

  return "N/A";
}
