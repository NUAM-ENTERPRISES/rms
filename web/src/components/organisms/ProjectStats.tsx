import { Clock, CheckCircle2, AlertTriangle, Users, ArrowUpRight } from "lucide-react";
import { ProjectStatus } from "@/entities/project/constants";
import { ProjectStats as ProjectStatsType } from "@/features/projects";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProjectStatsProps {
  stats: ProjectStatsType;
  className?: string;
  /** When false, tiles are display-only (no click, no filter footer). Default true. */
  interactive?: boolean;
  onSelect?: (filters: { status?: string; isUrgent?: boolean; priority?: string }) => void;
  activeFilter?: { status?: string; isUrgent?: boolean; priority?: string };
}

const accentStyles: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
  blue:    { card: "from-blue-50 via-white to-blue-50/30 border-blue-100",       icon: "text-blue-600",    iconBg: "bg-blue-100",    value: "text-blue-700",    ring: "ring-blue-400/50",    dot: "bg-blue-500"    },
  emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", value: "text-emerald-700", ring: "ring-emerald-400/50", dot: "bg-emerald-500" },
  purple:  { card: "from-purple-50 via-white to-purple-50/30 border-purple-100", icon: "text-purple-600",   iconBg: "bg-purple-100",   value: "text-purple-700",   ring: "ring-purple-400/50",   dot: "bg-purple-500"   },
  orange:  { card: "from-orange-50 via-white to-orange-50/30 border-orange-100", icon: "text-orange-600",   iconBg: "bg-orange-100",   value: "text-orange-700",   ring: "ring-orange-400/50",   dot: "bg-orange-500"   },
  red:     { card: "from-red-50 via-white to-red-50/30 border-red-100",       icon: "text-red-600",      iconBg: "bg-red-100",      value: "text-red-700",      ring: "ring-red-400/50",      dot: "bg-red-500"      },
};

export default function ProjectStats({ 
  stats, 
  className,
  interactive = true,
  onSelect,
  activeFilter 
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
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {statsData.map((stat, i) => {
        const Icon = stat.icon;
        const s = accentStyles[stat.accent];
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

        const cardClassName = cn(
          "relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200",
          s.card,
          interactive && (isActive ? `ring-2 shadow-md ${s.ring}` : "hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-none")
        );

        const cardContent = (
          <>
            {isActive && (
              <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />
            )}
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
            {interactive && (
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            )}
          </>
        );

        return interactive ? (
          <motion.button
            key={stat.label}
            type="button"
            onClick={() => onSelect?.(stat.filter)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={cn("group", cardClassName)}
          >
            {cardContent}
          </motion.button>
        ) : (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={cardClassName}
          >
            {cardContent}
          </motion.div>
        );
      })}
    </div>
  );
}
