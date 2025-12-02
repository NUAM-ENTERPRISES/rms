import { Clock, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { ProjectStats as ProjectStatsType } from "@/features/projects";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProjectStatsProps {
  stats: ProjectStatsType;
  className?: string;
}

export default function ProjectStats({ stats, className }: ProjectStatsProps) {
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
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat, i) => {
          const Icon = stat.icon;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Card
                className={cn(
                  "relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br",
                  stat.lightBg,
                  "hover:shadow-md transition-all duration-300 group cursor-default"
                )}
              >
                <CardContent className="px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                        {stat.label}
                      </p>
                      <h3
                        className={cn(
                          "text-xl font-bold leading-tight",
                          stat.textColor
                        )}
                      >
                        {stat.value}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {stat.subtitle}
                      </p>
                    </div>

                    <div className={cn("p-2 rounded-xl", stat.iconBg)}>
                      <Icon className={cn("h-4 w-4", stat.textColor)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
