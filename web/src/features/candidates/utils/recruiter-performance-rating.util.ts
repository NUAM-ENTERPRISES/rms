import type { PerformanceStageCounts } from "@/services/recruiterAnalyticsApi";

export const PERFORMANCE_STAGE_WEIGHTS: Record<keyof PerformanceStageCounts, number> = {
  positiveCandidate: 1,
  documentVerified: 2,
  interviewShortlisted: 3,
  interviewPassed: 5,
  processing: 7,
  deployed: 10,
};

export const STAGE_CONFIG: Array<{
  key: keyof PerformanceStageCounts;
  label: string;
  shortLabel: string;
}> = [
  { key: "positiveCandidate", label: "Positive Candidate", shortLabel: "Positive" },
  { key: "documentVerified", label: "Document Verified", shortLabel: "Doc Verified" },
  { key: "interviewShortlisted", label: "Interview Shortlisted", shortLabel: "Shortlisted" },
  { key: "interviewPassed", label: "Interview Passed", shortLabel: "Passed" },
  { key: "processing", label: "Processing", shortLabel: "Processing" },
  { key: "deployed", label: "Deployed", shortLabel: "Deployed" },
];

export type PerformanceRatingLabel =
  | "Poor"
  | "Average"
  | "Good"
  | "Excellent"
  | "Outstanding"
  | "Top Performer";

const RATING_TIERS: Array<{
  label: PerformanceRatingLabel;
  min: number;
  max: number;
}> = [
  { label: "Poor", min: 0, max: 25 },
  { label: "Average", min: 26, max: 50 },
  { label: "Good", min: 51, max: 75 },
  { label: "Excellent", min: 76, max: 100 },
  { label: "Outstanding", min: 101, max: 150 },
  { label: "Top Performer", min: 151, max: Number.POSITIVE_INFINITY },
];

export function resolvePerformanceRating(score: number): PerformanceRatingLabel {
  if (score <= 25) return "Poor";
  if (score <= 50) return "Average";
  if (score <= 75) return "Good";
  if (score <= 100) return "Excellent";
  if (score <= 150) return "Outstanding";
  return "Top Performer";
}

export function computePerformanceScore(counts: PerformanceStageCounts): number {
  return STAGE_CONFIG.reduce(
    (sum, { key }) => sum + counts[key] * PERFORMANCE_STAGE_WEIGHTS[key],
    0,
  );
}

export interface StageBreakdownRow {
  key: keyof PerformanceStageCounts;
  label: string;
  shortLabel: string;
  count: number;
  weight: number;
  contribution: number;
  barPercent: number;
}

export interface ChartStageRow {
  key: keyof PerformanceStageCounts;
  label: string;
  shortLabel: string;
  count: number;
  contribution: number;
}

export function buildStageBreakdown(
  stageCounts: PerformanceStageCounts,
): StageBreakdownRow[] {
  const rows = STAGE_CONFIG.map(({ key, label, shortLabel }) => {
    const count = stageCounts[key] ?? 0;
    const weight = PERFORMANCE_STAGE_WEIGHTS[key];
    const contribution = count * weight;
    return { key, label, shortLabel, count, weight, contribution, barPercent: 0 };
  });
  const maxContribution = Math.max(...rows.map((r) => r.contribution), 1);
  return rows.map((row) => ({
    ...row,
    barPercent: Math.round((row.contribution / maxContribution) * 100),
  }));
}

export function buildChartData(stageCounts: PerformanceStageCounts): ChartStageRow[] {
  return STAGE_CONFIG.map(({ key, label, shortLabel }) => ({
    key,
    label,
    shortLabel,
    count: stageCounts[key] ?? 0,
    contribution: (stageCounts[key] ?? 0) * PERFORMANCE_STAGE_WEIGHTS[key],
  }));
}

export function hasAnyStageActivity(stageCounts: PerformanceStageCounts): boolean {
  return STAGE_CONFIG.some(({ key }) => (stageCounts[key] ?? 0) > 0);
}

export interface RatingProgress {
  currentLabel: PerformanceRatingLabel;
  nextLabel: PerformanceRatingLabel | null;
  pointsToNext: number;
  tierProgressPercent: number;
  helperText: string;
}

