import {
  Building2,
  Briefcase,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTileAccent } from "@/lib/tile-accent-styles";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";
import { useGetCoordinatorDashboardStatsQuery } from "../api/projectCoordinatorDashboardApi";

function SkeletonCard() {
  return (
    <div className="relative rounded-2xl border bg-gradient-to-br from-muted to-card p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-8 w-16 rounded bg-muted" />
          <div className="h-3 w-28 rounded bg-muted" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-muted" />
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-muted" />
    </div>
  );
}

export default function CoordinatorStatsCards() {
  const { data, isLoading, isError } = useGetCoordinatorDashboardStatsQuery();
  const stats = data?.data;

  const totalProjects =
    (stats?.activeProjects ?? 0) +
    (stats?.completedProjects ?? 0) +
    (stats?.onHoldProjects ?? 0) +
    (stats?.cancelledProjects ?? 0);

  const statCards = [
    {
      id: "my-clients",
      label: "Total Projects",
      value: stats?.totalProjects ?? 0,
      subtitle: "All projects in the system",
      icon: Briefcase,
      accent: "emerald" as const,
      linkLabel: "View all projects",
      linkTo: "/projects",
    },
    {
      id: "active-projects",
      label: "In Progress Projects",
      value: stats?.activeProjects ?? 0,
      subtitle: "Currently in progress",
      icon: Briefcase,
      accent: "amber" as const,
      progress:
        stats?.totalProjects > 0
          ? ((stats?.activeProjects ?? 0) / stats?.totalProjects) * 100
          : 0,
      linkLabel: "View in-progress projects",
      linkTo: "/projects?status=in_progress",
    },
    {
      id: "completed-projects",
      label: "Completed Projects",
      value: stats?.completedProjects ?? 0,
      subtitle: "Successfully closed",
      icon: CheckCircle2,
      accent: "indigo" as const,
      progress:
        stats?.totalProjects > 0
          ? ((stats?.completedProjects ?? 0) / stats?.totalProjects) * 100
          : 0,
      linkLabel: "View completed projects",
      linkTo: "/projects?status=completed",
    },
    {
      id: "on-hold-projects",
      label: "On Hold Projects",
      value: stats?.onHoldProjects ?? 0,
      subtitle: "Temporarily paused",
      icon: Briefcase,
      accent: "emerald" as const,
      progress:
        stats?.totalProjects > 0
          ? ((stats?.onHoldProjects ?? 0) / stats?.totalProjects) * 100
          : 0,
      linkLabel: "View on-hold projects",
      linkTo: "/projects?status=on_hold",
    },
    {
      id: "cancelled-projects",
      label: "Cancelled Projects",
      value: stats?.cancelledProjects ?? 0,
      subtitle: "No longer active",
      icon: Briefcase,
      accent: "amber" as const,
      progress:
        stats?.totalProjects > 0
          ? ((stats?.cancelledProjects ?? 0) / stats?.totalProjects) * 100
          : 0,
      linkLabel: "View cancelled projects",
      linkTo: "/projects?status=cancelled",
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
      <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const styles = getTileAccent(stat.accent);

          return (
            <DashboardStatTile
              key={stat.id}
              accent={stat.accent}
              label={stat.label}
              value={stat.value.toLocaleString()}
              subtitle={stat.subtitle}
              icon={stat.icon}
              as="div"
              className="overflow-hidden hover:shadow-md transition-shadow"
              footerText={stat.linkTo ? stat.linkLabel : undefined}
            >
              {stat.progress !== undefined && (
                <div className="mt-3">
                  <div className={cn("h-1.5 w-full overflow-hidden rounded-full", styles.iconBg)}>
                    <div
                      className={cn("h-full rounded-full transition-all duration-700 ease-out", styles.dot)}
                      style={{ width: `${Math.min(stat.progress, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </DashboardStatTile>
          );
        })}
      </div>
    </div>
  );
}
