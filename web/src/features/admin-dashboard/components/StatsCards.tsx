import { Users, Building2, Briefcase, UserCheck, ArrowUpRight } from "lucide-react";
import { useGetAdminDashboardStatsQuery } from "@/features/admin/api/adminDashboardApi";
import { cn } from "@/lib/utils";

const accentStyles: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
  indigo:  { card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100",   icon: "text-indigo-600",  iconBg: "bg-indigo-100",  value: "text-indigo-700",  ring: "ring-indigo-400/50",  dot: "bg-indigo-500"  },
  emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", value: "text-emerald-700", ring: "ring-emerald-400/50", dot: "bg-emerald-500" },
  amber:   { card: "from-amber-50 via-white to-amber-50/30 border-amber-100",       icon: "text-amber-600",  iconBg: "bg-amber-100",  value: "text-amber-700",  ring: "ring-amber-400/50",  dot: "bg-amber-500"  },
  teal:    { card: "from-teal-50 via-white to-teal-50/30 border-teal-100",          icon: "text-teal-600",   iconBg: "bg-teal-100",   value: "text-teal-700",   ring: "ring-teal-400/50",   dot: "bg-teal-500"   },
};

export default function StatsCards() {
  const { data, isLoading } = useGetAdminDashboardStatsQuery();

  const statCards = [
    {
      label: "Total Candidates",
      value: isLoading ? "—" : (data?.data?.totalCandidates ?? 0).toLocaleString(),
      subtitle: "All candidates across all recruiters",
      icon: Users,
      accent: "indigo",
    },
    {
      label: "Active Clients",
      value: isLoading ? "—" : (data?.data?.activeClients ?? 0).toLocaleString(),
      subtitle: "All clients in the system",
      icon: Building2,
      accent: "emerald",
    },
    {
      label: "Active Projects",
      value: isLoading ? "—" : (data?.data?.openJobs ?? 0).toLocaleString(),
      subtitle: "Open jobs (active projects)",
      icon: Briefcase,
      accent: "amber",
    },
    {
      label: "Candidates Deployed",
      value: isLoading ? "—" : (data?.data?.candidatesPlaced ?? 0).toLocaleString(),
      subtitle: "Candidates deployed/flown",
      icon: UserCheck,
      accent: "teal",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const s = accentStyles[stat.accent];
        return (
          <div
            key={stat.label}
            className={cn(
              "relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm",
              s.card
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.subtitle}</p>
              </div>
              <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                <Icon className={cn("h-5 w-5", s.icon)} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400">
              <span>Overview</span>
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
