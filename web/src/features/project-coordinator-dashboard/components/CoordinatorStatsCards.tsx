import {
  Building2,
  Briefcase,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetCoordinatorDashboardStatsQuery } from "../api/projectCoordinatorDashboardApi";

const accentStyles: Record<
  string,
  {
    card: string;
    icon: string;
    iconBg: string;
    value: string;
    ring: string;
    dot: string;
    progressTrack: string;
    progressBar: string;
  }
> = {
  emerald: {
    card: "from-emerald-50/80 via-white to-emerald-50/20 border-emerald-100/80",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-100/80",
    value: "text-emerald-700",
    ring: "ring-emerald-400/30",
    dot: "bg-emerald-500",
    progressTrack: "bg-emerald-100",
    progressBar: "bg-emerald-500",
  },
  amber: {
    card: "from-amber-50/80 via-white to-amber-50/20 border-amber-100/80",
    icon: "text-amber-600",
    iconBg: "bg-amber-100/80",
    value: "text-amber-700",
    ring: "ring-amber-400/30",
    dot: "bg-amber-500",
    progressTrack: "bg-amber-100",
    progressBar: "bg-amber-500",
  },
  indigo: {
    card: "from-indigo-50/80 via-white to-indigo-50/20 border-indigo-100/80",
    icon: "text-indigo-600",
    iconBg: "bg-indigo-100/80",
    value: "text-indigo-700",
    ring: "ring-indigo-400/30",
    dot: "bg-indigo-500",
    progressTrack: "bg-indigo-100",
    progressBar: "bg-indigo-500",
  },
  teal: {
    card: "from-teal-50/80 via-white to-teal-50/20 border-teal-100/80",
    icon: "text-teal-600",
    iconBg: "bg-teal-100/80",
    value: "text-teal-700",
    ring: "ring-teal-400/30",
    dot: "bg-teal-500",
    progressTrack: "bg-teal-100",
    progressBar: "bg-teal-500",
  },
};

function SkeletonCard() {
  return (
    <div className="relative rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-slate-50/30 p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-slate-200" />
          <div className="h-8 w-16 rounded bg-slate-200" />
          <div className="h-3 w-28 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-slate-200" />
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100" />
    </div>
  );
}

export default function CoordinatorStatsCards() {
  const { data, isLoading, isError } = useGetCoordinatorDashboardStatsQuery();
  const stats = data?.data;

  const totalProjects =
    (stats?.activeProjects ?? 0) + (stats?.completedProjects ?? 0);

  const statCards = [
    {
      id: "my-clients",
      label: "My Clients",
      value: stats?.myClients ?? 0,
      subtitle: "Clients in your portfolio",
      icon: Building2,
      accent: "emerald" as const,
      linkLabel: "View clients",
      linkTo: "/clients",
    },
    {
      id: "active-projects",
      label: "Active Projects",
      value: stats?.activeProjects ?? 0,
      subtitle: "Currently hiring",
      icon: Briefcase,
      accent: "amber" as const,
      progress:
        totalProjects > 0
          ? ((stats?.activeProjects ?? 0) / totalProjects) * 100
          : 0,
      linkLabel: "View projects",
      linkTo: "/projects",
    },
    {
      id: "completed-projects",
      label: "Completed",
      value: stats?.completedProjects ?? 0,
      subtitle: "Successfully closed",
      icon: CheckCircle2,
      accent: "indigo" as const,
      progress:
        totalProjects > 0
          ? ((stats?.completedProjects ?? 0) / totalProjects) * 100
          : 0,
      linkLabel: "View projects",
      linkTo: "/projects",
    },
    {
      id: "candidates-filled",
      label: "Candidates Deployed",
      value: stats?.candidatesFilled ?? 0,
      subtitle: "Hired or deployed",
      icon: UserCheck,
      accent: "teal" as const,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isError && (
        <p className="text-sm text-destructive">
          Failed to load dashboard stats. Please refresh the page.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const styles = accentStyles[stat.accent];

          return (
            <div
              key={stat.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-shadow hover:shadow-md",
                styles.card
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p
                      className={cn(
                        "text-3xl font-bold tabular-nums tracking-tight",
                        styles.value
                      )}
                    >
                      {stat.value.toLocaleString()}
                    </p>
                    {stat.value > 0 && (
                      <TrendingUp
                        className={cn("h-4 w-4", styles.icon)}
                        aria-hidden
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{stat.subtitle}</p>
                </div>
                <div
                  className={cn(
                    "shrink-0 rounded-xl p-2.5 shadow-sm transition-transform group-hover:scale-110",
                    styles.iconBg,
                    styles.ring,
                    "ring-2"
                  )}
                >
                  <Icon className={cn("h-5 w-5", styles.icon)} aria-hidden />
                </div>
              </div>

              {stat.progress !== undefined && (
                <div className="mt-3">
                  <div
                    className={cn(
                      "h-1.5 w-full overflow-hidden rounded-full",
                      styles.progressTrack
                    )}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        styles.progressBar
                      )}
                      style={{ width: `${Math.min(stat.progress, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {stat.linkTo && (
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-600">
                  <span>{stat.linkLabel}</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
