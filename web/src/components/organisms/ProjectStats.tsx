import React from "react";
import {
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { ProjectStats as ProjectStatsType } from "@/features/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectStatsProps {
  stats: ProjectStatsType;
  className?: string;
}

export default function ProjectStats({ stats, className }: ProjectStatsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50 border-green-200";
      case "completed":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "cancelled":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return Clock;
      case "completed":
        return CheckCircle;
      case "cancelled":
        return XCircle;
      default:
        return Building2;
    }
  };

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case "total":
        return "text-blue-600";
      case "active":
        return "text-green-600";
      case "completed":
        return "text-blue-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case "total":
        return Building2;
      case "active":
        return Clock;
      case "completed":
        return CheckCircle;
      case "cancelled":
        return XCircle;
      default:
        return TrendingUp;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Individual Metric Cards - Ultra Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Projects */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 border border-blue-200/50 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-200/50 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 shadow-lg shadow-blue-200/50 group-hover:shadow-xl group-hover:shadow-blue-300/50 transition-all duration-300">
              <Clock className="h-5 w-5 text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-blue-800 truncate drop-shadow-sm">
                {stats.activeProjects}
              </p>
              <p className="text-sm text-blue-600 truncate font-medium">
                Active
              </p>
            </div>
          </div>
        </div>

        {/* Completed Projects */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 via-green-100 to-green-50 border border-green-200/50 hover:border-green-300 hover:shadow-lg hover:shadow-green-200/50 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-500 shadow-lg shadow-green-200/50 group-hover:shadow-xl group-hover:shadow-green-300/50 transition-all duration-300">
              <CheckCircle className="h-5 w-5 text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-green-800 truncate drop-shadow-sm">
                {stats.completedProjects}
              </p>
              <p className="text-sm text-green-600 truncate font-medium">
                Completed
              </p>
            </div>
          </div>
        </div>

        {/* Total Projects */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 via-indigo-100 to-indigo-50 border border-indigo-200/50 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-200/50 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-500 shadow-lg shadow-indigo-200/50 group-hover:shadow-xl group-hover:shadow-indigo-300/50 transition-all duration-300">
              <Building2 className="h-5 w-5 text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-indigo-800 truncate drop-shadow-sm">
                {stats.totalProjects}
              </p>
              <p className="text-sm text-indigo-600 truncate font-medium">
                Total
              </p>
            </div>
          </div>
        </div>

        {/* Urgent Deadlines */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 border border-orange-200/50 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-200/50 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg shadow-orange-200/50 group-hover:shadow-xl group-hover:shadow-orange-300/50 transition-all duration-300">
              <AlertTriangle className="h-5 w-5 text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-orange-800 truncate drop-shadow-sm">
                {stats.upcomingDeadlines.length}
              </p>
              <p className="text-sm text-orange-600 truncate font-medium">
                Urgent
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
