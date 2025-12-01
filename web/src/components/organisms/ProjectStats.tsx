import React from "react";
import {
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
} from "lucide-react";
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
    <div className={cn("space-y-8", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
                  "relative overflow-hidden border-0 shadow-lg bg-gradient-to-br",
                  stat.lightBg,
                  "backdrop-blur-sm hover:shadow-xl transition-all duration-300 group cursor-default"
                )}
              >
                {/* Subtle hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">
                        {stat.label}
                      </p>
                      <h3 className={cn("text-3xl font-bold", stat.textColor)}>
                        {stat.value}
                      </h3>
                      <p className="text-xs text-slate-500 mt-2">
                        {stat.subtitle}
                      </p>
                    </div>

                    <div className={cn("p-3 rounded-full", stat.iconBg)}>
                      <Icon className={cn("h-6 w-6", stat.textColor)} />
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