export const RATING_TIER_RANGES: Array<{
  label: PerformanceRatingLabel;
  min: number;
  max: number | null;
}> = [
  { label: "Poor", min: 0, max: 25 },
  { label: "Average", min: 26, max: 50 },
  { label: "Good", min: 51, max: 75 },
  { label: "Excellent", min: 76, max: 100 },
  { label: "Outstanding", min: 101, max: 150 },
  { label: "Top Performer", min: 151, max: null },
];

const RATING_STAR_COUNTS: Record<PerformanceRatingLabel, number> = {
  Poor: 1,
  Average: 2,
  Good: 3,
  Excellent: 4,
  Outstanding: 5,
  "Top Performer": 5,
};

export const NAV_RATING_STAR_TOTAL = 5;

/** Maps overall rating label to filled star count (1–5) for compact UI such as the navbar. */
export function getRatingStarCount(label: PerformanceRatingLabel | string): number {
  if (label in RATING_STAR_COUNTS) {
    return RATING_STAR_COUNTS[label as PerformanceRatingLabel];
  }
  return 1;
}

export function formatRatingScoreRange(label: PerformanceRatingLabel | string): string {
  const tier = RATING_TIER_RANGES.find((t) => t.label === label);
  if (!tier) return "";
  if (tier.max === null) return `${tier.min}+ points`;
  return `${tier.min}–${tier.max} points`;
}

export function getOverallRatingInfo(score: number) {
  const rating = resolvePerformanceRating(score);
  const progress = getRatingProgress(score);
  return {
    rating,
    score,
    scoreRange: formatRatingScoreRange(rating),
    nextStep: progress.nextLabel ? progress.helperText : null,
    isTopTier: progress.nextLabel === null,
  };
}

export function getRatingProgress(score: number): RatingProgress {
  const currentLabel = resolvePerformanceRating(score);
  const tierIndex = RATING_TIERS.findIndex((t) => t.label === currentLabel);
  const tier = RATING_TIERS[tierIndex];
  const nextTier = RATING_TIERS[tierIndex + 1];

  if (!nextTier || !Number.isFinite(tier.max)) {
    return {
      currentLabel,
      nextLabel: null,
      pointsToNext: 0,
      tierProgressPercent: 100,
      helperText: "Top tier reached",
    };
  }

  const span = tier.max - tier.min + 1;
  const tierProgressPercent = Math.min(
    100,
    Math.max(0, Math.round(((score - tier.min) / span) * 100)),
  );
  const pointsToNext = Math.max(0, nextTier.min - score);

  return {
    currentLabel,
    nextLabel: nextTier.label,
    pointsToNext,
    tierProgressPercent,
    helperText:
      pointsToNext === 0
        ? `At ${nextTier.label} threshold`
        : `${pointsToNext} point${pointsToNext === 1 ? "" : "s"} to ${nextTier.label}`,
  };
}

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
] as const;

export const RATING_STYLES: Record<string, string> = {
  Poor: "bg-slate-100 text-slate-700 border-slate-200",
  Average: "bg-amber-50 text-amber-800 border-amber-200",
  Good: "bg-sky-50 text-sky-800 border-sky-200",
  Excellent: "bg-indigo-50 text-indigo-800 border-indigo-200",
  Outstanding: "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Top Performer": "bg-violet-50 text-violet-800 border-violet-200",
};

export const RATING_CARD_BORDER: Record<string, string> = {
  Poor: "border-slate-300",
  Average: "border-amber-300",
  Good: "border-sky-300",
  Excellent: "border-indigo-300",
  Outstanding: "border-emerald-400",
  "Top Performer": "border-violet-400",
};

export const RATING_PROGRESS_FILL: Record<string, string> = {
  Poor: "bg-slate-500",
  Average: "bg-amber-500",
  Good: "bg-sky-500",
  Excellent: "bg-indigo-500",
  Outstanding: "bg-emerald-500",
  "Top Performer": "bg-violet-500",
};

export const RATING_RING_STROKE: Record<string, string> = {
  Poor: "stroke-slate-300",
  Average: "stroke-amber-300",
  Good: "stroke-sky-300",
  Excellent: "stroke-indigo-300",
  Outstanding: "stroke-emerald-300",
  "Top Performer": "stroke-violet-300",
};
