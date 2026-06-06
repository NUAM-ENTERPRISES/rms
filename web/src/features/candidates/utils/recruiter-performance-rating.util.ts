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
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Diamond"
  | "Platinum"
  | "Elite";

export const DEFAULT_PERFORMANCE_RATING: PerformanceRatingLabel = "Bronze";

const RATING_TIERS: Array<{
  label: PerformanceRatingLabel;
  min: number;
  max: number;
}> = [
  { label: "Bronze", min: 0, max: 25 },
  { label: "Silver", min: 26, max: 50 },
  { label: "Gold", min: 51, max: 75 },
  { label: "Diamond", min: 76, max: 100 },
  { label: "Platinum", min: 101, max: 150 },
  { label: "Elite", min: 151, max: Number.POSITIVE_INFINITY },
];

export function resolvePerformanceRating(score: number): PerformanceRatingLabel {
  if (score <= 25) return "Bronze";
  if (score <= 50) return "Silver";
  if (score <= 75) return "Gold";
  if (score <= 100) return "Diamond";
  if (score <= 150) return "Platinum";
  return "Elite";
}

export function isEliteRating(
  rating: PerformanceRatingLabel | string,
): boolean {
  return rating === "Elite";
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
  { label: "Bronze", min: 0, max: 25 },
  { label: "Silver", min: 26, max: 50 },
  { label: "Gold", min: 51, max: 75 },
  { label: "Diamond", min: 76, max: 100 },
  { label: "Platinum", min: 101, max: 150 },
  { label: "Elite", min: 151, max: null },
];

const RATING_STAR_COUNTS: Record<PerformanceRatingLabel, number> = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Diamond: 4,
  Platinum: 5,
  Elite: 5,
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
      helperText: "Elite tier reached",
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

/** Tile + dot accents aligned with chart bar colors per funnel stage. */
export const STAGE_TILE_STYLES = [
  {
    tile: "border-chart-1/30 bg-chart-1/12 hover:border-chart-1/40 hover:bg-chart-1/18",
    dot: "bg-chart-1",
  },
  {
    tile: "border-chart-2/30 bg-chart-2/12 hover:border-chart-2/40 hover:bg-chart-2/18",
    dot: "bg-chart-2",
  },
  {
    tile: "border-chart-3/30 bg-chart-3/12 hover:border-chart-3/40 hover:bg-chart-3/18",
    dot: "bg-chart-3",
  },
  {
    tile: "border-chart-4/30 bg-chart-4/12 hover:border-chart-4/40 hover:bg-chart-4/18",
    dot: "bg-chart-4",
  },
  {
    tile: "border-chart-5/30 bg-chart-5/12 hover:border-chart-5/40 hover:bg-chart-5/18",
    dot: "bg-chart-5",
  },
  {
    tile: "border-chart-1/30 bg-chart-1/12 hover:border-chart-1/40 hover:bg-chart-1/18",
    dot: "bg-chart-1",
  },
] as const;

/** Medal icon + gradient styling per performance tier. */
export const RATING_MEDAL_CONFIG: Record<
  PerformanceRatingLabel,
  {
    medalGradient: string;
    iconColor: string;
    starFill: string;
    useCrown: boolean;
  }
> = {
  Bronze: {
    medalGradient: "from-orange-700 via-amber-700 to-orange-800",
    iconColor: "text-white",
    starFill: "fill-orange-500 text-orange-600",
    useCrown: false,
  },
  Silver: {
    medalGradient: "from-slate-400 via-slate-300 to-slate-500",
    iconColor: "text-white",
    starFill: "fill-slate-400 text-slate-500",
    useCrown: false,
  },
  Gold: {
    medalGradient: "from-yellow-500 via-amber-500 to-yellow-600",
    iconColor: "text-white",
    starFill: "fill-amber-400 text-amber-500",
    useCrown: false,
  },
  Diamond: {
    medalGradient: "from-cyan-400 via-sky-400 to-blue-500",
    iconColor: "text-white",
    starFill: "fill-sky-400 text-sky-500",
    useCrown: false,
  },
  Platinum: {
    medalGradient: "from-indigo-300 via-slate-200 to-indigo-400",
    iconColor: "text-indigo-950",
    starFill: "fill-indigo-400 text-indigo-500",
    useCrown: false,
  },
  Elite: {
    medalGradient: "from-violet-500 via-fuchsia-500 to-violet-600",
    iconColor: "text-white",
    starFill: "fill-violet-400 text-violet-500",
    useCrown: true,
  },
};

/** Gradient fills for monthly/yearly period snapshot tiles. */
export const RATING_TILE_GRADIENT: Record<
  string,
  { base: string; active: string; accent: string; hero: string }
