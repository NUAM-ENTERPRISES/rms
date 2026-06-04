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
  Award,
  CalendarDays,
  ChevronRight,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetRecruiterPerformanceRatingQuery,
  type PerformanceRatingBlock,
  type PerformanceStageCounts,
} from "@/services/recruiterAnalyticsApi";
import {
  buildChartData,
  CHART_COLORS,
  getOverallRatingInfo,
  hasAnyStageActivity,
  RATING_CARD_BORDER,
  RATING_STYLES,
  STAGE_CONFIG,
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
      <div className="lg:col-span-2 h-[340px] rounded-2xl bg-slate-100/80" />
      <div className="lg:col-span-3 h-[340px] rounded-2xl bg-slate-100/80" />
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
  const rating = block?.rating ?? "Poor";
  const info = getOverallRatingInfo(score);
  const ratingClass = RATING_STYLES[rating] ?? RATING_STYLES.Poor;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-xl border p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
        isActive
          ? "border-indigo-300 bg-white shadow-md ring-1 ring-indigo-200"
          : "border-slate-200 bg-slate-50/80 hover:bg-white hover:border-slate-300",
      )}
      aria-pressed={isActive}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums text-slate-900 mt-1">{score}</p>
      <Badge variant="outline" className={cn("mt-2 text-[10px] font-semibold", ratingClass)}>
        {rating}
      </Badge>
      <p className="text-[10px] text-slate-500 mt-1.5">{info.scoreRange}</p>
    </button>
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
  const ratingClass = RATING_STYLES[rating] ?? RATING_STYLES.Poor;

  return (
    <div className="flex flex-col gap-4 h-full min-h-[340px]">
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
          "relative flex-1 overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-white to-slate-50 shadow-md",
          RATING_CARD_BORDER[rating] ?? "border-slate-200",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/10"
          aria-hidden
        />
        <div className="relative p-5 flex flex-col items-center text-center h-full justify-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Overall rating · {periodLabel}
          </p>

          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border-2 px-5 py-3 shadow-sm",
              ratingClass,
            )}
            aria-label={`Overall rating: ${rating}`}
          >
            {info.isTopTier ? (
              <Trophy className="h-6 w-6 shrink-0" aria-hidden />
            ) : (
              <Award className="h-6 w-6 shrink-0" aria-hidden />
            )}
            <span className="text-2xl sm:text-3xl font-bold tracking-tight">{rating}</span>
          </div>

          <div className="space-y-1">
            <p className="text-5xl font-extrabold tabular-nums text-slate-900 leading-none">
              {score}
            </p>
            <p className="text-sm font-medium text-slate-500">performance points</p>
          </div>

          <div className="w-full max-w-xs rounded-xl bg-slate-100/80 border border-slate-200/80 px-4 py-3 text-left space-y-2">
            <p className="text-xs text-slate-600 flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-indigo-500 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold text-slate-800">{rating}</span>
                {" "}requires {info.scoreRange}
              </span>
            </p>
            {info.nextStep && (
              <p className="text-xs text-indigo-700 font-medium flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {info.nextStep}
              </p>
            )}
            {info.isTopTier && (
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Highest performance tier achieved
              </p>
            )}
          </div>
        </div>
      </div>
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
      <div className="flex flex-col items-center justify-center h-[300px] gap-2 text-slate-400">
        <TrendingUp className="h-10 w-10 text-slate-300" aria-hidden />
        <p className="text-sm font-medium">No stage progress in this period yet</p>
        <p className="text-xs text-slate-400">Scores update as candidates move through the funnel</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3 rounded-xl bg-indigo-50/80 border border-indigo-100 px-4 py-2.5">
        <span className="text-xs font-medium text-indigo-900">
          Total points from pipeline ({periodLabel})
        </span>
        <span className="text-lg font-bold tabular-nums text-indigo-700">{totalContribution}</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
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
          <Bar dataKey="contribution" name="Points" radius={[0, 6, 6, 0]} maxBarSize={30}>
            {chartData.map((entry, idx) => (
              <Cell key={entry.key} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100">
        {STAGE_CONFIG.map(({ label }, idx) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500"
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
              aria-hidden
            />
            {label}
          </span>
        ))}
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
  const rating = activeBlock?.rating ?? "Poor";
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
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/50 to-white shadow-sm"
      aria-labelledby="recruiter-performance-rating-heading"
    >
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5 shadow-md shadow-indigo-200/60">
              <TrendingUp className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div>
              <h2
                id="recruiter-performance-rating-heading"
                className="text-lg font-semibold text-slate-900"
              >
                Recruiter Performance Rating
              </h2>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                Overall score and rating from candidate funnel progress
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                    "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer capitalize",
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
            {periodView === "monthly" && (
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger
                  className="w-[140px] h-10 rounded-xl border-slate-200 bg-white"
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
            )}
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger
                className="w-[100px] h-10 rounded-xl border-slate-200 bg-white"
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
        {isError && (
          <p className="text-sm text-red-600 mb-4 rounded-lg bg-red-50 px-3 py-2" role="alert">
            Failed to load performance rating. Please try again later.
          </p>
        )}

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
              className="grid grid-cols-1 lg:grid-cols-5 gap-5"
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
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm h-full min-h-[340px] flex flex-col">
                  <h3 className="text-sm font-semibold text-slate-800">
                    How your score was built
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 mb-1">
                    Weighted points per funnel stage for {periodLabel}
                  </p>
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
