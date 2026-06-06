import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { PerformanceRatingMedalBadge } from "./PerformanceRatingMedalBadge";
import { RecruiterPerformanceRatingStars } from "./RecruiterPerformanceRatingStars";
import { cn } from "@/lib/utils";
import {
  useGetRecruiterPerformanceRatingQuery,
  type PerformanceRatingBlock,
  type PerformanceStageCounts,
} from "@/services/recruiterAnalyticsApi";
import {
  buildChartData,
  buildStageBreakdown,
  CHART_COLORS,
  DEFAULT_PERFORMANCE_RATING,
  getOverallRatingInfo,
  getRatingProgress,
  getRatingTierSubtitle,
  hasAnyStageActivity,
  isEliteRating,
  RATING_CARD_BORDER,
  RATING_GLANCE_ACCENT,
  RATING_PROGRESS_FILL,
  RATING_STYLES,
  RATING_TILE_GRADIENT,
  STAGE_CONFIG,
  STAGE_TILE_STYLES,
} from "../utils/recruiter-performance-rating.util";

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const STAGE_GLANCE_ACCENT = [
  "via-chart-1/50",
  "via-chart-2/50",
  "via-chart-3/50",
  "via-chart-4/50",
  "via-chart-5/50",
  "via-chart-1/50",
] as const;

const EMPTY_STAGE_COUNTS: PerformanceStageCounts = {
  positiveCandidate: 0,
  documentVerified: 0,
  interviewShortlisted: 0,
  interviewPassed: 0,
  processing: 0,
  deployed: 0,
};

type PeriodView = "monthly" | "yearly";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: { label: string; count: number; contribution: number };
  }>;
}

function ContributionTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-lg text-sm min-w-[200px]">
      <p className="font-semibold text-slate-900 mb-2">{row.label}</p>
      <div className="space-y-1 text-slate-600">
        <p className="flex justify-between gap-4">
          <span>Candidates</span>
          <span className="font-semibold text-slate-900 tabular-nums">{row.count}</span>
        </p>
        <p className="flex justify-between gap-4">
          <span>Points added</span>
          <span className="font-semibold text-indigo-700 tabular-nums">{row.contribution}</span>
        </p>
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-5 gap-5 animate-pulse"
      aria-busy="true"
      aria-label="Loading performance rating"
    >
      <div className="lg:col-span-2 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 rounded-2xl bg-slate-100/90" />
          <div className="h-28 rounded-2xl bg-slate-100/90" />
        </div>
        <div className="h-[280px] rounded-2xl bg-slate-100/80" />
      </div>
      <div className="lg:col-span-3 h-[420px] rounded-2xl bg-slate-100/80" />
    </div>
  );
}

function PeriodSnapshot({
  label,
  block,
  isActive,
  onSelect,
}: {
  label: string;
  block?: PerformanceRatingBlock;
  isActive: boolean;
  onSelect: () => void;
}) {
  const score = block?.score ?? 0;
  const rating = block?.rating ?? DEFAULT_PERFORMANCE_RATING;
  const info = getOverallRatingInfo(score);
  const tileGradient =
    RATING_TILE_GRADIENT[rating] ?? RATING_TILE_GRADIENT[DEFAULT_PERFORMANCE_RATING];
  const progress = getRatingProgress(score);
  const isMonthly = label === "Monthly";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border p-3.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
        isActive
          ? cn(
              "border-indigo-300 shadow-md ring-2 ring-indigo-200/80",
              tileGradient.active,
            )
          : cn(
              "border-slate-300/80 hover:border-slate-400 hover:shadow-sm",
              tileGradient.base,
            ),
      )}
      aria-pressed={isActive}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-60",
          isMonthly
            ? "bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.14),_transparent_55%)]"
            : "bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.12),_transparent_55%)]",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-[48%] animate-processing-glance bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-90 mix-blend-overlay",
          isMonthly ? "[animation-delay:0s]" : "[animation-delay:1.2s]",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-[40%] animate-processing-glance bg-gradient-to-r from-transparent to-transparent opacity-70 mix-blend-soft-light",
          isMonthly
            ? "via-indigo-200/55 [animation-delay:0.6s]"
            : "via-violet-200/50 [animation-delay:1.8s]",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "absolute inset-y-0 left-0 z-[1] w-1.5 rounded-l-2xl transition-colors",
          isActive ? "bg-indigo-500" : tileGradient.accent,
        )}
        aria-hidden
      />
      <div className="relative z-[1]">
      <p className="pl-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <div className="pl-2 mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-3xl font-extrabold tabular-nums leading-none text-slate-900">
            {score}
          </p>
          <p className="text-[10px] font-medium text-slate-500 mt-1">points</p>
        </div>
        <RecruiterPerformanceRatingStars
          rating={rating}
          size="sm"
          variant="dashboard"
          className="shrink-0"
        />
      </div>
      <div className="pl-2 mt-2.5 flex flex-wrap items-center gap-1.5">
        <PerformanceRatingMedalBadge rating={rating} size="sm" />
        <span className="text-[10px] text-slate-500">{info.scoreRange}</span>
      </div>
      <div className="pl-2 mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            RATING_PROGRESS_FILL[rating] ?? "bg-slate-400",
          )}
          style={{ width: `${progress.tierProgressPercent}%` }}
        />
      </div>
      </div>
    </button>
  );
}

