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
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        <p className="text-[10px] text-slate-500">{periodLabel}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <RecruiterPerformanceRatingStars rating={rating} size="md" variant="dashboard" />
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums text-amber-600">{score}</p>
          <p className="text-[10px] text-slate-500">points</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn("text-[10px] font-semibold", ratingClass)}>
          {rating}
        </Badge>
        <span className="text-[10px] text-slate-500">
          {formatRatingScoreRange(rating)}
        </span>
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
        className="flex h-10 items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3"
        aria-busy="true"
        aria-label="Loading performance rating"
      >
        <RecruiterPerformanceRatingStars rating="Poor" size="sm" variant="nav" className="opacity-40" />
        <div className="h-4 w-10 animate-pulse rounded bg-amber-400/20" />
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex items-center gap-2 rounded-xl border px-2.5 py-1.5 sm:px-3",
            "border-amber-400/35 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent",
            "text-amber-100 shadow-sm shadow-amber-500/10",
            "hover:border-amber-400/55 hover:from-amber-500/25 hover:shadow-amber-500/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
            "transition-all duration-200 cursor-pointer",
            isFetching && "opacity-90",
          )}
          aria-label={`Your performance rating: ${displayRating}, ${displayScore} points this month`}
        >
          <RecruiterPerformanceRatingStars
            rating={displayRating}
            size="sm"
            variant="nav"
          />
          <span className="flex flex-col items-start leading-none min-w-0">
            <span className="text-sm font-bold tabular-nums text-amber-300 group-hover:text-amber-200">
              {displayScore}
            </span>
            <span className="hidden text-[10px] font-medium text-amber-200/80 sm:block truncate max-w-[88px]">
              {displayRating}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(100vw-2rem,320px)] p-0 border-amber-200/60 shadow-xl"
      >
        <div className="rounded-t-xl bg-gradient-to-br from-amber-500/20 via-amber-50 to-white px-4 py-3 border-b border-amber-100">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
              <TrendingUp className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Your performance</p>
              <p className="text-xs text-slate-500">Weighted score from your pipeline</p>
            </div>
          </div>
        </div>
        <div className="p-3 space-y-2">
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
            <p className="text-sm text-slate-500 py-4 text-center">
              No performance data yet. Progress candidates through the funnel to earn points.
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full mt-1 border-amber-200 text-amber-900 hover:bg-amber-50"
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
