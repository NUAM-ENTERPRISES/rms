import { Users, FolderKanban, CheckCircle2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentCandidateStats } from "../../api";

export type CandidateListFilter = "all" | "interview_passed";

type AgentDetailsStatsProps = {
  stats: AgentCandidateStats | undefined;
  totalCount: number;
  candidateFilter: CandidateListFilter;
  onCandidateFilterChange: (filter: CandidateListFilter) => void;
};

const accentStyles = {
  blue: {
    card: "from-blue-50 via-white to-blue-50/30 border-blue-100",
    iconBg: "bg-blue-100",
    icon: "text-blue-600",
    value: "text-blue-700",
    ring: "ring-blue-400",
    dot: "bg-blue-500",
  },
  emerald: {
    card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100",
    iconBg: "bg-emerald-100",
    icon: "text-emerald-600",
    value: "text-emerald-700",
    ring: "ring-emerald-400",
    dot: "bg-emerald-500",
  },
  amber: {
    card: "from-amber-50 via-white to-amber-50/30 border-amber-100",
    iconBg: "bg-amber-100",
    icon: "text-amber-600",
    value: "text-amber-700",
    ring: "ring-amber-400",
    dot: "bg-amber-500",
  },
} as const;

export function AgentDetailsStats({
  stats,
  totalCount,
  candidateFilter,
  onCandidateFilterChange,
}: AgentDetailsStatsProps) {
  const interviewPassedCount = stats?.interviewPassedCandidates ?? 0;

  const tiles = [
    {
      label: "Total Candidates",
      value: stats?.totalCandidates ?? totalCount,
      subtitle: "All time referrals",
      Icon: Users,
      accent: "blue" as const,
      filter: "all" as CandidateListFilter,
      clickable: true,
    },
    {
      label: "Linked Projects",
      value: stats?.linkedProjects ?? 0,
      subtitle: "Client projects tied to this agent",
      Icon: FolderKanban,
      accent: "emerald" as const,
      filter: null,
      clickable: false,
    },
    {
      label: "Interview Passed",
      value: interviewPassedCount,
      subtitle: "Candidates with interview passed in history",
      Icon: CheckCircle2,
      accent: "amber" as const,
      filter: "interview_passed" as CandidateListFilter,
      clickable: true,
    },
  ];

  return (
    <div className="px-6 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const s = accentStyles[tile.accent];
          const isActive = tile.filter != null && candidateFilter === tile.filter;

          const content = (
            <>
              {isActive && (
                <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tile.label}</p>
                  <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{tile.value}</p>
                  <p className="text-xs text-slate-500">{tile.subtitle}</p>
                </div>
                <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                  <tile.Icon className={cn("h-5 w-5", s.icon)} />
                </div>
              </div>
              <div
                className={cn(
                  "mt-3 flex items-center gap-1 text-xs font-medium text-slate-400",
                  tile.clickable && "group-hover:text-slate-600 transition-colors",
                )}
              >
                <span>
                  {tile.clickable
                    ? isActive
                      ? "Viewing now"
                      : "Click to filter"
                    : "Agent overview"}
                </span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </>
          );

          if (tile.clickable && tile.filter) {
            return (
              <button
                key={tile.label}
                type="button"
                onClick={() => onCandidateFilterChange(tile.filter!)}
                className={cn(
                  "group relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200 focus:outline-none",
                  s.card,
                  isActive ? `ring-2 shadow-md ${s.ring}` : "hover:-translate-y-0.5 hover:shadow-md",
                )}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={tile.label}
              className={cn("relative rounded-2xl border bg-gradient-to-br p-5 shadow-sm", s.card)}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