function TierProgressCard({
  score,
  rating,
}: {
  score: number;
  rating: string;
}) {
  const info = getOverallRatingInfo(score);
  const progress = getRatingProgress(score);
  const tileGradient =
    RATING_TILE_GRADIENT[rating] ?? RATING_TILE_GRADIENT[DEFAULT_PERFORMANCE_RATING];
  const glanceAccent =
    RATING_GLANCE_ACCENT[rating] ?? RATING_GLANCE_ACCENT[DEFAULT_PERFORMANCE_RATING];
  const ratingClass =
    RATING_STYLES[rating] ?? RATING_STYLES[DEFAULT_PERFORMANCE_RATING];

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left shadow-sm",
        RATING_CARD_BORDER[rating] ?? RATING_CARD_BORDER[DEFAULT_PERFORMANCE_RATING],
        tileGradient.active,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-[1] w-1.5 rounded-l-2xl",
          tileGradient.accent,
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[48%] animate-processing-glance bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-90 mix-blend-overlay [animation-delay:0.3s]"
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-[40%] animate-processing-glance bg-gradient-to-r from-transparent to-transparent opacity-70 mix-blend-soft-light [animation-delay:1.1s]",
          glanceAccent,
        )}
        aria-hidden
      />
      <div className="relative z-[1] space-y-2.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-indigo-500 shrink-0" aria-hidden />
            Current medal
          </span>
          <span className="tabular-nums font-bold text-indigo-700">
            {progress.tierProgressPercent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              RATING_PROGRESS_FILL[rating] ?? RATING_PROGRESS_FILL[DEFAULT_PERFORMANCE_RATING],
            )}
            style={{ width: `${progress.tierProgressPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-600">
          <span className="font-semibold text-slate-800">{rating}</span> requires{" "}
          {info.scoreRange}
        </p>
        {info.nextStep ? (
          <p className="text-xs font-medium text-indigo-700 flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {info.nextStep}
          </p>
        ) : null}
        {info.isTopTier ? (
          <p className={cn("text-xs font-medium flex items-center gap-1.5", ratingClass)}>
            <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Elite top tier achieved
          </p>
        ) : null}
      </div>
    </div>
  );
}

function OverallRatingHero({
  score,
  rating,
  periodLabel,
  monthly,
  yearly,
  periodView,
  onSelectPeriod,
}: {
  score: number;
  rating: string;
  periodLabel: string;
  monthly?: PerformanceRatingBlock;
  yearly?: PerformanceRatingBlock;
  periodView: PeriodView;
  onSelectPeriod: (view: PeriodView) => void;
}) {
  const info = getOverallRatingInfo(score);
  const tileGradient =
    RATING_TILE_GRADIENT[rating] ?? RATING_TILE_GRADIENT[DEFAULT_PERFORMANCE_RATING];
  const glanceAccent =
    RATING_GLANCE_ACCENT[rating] ?? RATING_GLANCE_ACCENT[DEFAULT_PERFORMANCE_RATING];

  return (
    <div className="flex h-full min-h-[380px] flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <PeriodSnapshot
          label="Monthly"
          block={monthly}
          isActive={periodView === "monthly"}
          onSelect={() => onSelectPeriod("monthly")}
        />
        <PeriodSnapshot
          label="Yearly"
          block={yearly}
          isActive={periodView === "yearly"}
          onSelect={() => onSelectPeriod("yearly")}
        />
      </div>

      <div
        className={cn(
          "relative flex flex-1 overflow-hidden rounded-2xl border-2 shadow-md",
          RATING_CARD_BORDER[rating] ?? RATING_CARD_BORDER[DEFAULT_PERFORMANCE_RATING],
          tileGradient.hero,
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.14),_transparent_58%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(139,92,246,0.1),_transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[52%] animate-processing-glance bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-90 mix-blend-overlay"
          aria-hidden
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-[42%] animate-processing-glance bg-gradient-to-r from-transparent to-transparent opacity-70 mix-blend-soft-light [animation-delay:0.9s]",
            glanceAccent,
          )}
          aria-hidden
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-[1] w-1.5 rounded-l-2xl",
            tileGradient.accent,
          )}
          aria-hidden
        />
        <div className="relative z-[1] flex h-full w-full flex-col items-center justify-center gap-4 p-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Overall rating · {periodLabel}
          </p>

          <div className="relative">
            <div
              className={cn(
                "flex h-28 w-28 items-center justify-center rounded-full border-4 bg-white shadow-inner",
                RATING_CARD_BORDER[rating] ?? RATING_CARD_BORDER[DEFAULT_PERFORMANCE_RATING],
              )}
            >
              <div>
                <p className="text-4xl font-extrabold tabular-nums leading-none text-slate-900">
                  {score}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  points
                </p>
              </div>
            </div>
            {info.isTopTier ? (
              <div className="absolute -right-1 -top-1 rounded-full bg-violet-100 p-1.5 text-violet-600 shadow-sm">
                <Sparkles className="h-4 w-4" aria-hidden />
              </div>
            ) : null}
          </div>

          <div
            className={cn(
              "rounded-2xl border bg-gradient-to-b px-5 py-3 shadow-sm",
              RATING_STYLES[rating] ?? RATING_STYLES[DEFAULT_PERFORMANCE_RATING],
            )}
          >
            <RecruiterPerformanceRatingStars
              rating={rating}
              size="lg"
              variant="dashboard"
              className="justify-center"
            />
            <p className="mt-2 text-[10px] font-medium tabular-nums opacity-80">
              {getRatingTierSubtitle(rating)}
            </p>
          </div>

          <PerformanceRatingMedalBadge
            rating={rating}
            size="lg"
            showTopTierLabel={isEliteRating(rating)}
          />

          <TierProgressCard score={score} rating={rating} />
        </div>
      </div>
    </div>
  );
}

function StageContributionGrid({
  stageCounts,
}: {
  stageCounts: PerformanceStageCounts;
}) {
  const rows = useMemo(() => buildStageBreakdown(stageCounts), [stageCounts]);

  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {rows.map((row, idx) => {
        const stageStyle = STAGE_TILE_STYLES[idx % STAGE_TILE_STYLES.length];
        return (
        <div
          key={row.key}
          className={cn(
            "relative overflow-hidden rounded-xl border px-3 py-2.5 transition-colors",
            stageStyle.tile,
          )}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-[48%] animate-processing-glance bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-85 mix-blend-overlay"
            style={{ animationDelay: `${idx * 0.45}s` }}
            aria-hidden
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-[40%] animate-processing-glance bg-gradient-to-r from-transparent to-transparent opacity-65 mix-blend-soft-light",
              STAGE_GLANCE_ACCENT[idx % STAGE_GLANCE_ACCENT.length],
            )}
            style={{ animationDelay: `${idx * 0.45 + 0.75}s` }}
            aria-hidden
          />
          <div className="relative z-[1]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", stageStyle.dot)}
                aria-hidden
              />
              <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {row.shortLabel}
              </span>
            </div>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-900">
              {row.contribution}
            </p>
            <p className="text-[10px] text-slate-500">
              {row.count} × {row.weight} pts
            </p>
          </div>
        </div>
        );
      })}
    </div>
  );
}

function ContributionChart({
  stageCounts,
  isEmpty,
  periodLabel,
}: {
  stageCounts: PerformanceStageCounts;
  isEmpty: boolean;
  periodLabel: string;
}) {
  const chartData = useMemo(() => buildChartData(stageCounts), [stageCounts]);
  const totalContribution = useMemo(
    () => chartData.reduce((sum, row) => sum + row.contribution, 0),
    [chartData],
  );

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 py-12 text-slate-400">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <TrendingUp className="h-10 w-10 text-slate-300" aria-hidden />
        </div>
        <p className="text-sm font-semibold text-slate-600">
          No stage progress in this period yet
        </p>
        <p className="max-w-xs text-center text-xs text-slate-400">
          Scores update as candidates move through the funnel
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 to-violet-50/50 px-4 py-3">
        <span className="text-xs font-semibold text-indigo-900">
          Total points from pipeline ({periodLabel})
        </span>
        <span className="text-2xl font-extrabold tabular-nums text-indigo-700">
          {totalContribution}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={118}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ContributionTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="contribution" name="Points" radius={[0, 8, 8, 0]} maxBarSize={28}>
            {chartData.map((entry, idx) => (
              <Cell key={entry.key} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <StageContributionGrid stageCounts={stageCounts} />
      <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
        {STAGE_CONFIG.map(({ label }, idx) => {
          const stageStyle = STAGE_TILE_STYLES[idx % STAGE_TILE_STYLES.length];
          return (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500"
          >
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", stageStyle.dot)}
              aria-hidden
            />
            {label}
          </span>
          );
        })}
      </div>
    </>
  );
}

export default function RecruiterPerformanceRatingSection() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [periodView, setPeriodView] = useState<PeriodView>("monthly");

  const { data, isLoading, isError } = useGetRecruiterPerformanceRatingQuery({
    year,
    month,
  });

  const monthly = data?.data?.monthly;
  const yearly = data?.data?.yearly;
  const activeBlock = periodView === "monthly" ? monthly : yearly;
  const stageCounts = activeBlock?.stageCounts ?? EMPTY_STAGE_COUNTS;
  const score = activeBlock?.score ?? 0;
  const rating = activeBlock?.rating ?? DEFAULT_PERFORMANCE_RATING;
  const isEmpty = !hasAnyStageActivity(stageCounts);

  const periodLabel =
    periodView === "monthly"
      ? `${MONTH_LABELS[month - 1]} ${year}`
      : `Year ${year}`;

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return [current - 1, current, current + 1];
  }, [now]);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white via-slate-50/30 to-white shadow-sm ring-1 ring-slate-200/60"
      aria-labelledby="recruiter-performance-rating-heading"
    >
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-violet-500"
        aria-hidden
      />

      <div className="border-b border-slate-100 px-5 pb-4 pt-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-3 shadow-lg shadow-indigo-200/50">
              <TrendingUp className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600/90">
                Performance insights
              </p>
              <h2
                id="recruiter-performance-rating-heading"
                className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
              >
                Recruiter Performance Rating
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Overall score and rating from candidate funnel progress
                </span>
              </p>
              {!isLoading && !isError ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <RecruiterPerformanceRatingStars
                    rating={rating}
                    size="sm"
                    variant="dashboard"
                  />
                  <span className="text-xs font-bold tabular-nums text-indigo-700">
                    {score} pts
                  </span>
                  <PerformanceRatingMedalBadge
                    rating={rating}
                    size="sm"
                    showTopTierLabel={isEliteRating(rating)}
                  />
                  <Badge
                    variant="outline"
                    className="border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-600"
                  >
                    {periodLabel}
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div
              className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm"
              role="group"
              aria-label="Chart period filter"
            >
              {(["monthly", "yearly"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setPeriodView(view)}
                  className={cn(
                    "cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-all",
                    periodView === view
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                  aria-pressed={periodView === view}
                >
                  {view}
                </button>
              ))}
            </div>
            {periodView === "monthly" ? (
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger
                  className="h-10 w-[140px] rounded-xl border-slate-200 bg-white"
                  aria-label="Select month"
                >
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_LABELS.map((label, index) => (
                    <SelectItem key={label} value={String(index + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger
                className="h-10 w-[100px] rounded-xl border-slate-200 bg-white"
                aria-label="Select year"
              >
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-5">
        {isError ? (
          <p
            className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
            role="alert"
          >
            Failed to load performance rating. Please try again later.
          </p>
        ) : null}

        {isLoading ? (
          <SectionSkeleton />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${periodView}-${year}-${month}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="grid grid-cols-1 gap-5 lg:grid-cols-5"
            >
              <div className="lg:col-span-2">
                <OverallRatingHero
                  score={score}
                  rating={rating}
                  periodLabel={periodLabel}
                  monthly={monthly}
                  yearly={yearly}
                  periodView={periodView}
                  onSelectPeriod={setPeriodView}
                />
              </div>
              <div className="lg:col-span-3">
                <div className="flex h-full min-h-[380px] flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                      <BarChart3 className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        How your score was built
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Weighted points per funnel stage for {periodLabel}
                      </p>
                    </div>
                  </div>
                  <ContributionChart
                    stageCounts={stageCounts}
                    isEmpty={isEmpty}
                    periodLabel={periodLabel}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
