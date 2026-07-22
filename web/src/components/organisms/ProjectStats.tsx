import { Clock, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { ProjectStatus } from "@/entities/project/constants";
import { ProjectStats as ProjectStatsType } from "@/features/projects";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";

interface ProjectStatsProps {
  stats: ProjectStatsType;
  className?: string;
  /** When false, tiles are display-only (no click, no filter footer). Default true. */
  interactive?: boolean;
  onSelect?: (filters: { status?: string; isUrgent?: boolean; priority?: string }) => void;
  activeFilter?: { status?: string; isUrgent?: boolean; priority?: string };
}

export default function ProjectStats({
  stats,
  className,
  interactive = true,
  onSelect,
  activeFilter,
}: ProjectStatsProps) {
  const statsData = [
    {
      label: "Total Projects",
      value: stats.totalProjects,
      subtitle: "All time",
      icon: Users,
      accent: "blue",
      filter: {},
    },
    {
      label: "In Progress Projects",
      value: stats.inProgressProjects,
      subtitle: "Currently running",
      icon: Clock,
      accent: "emerald",
      filter: { status: ProjectStatus.IN_PROGRESS },
    },
    {
      label: "Completed Projects",
      value: stats.completedProjects,
      subtitle: "Delivered & deadline closed",
      icon: CheckCircle2,
      accent: "purple",
      filter: { status: ProjectStatus.COMPLETED },
    },
    {
      label: "On Hold Projects",
      value: stats.onHoldProjects,
      subtitle: "Temporarily paused",
      icon: Clock,
      accent: "orange",
      filter: { status: ProjectStatus.ON_HOLD },
    },
    {
      label: "Cancelled Projects",
      value: stats.cancelledProjects,
      subtitle: "No longer active",
      icon: AlertTriangle,
      accent: "red",
      filter: { status: ProjectStatus.CANCELLED },
    },
    {
      label: "Urgent Deadlines Projects",
      value: stats.urgentProjectsCount ?? 0,
      subtitle: "Overdue or due within 7 days",
      icon: AlertTriangle,
      accent: "orange",
      filter: { isUrgent: true },
    },
  ];

  return (
    <div className={cn("grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {statsData.map((stat, i) => {
        const isActive =
          interactive &&
          (() => {
            if (!activeFilter) return false;

            const statKeys = Object.keys(stat.filter);
            if (statKeys.length === 0) {
              return (
                !activeFilter.status &&
                !activeFilter.isUrgent &&
                !activeFilter.priority
              );
            }

            return statKeys.every(
              (key) =>
                activeFilter[key as keyof typeof activeFilter] ===
                stat.filter[key as keyof typeof stat.filter],
            );
          })();

        return (
          <motion.div
            key={stat.label}
            className="h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <DashboardStatTile
              accent={stat.accent}
              label={stat.label}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={stat.icon}
              active={isActive}
              interactive={interactive}
              footerText={
                interactive
                  ? isActive
                    ? "Viewing now"
                    : "Click to filter"
                  : undefined
              }
              onClick={interactive ? () => onSelect?.(stat.filter) : undefined}
              as={interactive ? "button" : "div"}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
