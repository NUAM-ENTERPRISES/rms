import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  User,
  CheckCircle,
  XCircle,
  Clock,
  CheckCircle2,
  UserCheck,
  Star,
  Briefcase,
  FileText,
  Award,
  UserX,
} from "lucide-react";
import { useStatusConfig } from "../hooks/useStatusConfig";

interface StatusBadgeProps {
  status?: string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const { statusConfig } = useStatusConfig();
  const safeStatus = (status || "unknown").toLowerCase().trim().replace(/_/g, " ");
  
  // Try to find config using normalized key
  const config = Object.entries(statusConfig).find(([key]) => 
    key.toLowerCase().trim().replace(/_/g, " ") === safeStatus
  )?.[1];

  if (!config) {
    return (
      <Badge className="bg-slate-100 text-slate-800 border-slate-200 border gap-1 px-2 py-1 shadow-sm">
        <AlertTriangle className="h-3 w-3" />
        {label || (status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown")}
      </Badge>
    );
  }

  // Map icon names to actual components
  const iconMap: Record<string, any> = {
    User: User,
    ThumbsUp: CheckCircle,
    XCircle: XCircle,
    MessageCircle: Clock,
    Clock: Clock,
    Pause: Clock,
    PhoneOff: XCircle,
    CheckCircle: CheckCircle2,
    CheckCircle2: CheckCircle2,
    UserPlus: UserCheck,
    UserCheck: UserCheck,
    Users: UserCheck,
    Star: Star,
    Cog: Clock,
    BadgeCheck: CheckCircle2,
    Briefcase: Briefcase,
    FileText: FileText,
    Award: Award,
    UserX: UserX,
  };

  const Icon = iconMap[config.icon] || AlertTriangle;

  // Custom coloring logic to match CandidatePipeline/StatusUpdateModal
  const colorMap: Record<string, string> = {
    untouched: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 shadow-orange-100/50 dark:shadow-none",
    interested: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 shadow-green-100/50 dark:shadow-none",
    "not interested": "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 shadow-red-100/50 dark:shadow-none",
    "not eligible": "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 shadow-red-100/50 dark:shadow-none",
    "other enquiry": "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 shadow-purple-100/50 dark:shadow-none",
    future: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-indigo-100/50 dark:shadow-none",
    "on hold": "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 shadow-yellow-100/50 dark:shadow-none",
    onhold: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 shadow-yellow-100/50 dark:shadow-none",
    rnr: "bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800 shadow-pink-100/50 dark:shadow-none",
    qualified: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shadow-emerald-100/50 dark:shadow-none",
    working: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-blue-100/50 dark:shadow-none",
    selected: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 shadow-green-100/50 dark:shadow-none",
    rejected: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 shadow-red-100/50 dark:shadow-none",
    "in-process": "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-indigo-100/50 dark:shadow-none",
    shortlisted: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 shadow-cyan-100/50 dark:shadow-none",
    interviewed: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 shadow-purple-100/50 dark:shadow-none",
    offered: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 shadow-orange-100/50 dark:shadow-none",
    placed: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shadow-emerald-100/50 dark:shadow-none",
    withdrawn: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 shadow-rose-100/50 dark:shadow-none",
  };

  const customClass = colorMap[safeStatus] || config.badgeClass;

  return (
    <Badge className={`${customClass} border gap-1.5 px-2.5 py-1 font-bold shadow-sm transition-all hover:shadow-md`}>
      <Icon className="h-3.5 w-3.5" />
      {label || config.label}
    </Badge>
  );
};
