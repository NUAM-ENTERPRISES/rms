import { Clock, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { ProjectStats as ProjectStatsType } from "@/features/projects";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { StatusTile } from "../molecules/StatusTile";

interface ProjectStatsProps {
  stats: ProjectStatsType;
  className?: string;
  tableRef?: React.RefObject<HTMLDivElement>;
}

export default function ProjectStats({ stats, className, tableRef }: ProjectStatsProps) {
  const statsData = [
    {
      label: "Total Projects",
      value: stats.totalProjects,
      subtitle: "All time",
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      lightBg: "from-blue-50 to-blue-100/50",
      iconBg: "bg-blue-200/40",
      textColor: "text-blue-600",
      statusFilter: undefined,
    },
    {
      label: "Active Projects",
      value: stats.activeProjects,
      subtitle: "In progress",
      icon: Clock,
      color: "from-emerald-500 to-teal-500",
      lightBg: "from-emerald-50 to-emerald-100/50",
      iconBg: "bg-emerald-200/40",
      textColor: "text-emerald-600",
      statusFilter: "ACTIVE",
    },
    {
      label: "Completed",
      value: stats.completedProjects,
      subtitle: "Delivered",
      icon: CheckCircle2,
      color: "from-purple-500 to-pink-500",
      lightBg: "from-purple-50 to-purple-100/50",
      iconBg: "bg-purple-200/40",
      textColor: "text-purple-600",
      statusFilter: "COMPLETED",
    },
    {
      label: "Urgent Deadlines",
      value: stats.upcomingDeadlines.length,
      subtitle: "This week",
      icon: AlertTriangle,
      color: "from-orange-500 to-red-500",
      lightBg: "from-orange-50 to-orange-100/50",
      iconBg: "bg-orange-200/40",
      textColor: "text-orange-600",
      statusFilter: undefined,
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat, i) => {
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <StatusTile
                label={stat.label}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                bgGradient={stat.lightBg}
                iconBg={stat.iconBg}
                textColor={stat.textColor}
                scrollTargetRef={tableRef}
                scrollOnClick={true}
                className="h-full"
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
