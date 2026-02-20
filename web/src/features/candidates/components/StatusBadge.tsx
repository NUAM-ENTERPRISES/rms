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
    untouched: "bg-orange-50 text-orange-700 border-orange-200 shadow-orange-100/50",
    interested: "bg-green-50 text-green-700 border-green-200 shadow-green-100/50",
    "not interested": "bg-red-50 text-red-700 border-red-200 shadow-red-100/50",
    "not eligible": "bg-red-50 text-red-700 border-red-200 shadow-red-100/50",
    "other enquiry": "bg-purple-50 text-purple-700 border-purple-200 shadow-purple-100/50",
    future: "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-indigo-100/50",
    "on hold": "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-yellow-100/50",
    onhold: "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-yellow-100/50",
    rnr: "bg-pink-50 text-pink-700 border-pink-200 shadow-pink-100/50",
    qualified: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100/50",
    working: "bg-blue-50 text-blue-700 border-blue-200 shadow-blue-100/50",
    selected: "bg-green-50 text-green-700 border-green-200 shadow-green-100/50",
    rejected: "bg-red-50 text-red-700 border-red-200 shadow-red-100/50",
    "in-process": "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-indigo-100/50",
    shortlisted: "bg-cyan-50 text-cyan-700 border-cyan-200 shadow-cyan-100/50",
    interviewed: "bg-purple-50 text-purple-700 border-purple-200 shadow-purple-100/50",
    offered: "bg-orange-50 text-orange-700 border-orange-200 shadow-orange-100/50",
    placed: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100/50",
    withdrawn: "bg-rose-50 text-rose-700 border-rose-200 shadow-rose-100/50",
  };

  const customClass = colorMap[safeStatus] || config.badgeClass;

  return (
    <Badge className={`${customClass} border gap-1.5 px-2.5 py-1 font-bold shadow-sm transition-all hover:shadow-md`}>
      <Icon className="h-3.5 w-3.5" />
      {label || config.label}
    </Badge>
  );
};
