import type { CareerGap, CareerGapAnalysis, CareerGapType } from "../api";
import { DateUtils } from "@/shared/utils/date";

export const formatMonthsAsDuration = (totalMonths: number): string => {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return DateUtils.formatDuration(years, months);
};

export const getGapTypeLabel = (type: CareerGapType): string => {
  switch (type) {
    case "education_to_work":
      return "After education";
    case "current_unemployment":
      return "Currently unemployed";
    default:
      return "Between jobs";
  }
};

export const hasCareerGaps = (
  analysis?: CareerGapAnalysis | null
): boolean => Boolean(analysis && analysis.totalGapMonths > 0 && analysis.gaps.length > 0);

export const getPrimaryCareerGapSummary = (
  analysis?: CareerGapAnalysis | null
): string | null => {
  if (!hasCareerGaps(analysis) || !analysis) return null;
  const longest = analysis.gaps.reduce<CareerGap | null>(
    (best, gap) => (!best || gap.months > best.months ? gap : best),
    null
  );
  if (!longest) {
    return `Career gap: ${formatMonthsAsDuration(analysis.totalGapMonths)} total`;
  }
  return `${longest.label} (${formatMonthsAsDuration(longest.months)})`;
};
