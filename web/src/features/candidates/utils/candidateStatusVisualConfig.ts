import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Award,
  Briefcase,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  Phone,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";

export type CandidateStatusVisualConfig = {
  color: string;
  bgColor: string;
  iconColor: string;
  badgeClass: string;
  icon: LucideIcon;
};

const statusConfigMap: Record<string, CandidateStatusVisualConfig> = {
  untouched: {
    color: "from-orange-400 to-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    iconColor: "text-orange-500",
    badgeClass: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    icon: AlertCircle,
  },
  interested: {
    color: "from-green-400 to-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    iconColor: "text-green-500",
    badgeClass: "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    icon: UserCheck,
  },
  "not interested": {
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    iconColor: "text-red-500",
    badgeClass: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    icon: XCircle,
  },
  "not eligible": {
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    iconColor: "text-red-500",
    badgeClass: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    icon: XCircle,
  },
  "other enquiry": {
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    iconColor: "text-purple-500",
    badgeClass: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: Mail,
  },
  future: {
    color: "from-indigo-400 to-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    iconColor: "text-indigo-500",
    badgeClass: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    icon: Calendar,
  },
  "on hold": {
    color: "from-yellow-400 to-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    iconColor: "text-yellow-500",
    badgeClass: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    icon: Clock,
  },
  onhold: {
    color: "from-yellow-400 to-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    iconColor: "text-yellow-500",
    badgeClass: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    icon: Clock,
  },
  rnr: {
    color: "from-pink-400 to-pink-600",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
    iconColor: "text-pink-500",
    badgeClass: "bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800",
    icon: AlertCircle,
  },
  "call back": {
    color: "from-cyan-400 to-teal-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    iconColor: "text-cyan-500",
    badgeClass: "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    icon: Phone,
  },
  call_back: {
    color: "from-cyan-400 to-teal-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    iconColor: "text-cyan-500",
    badgeClass: "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    icon: Phone,
  },
  qualified: {
    color: "from-emerald-400 to-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-500",
    badgeClass: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  working: {
    color: "from-blue-400 to-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-500",
    badgeClass: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: Briefcase,
  },
  deployed: {
    color: "from-blue-400 to-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-500",
    badgeClass: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: Briefcase,
  },
  selected: {
    color: "from-green-400 to-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    iconColor: "text-green-500",
    badgeClass: "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    icon: CheckCircle,
  },
  rejected: {
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    iconColor: "text-red-500",
    badgeClass: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    icon: XCircle,
  },
  "in-process": {
    color: "from-indigo-400 to-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    iconColor: "text-indigo-500",
    badgeClass: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    icon: FileText,
  },
  shortlisted: {
    color: "from-cyan-400 to-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    iconColor: "text-cyan-500",
    badgeClass: "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    icon: UserCheck,
  },
  interviewed: {
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    iconColor: "text-purple-500",
    badgeClass: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: Calendar,
  },
  offered: {
    color: "from-orange-400 to-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    iconColor: "text-orange-500",
    badgeClass: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    icon: Award,
  },
  placed: {
    color: "from-emerald-400 to-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-500",
    badgeClass: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: Briefcase,
  },
  withdrawn: {
    color: "from-rose-400 to-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    iconColor: "text-rose-500",
    badgeClass: "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    icon: UserX,
  },
  default: {
    color: "from-gray-400 to-gray-600",
    bgColor: "bg-muted",
    iconColor: "text-muted-foreground",
    badgeClass: "bg-muted text-foreground border-border",
    icon: AlertCircle,
  },
};

export function normalizeCandidateStatusKey(statusName?: string | null) {
  return (statusName || "").toLowerCase().trim().replace(/_/g, " ");
}

export function getCandidateStatusVisualConfig(
  statusName?: string | null,
): CandidateStatusVisualConfig {
  const name = normalizeCandidateStatusKey(statusName);
  return statusConfigMap[name] || statusConfigMap.default;
}