> = {
  Bronze: {
    base: "bg-gradient-to-br from-orange-100/80 via-amber-50 to-orange-50/70",
    active: "bg-gradient-to-br from-orange-200/80 via-amber-100/70 to-orange-50/80",
    hero: "bg-gradient-to-br from-orange-200/90 via-amber-100/95 to-orange-50/85",
    accent: "bg-orange-600",
  },
  Silver: {
    base: "bg-gradient-to-br from-slate-200/70 via-slate-100 to-slate-50",
    active: "bg-gradient-to-br from-slate-200/80 via-slate-100/90 to-slate-50/80",
    hero: "bg-gradient-to-br from-slate-200/90 via-slate-100/95 to-slate-50/85",
    accent: "bg-slate-500",
  },
  Gold: {
    base: "bg-gradient-to-br from-amber-200/60 via-yellow-50 to-amber-100/50",
    active: "bg-gradient-to-br from-amber-200/75 via-yellow-50/90 to-amber-100/60",
    hero: "bg-gradient-to-br from-amber-200/85 via-amber-100/90 to-yellow-50/80",
    accent: "bg-amber-500",
  },
  Diamond: {
    base: "bg-gradient-to-br from-sky-200/55 via-cyan-50 to-sky-100/50",
    active: "bg-gradient-to-br from-sky-200/65 via-cyan-50/90 to-sky-100/55",
    hero: "bg-gradient-to-br from-sky-200/80 via-cyan-100/90 to-sky-50/75",
    accent: "bg-sky-500",
  },
  Platinum: {
    base: "bg-gradient-to-br from-indigo-200/50 via-indigo-50 to-slate-100/45",
    active: "bg-gradient-to-br from-indigo-200/60 via-indigo-50/90 to-slate-100/55",
    hero: "bg-gradient-to-br from-indigo-200/75 via-indigo-100/90 to-slate-100/80",
    accent: "bg-indigo-500",
  },
  Elite: {
    base: "bg-gradient-to-br from-violet-200/55 via-violet-50 to-fuchsia-100/45",
    active: "bg-gradient-to-br from-violet-200/65 via-violet-50/90 to-fuchsia-100/55",
    hero: "bg-gradient-to-br from-violet-200/80 via-violet-100/90 to-fuchsia-100/85",
    accent: "bg-violet-500",
  },
};

/** Golden palette for the overall rating hero card (no grey/indigo). */
export const OVERALL_RATING_HERO_THEME = {
  hero: "bg-gradient-to-br from-amber-200/95 via-amber-100/95 to-yellow-50/90",
  nested: "bg-gradient-to-br from-amber-100/95 via-yellow-50/90 to-amber-50/85",
  border: "border-amber-300",
  borderStrong: "border-amber-400",
  accent: "bg-amber-500",
  glance: "via-amber-200/60",
  radialTop:
    "bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.2),_transparent_58%)]",
  radialBottom:
    "bg-[radial-gradient(ellipse_at_bottom_left,_rgba(234,179,8,0.16),_transparent_55%)]",
  header: "text-amber-700",
  textMuted: "text-amber-800/75",
  textBody: "text-amber-900",
  textLabel: "text-amber-800",
  textEmphasis: "text-amber-950",
  textAction: "text-amber-700",
  icon: "text-amber-600",
  progressTrack: "bg-amber-100",
  progressFill: "bg-amber-500",
  badge: "bg-amber-50 text-amber-900 border-amber-300",
  pointsCircle: "border-amber-300 bg-amber-50/90",
  pointsNumber: "text-amber-950",
  pointsLabel: "text-amber-700",
} as const;

/** Colored glance sweep tints matched to each rating tier. */
export const RATING_GLANCE_ACCENT: Record<string, string> = {
  Bronze: "via-orange-200/55",
  Silver: "via-slate-300/50",
  Gold: "via-amber-200/55",
  Diamond: "via-sky-200/50",
  Platinum: "via-indigo-200/50",
  Elite: "via-violet-200/50",
};

export const RATING_STYLES: Record<string, string> = {
  Bronze: "bg-orange-50 text-orange-900 border-orange-300",
  Silver: "bg-slate-100 text-slate-800 border-slate-300",
  Gold: "bg-amber-50 text-amber-900 border-amber-300",
  Diamond: "bg-sky-50 text-sky-900 border-sky-300",
  Platinum: "bg-indigo-50 text-indigo-900 border-indigo-300",
  Elite: "bg-violet-50 text-violet-900 border-violet-300",
};

export const RATING_CARD_BORDER: Record<string, string> = {
  Bronze: "border-orange-300",
  Silver: "border-slate-300",
  Gold: "border-amber-300",
  Diamond: "border-sky-300",
  Platinum: "border-indigo-300",
  Elite: "border-violet-400",
};

export const RATING_PROGRESS_FILL: Record<string, string> = {
  Bronze: "bg-orange-600",
  Silver: "bg-slate-500",
  Gold: "bg-amber-500",
  Diamond: "bg-sky-500",
  Platinum: "bg-indigo-500",
  Elite: "bg-violet-500",
};

export const RATING_RING_STROKE: Record<string, string> = {
  Bronze: "stroke-orange-300",
  Silver: "stroke-slate-300",
  Gold: "stroke-amber-300",
  Diamond: "stroke-sky-300",
  Platinum: "stroke-indigo-300",
  Elite: "stroke-violet-300",
};

/** Star row subtitle under the rating stars. */
export function getRatingTierSubtitle(
  rating: PerformanceRatingLabel | string,
): string {
  if (isEliteRating(rating)) {
    return "Top Tier";
  }
  return `${getRatingStarCount(rating)} of 5 stars`;
}
