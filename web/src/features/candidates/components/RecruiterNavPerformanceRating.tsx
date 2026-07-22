import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { TrendingUp } from "lucide-react";
import { useAppSelector } from "@/app/hooks";
import { useHasRole } from "@/hooks/useCan";
import { useGetRecruiterPerformanceRatingQuery } from "@/services/recruiterAnalyticsApi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RecruiterPerformanceRatingStars } from "./RecruiterPerformanceRatingStars";
import {
  formatRatingScoreRange,
  RATING_STYLES,
  type PerformanceRatingLabel,
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

function useIsRecruiterNavUser() {
  const { user } = useAppSelector((s) => s.auth);
  const hasRecruiterRole = useHasRole("Recruiter");
  return (
    hasRecruiterRole ||
    (!!user &&
      Array.isArray(user.roles) &&
      user.roles.some((r) => r.toLowerCase().includes("recruiter")))
  );
}

function PeriodRatingRow({
  label,
  score,
  rating,
  periodLabel,
}: {
  label: string;
  score: number;
  rating: string;
  periodLabel: string;
}) {
  const ratingClass = RATING_STYLES[rating] ?? RATING_STYLES.Poor;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-muted/50 p-3 space-y-2.5 shadow-sm dark:border-white/50 dark:bg-card/55 dark:backdrop-blur-md">
      <div
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-white/70 via-white/20 to-transparent dark:block"
        aria-hidden
      />
      <div className="relative z-10 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-foreground">{label}</p>
        <p className="text-[10px] font-medium text-muted-foreground">{periodLabel}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <RecruiterPerformanceRatingStars rating={rating} size="md" variant="dashboard" />
        <div className="text-right">
          <p className="text-2xl font-extrabold tabular-nums text-amber-600 leading-none">
            {score}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">points</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-2 dark:border-white/40">
        <Badge variant="outline" className={cn("text-[10px] font-semibold bg-card/50", ratingClass)}>
          {rating}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {formatRatingScoreRange(rating)}
        </span>
      </div>
      </div>
    </div>
  );
}

export function RecruiterNavPerformanceRating() {
  const navigate = useNavigate();
  const { accessToken } = useAppSelector((s) => s.auth);
  const isRecruiterUser = useIsRecruiterNavUser();

  const queryArg = accessToken && isRecruiterUser ? {} : skipToken;
  const { data, isLoading, isFetching } = useGetRecruiterPerformanceRatingQuery(
    queryArg,
    {
      pollingInterval: 300_000,
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: true,
    },
  );

  const monthly = data?.data?.monthly;
  const yearly = data?.data?.yearly;

  const displayScore = monthly?.score ?? 0;
  const displayRating = (monthly?.rating ?? "Poor") as PerformanceRatingLabel;
  const periodLabels = useMemo(() => {
    const now = new Date();
    const month = monthly?.period?.month ?? now.getMonth() + 1;
    const year = monthly?.period?.year ?? now.getFullYear();
    const yearOnly = yearly?.period?.year ?? year;
    return {
      month: `${MONTH_LABELS[month - 1]} ${year}`,
      year: String(yearOnly),
    };
  }, [monthly?.period, yearly?.period]);

  if (!isRecruiterUser) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        className="relative flex h-10 items-center gap-2 overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/80 px-3 shadow-sm dark:border-white/10 dark:bg-card/5 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] dark:backdrop-blur-md"
        aria-busy="true"
        aria-label="Loading performance rating"
      >
        <div
          className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-white/10 via-transparent to-amber-500/5 dark:block"
          aria-hidden
        />
        <RecruiterPerformanceRatingStars
          rating="Poor"
          size="sm"
          variant="nav"
          className="relative z-10 opacity-40"
        />
        <div className="relative z-10 h-4 w-10 animate-pulse rounded bg-amber-400/20" />
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-xl border px-2.5 py-1.5 sm:px-3 transition-all duration-300",
            "border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/90 text-amber-900 shadow-sm",
            "hover:border-amber-300 hover:shadow-md",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
            "dark:border-amber-300/30 dark:bg-gradient-to-br dark:from-amber-400/12 dark:via-white/8 dark:to-violet-500/8",
            "dark:text-amber-100 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_4px_20px_rgba(0,0,0,0.18)] dark:backdrop-blur-md",
            "dark:hover:border-amber-300/45 dark:hover:from-amber-400/18 dark:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_6px_24px_rgba(251,191,36,0.12)]",
            "dark:focus-visible:ring-amber-400/40",
            isFetching && "opacity-90",
          )}
          aria-label={`Your performance rating: ${displayRating}, ${displayScore} points this month`}
        >
          <span
            className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-white/20 via-white/5 to-transparent dark:block"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute inset-x-3 top-0 hidden h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:block"
            aria-hidden
          />
          <RecruiterPerformanceRatingStars
            rating={displayRating}
            size="sm"
            variant="nav"
            className="relative z-10"
          />
          <span className="relative z-10 flex min-w-0 flex-col items-start leading-none">
            <span className="text-sm font-bold tabular-nums text-amber-700 group-hover:text-amber-800 dark:text-amber-200 dark:drop-shadow-sm dark:group-hover:text-amber-100">
              {displayScore}
            </span>
            <span className="hidden max-w-[88px] truncate text-[10px] font-medium text-amber-600/90 sm:block dark:text-amber-100/75">
              {displayRating}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(100vw-2rem,320px)] overflow-hidden border border-border bg-popover p-0 shadow-2xl dark:border-white/30 dark:bg-card/70 dark:shadow-black/25 dark:backdrop-blur-xl"
      >
        <div className="relative border-b border-border bg-gradient-to-br from-amber-50 via-white to-violet-50/80 px-4 py-3.5 dark:border-white/40 dark:from-amber-400/20 dark:via-white/50 dark:to-violet-100/30">
          <div
            className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-white/60 via-transparent to-transparent dark:block"
            aria-hidden
          />
          <div className="relative z-10 flex items-center gap-3">
            <div className="rounded-xl border border-white/40 bg-gradient-to-br from-amber-400/90 to-amber-600 p-2 text-white shadow-md backdrop-blur-sm">
              <TrendingUp className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Your performance</p>
              <p className="text-xs text-muted-foreground">Weighted score from your pipeline</p>
            </div>
          </div>
        </div>
        <div className="space-y-2 bg-muted/30 p-3 dark:bg-card/40 dark:backdrop-blur-sm">
          {monthly ? (
            <PeriodRatingRow
              label="This month"
              score={monthly.score}
              rating={monthly.rating}
              periodLabel={periodLabels.month}
            />
          ) : null}
          {yearly ? (
            <PeriodRatingRow
              label="This year"
              score={yearly.score}
              rating={yearly.rating}
              periodLabel={periodLabels.year}
            />
          ) : null}
          {!monthly && !yearly ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No performance data yet. Progress candidates through the funnel to earn points.
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1 w-full border-amber-200/80 bg-card text-amber-900 hover:bg-amber-50/80 dark:border-amber-200/80 dark:bg-card/50 dark:text-amber-900 dark:backdrop-blur-sm dark:hover:bg-amber-50/80"
            onClick={() => navigate("/candidates/overview")}
          >
            View full breakdown
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default RecruiterNavPerformanceRating;
