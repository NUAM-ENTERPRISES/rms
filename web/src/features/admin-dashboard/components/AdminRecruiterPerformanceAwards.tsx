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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Crown,
  Mail,
  Medal,
  Phone,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetTopRecruiterStatsQuery,
  type PerformanceLeaderboardEntry,
  type RecruiterAwardWinner,
} from "@/features/admin/api/adminDashboardApi";
import { PerformanceRatingMedalBadge } from "@/features/candidates/components/PerformanceRatingMedalBadge";
import {
  CHART_COLORS,
  DEFAULT_PERFORMANCE_RATING,
  formatRatingScoreRange,
  RATING_CARD_BORDER,
} from "@/features/candidates/utils/recruiter-performance-rating.util";

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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AwardWinnerCard({
  title,
  subtitle,
  winner,
  accent,
  isLoading,
}: {
  title: string;
  subtitle: string;
  winner: RecruiterAwardWinner | null;
  accent: "month" | "year";
  isLoading: boolean;
}) {
  const rating = winner?.rating ?? "—";
  const borderClass =
    rating !== "—"
      ? RATING_CARD_BORDER[rating] ?? RATING_CARD_BORDER[DEFAULT_PERFORMANCE_RATING]
      : "border-slate-200";

  const accentStyles =
    accent === "month"
      ? "from-amber-500/15 via-orange-50 to-white"
      : "from-violet-500/15 via-indigo-50 to-white";

  const iconWrap =
    accent === "month" ? (
      <div className="rounded-full bg-amber-100 p-2 text-amber-700">
        <Medal className="h-5 w-5" aria-hidden />
      </div>
    ) : (
      <div className="rounded-full bg-violet-100 p-2 text-violet-700">
        <Crown className="h-5 w-5" aria-hidden />
      </div>
    );

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br shadow-sm flex flex-col",
        accentStyles,
        borderClass,
      )}
      aria-label={title}
    >
      <div className="absolute top-3 right-3">{iconWrap}</div>
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {title}
          </p>
          <p className="text-sm text-slate-600 mt-0.5">{subtitle}</p>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <p className="text-sm text-slate-400">Loading award...</p>
          </div>
        ) : !winner ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-center gap-2">
            <Award className="h-10 w-10 text-slate-300" aria-hidden />
            <p className="text-sm font-medium text-slate-500">No award for this period</p>
            <p className="text-xs text-slate-400">
              Rankings use weighted performance scores only
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-white shadow-md">
                {winner.avatarUrl ? (
                  <AvatarImage src={winner.avatarUrl} alt={winner.name} />
                ) : (
                  <AvatarFallback className="bg-indigo-600 text-white font-bold">
                    {getInitials(winner.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900 truncate">{winner.name}</h3>
                <p className="text-sm text-slate-500">{winner.role}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">Overall rating</span>
                {rating !== "—" ? (
                  <PerformanceRatingMedalBadge
                    rating={rating}
                    size="sm"
                    showTopTierLabel={rating === "Elite"}
                  />
                ) : (
                  <Badge variant="outline" className="font-semibold">
                    —
                  </Badge>
                )}
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-3xl font-extrabold tabular-nums text-slate-900 leading-none">
                    {winner.performanceScore}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">performance points</p>
                </div>
                <p className="text-[10px] text-slate-500 text-right max-w-[120px]">
                  {formatRatingScoreRange(rating)}
                </p>
              </div>
              <p className="text-xs text-slate-600 border-t border-slate-100 pt-2">
                <span className="font-semibold text-slate-800">{winner.deployedCount}</span>{" "}
                deployed in period
              </p>
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              {winner.email && (
                <p className="flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {winner.email}
                </p>
              )}
              {winner.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {winner.phone}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function LeaderboardTable({
  rows,
  highlightId,
}: {
  rows: PerformanceLeaderboardEntry[];
  highlightId?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">No rankings for this period</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="pb-2 pr-3 font-semibold">#</th>
            <th className="pb-2 pr-3 font-semibold">Recruiter</th>
            <th className="pb-2 pr-3 font-semibold text-right">Score</th>
            <th className="pb-2 pr-3 font-semibold">Rating</th>
            <th className="pb-2 font-semibold text-right">Deployed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isWinner = row.id === highlightId;
            return (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-slate-50 last:border-0",
                  isWinner && "bg-indigo-50/60",
                )}
              >
                <td className="py-3 pr-3 tabular-nums font-semibold text-slate-700">
                  {index === 0 ? (
                    <Trophy className="h-4 w-4 text-amber-500 inline" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </td>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      {row.avatarUrl ? (
                        <AvatarImage src={row.avatarUrl} alt={row.name} />
                      ) : (
                        <AvatarFallback className="text-xs bg-slate-200">
                          {getInitials(row.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="font-medium text-slate-800 truncate">{row.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-right font-bold tabular-nums text-slate-900">
                  {row.performanceScore}
                </td>
                <td className="py-3 pr-3">
                  <PerformanceRatingMedalBadge
                    rating={row.rating}
                    size="sm"
                    showTopTierLabel={row.rating === "Elite"}
                  />
                </td>
                <td className="py-3 text-right tabular-nums text-slate-600">
                  {row.placementsThisMonth}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminRecruiterPerformanceAwards() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [leaderboardView, setLeaderboardView] = useState<"monthly" | "yearly">("monthly");

  const { data, isLoading, isError } = useGetTopRecruiterStatsQuery({ year, month });
  const payload = data?.data;

  const monthWinner = payload?.recruiterOfTheMonth ?? null;
  const yearWinner = payload?.recruiterOfTheYear ?? null;
  const chartActivities = payload?.recruiterActivities ?? [];
  const leaderboardRows =
    leaderboardView === "monthly"
      ? payload?.monthlyLeaderboard ?? []
      : payload?.yearlyLeaderboard ?? [];
  const highlightId =
    leaderboardView === "monthly" ? monthWinner?.id : yearWinner?.id;

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return [current - 1, current, current + 1];
  }, [now]);

  const periodMonthLabel = `${MONTH_LABELS[month - 1]} ${year}`;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/50 to-white shadow-sm"
      aria-labelledby="admin-recruiter-awards-heading"
    >
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2
            id="admin-recruiter-awards-heading"
            className="text-lg font-semibold text-slate-900 flex items-center gap-2"
          >
            <Trophy className="h-5 w-5 text-amber-500" aria-hidden />
            Recruiter performance awards
          </h2>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Winners ranked by weighted performance score (same rules as recruiter dashboard)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl" aria-label="Award month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-10 rounded-xl" aria-label="Award year">
              <SelectValue />
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

      {isError && (
        <p className="mx-5 mt-4 text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2" role="alert">
          Failed to load recruiter performance awards.
        </p>
      )}

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <AwardWinnerCard
            title="Recruiter of the month"
            subtitle={`Best performance in ${periodMonthLabel}`}
            winner={monthWinner}
            accent="month"
            isLoading={isLoading}
          />
          <AwardWinnerCard
            title="Recruiter of the year"
            subtitle={`Best performance in ${year}`}
            winner={yearWinner}
            accent="year"
            isLoading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Performance leaderboard</h3>
                <p className="text-xs text-slate-500">Top recruiters by weighted score</p>
              </div>
              <div
                className="flex rounded-lg border border-slate-200 overflow-hidden"
                role="group"
                aria-label="Leaderboard period"
              >
                {(["monthly", "yearly"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setLeaderboardView(view)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer",
                      leaderboardView === view
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-50",
                    )}
                    aria-pressed={leaderboardView === view}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
            <LeaderboardTable rows={leaderboardRows} highlightId={highlightId} />
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              Month winner — pipeline breakdown
            </h3>
            <p className="text-xs text-slate-500 mb-3">{periodMonthLabel}</p>
            {isLoading || chartActivities.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                {isLoading ? "Loading..." : "No stage data for month winner"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartActivities} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" />
                  <XAxis
                    dataKey="activity"
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "0.75rem",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                    {chartActivities.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
