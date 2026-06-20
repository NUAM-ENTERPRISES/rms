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
    bgColor: "bg-orange-50",
    iconColor: "text-orange-500",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    icon: AlertCircle,
  },
  interested: {
    color: "from-green-400 to-green-600",
    bgColor: "bg-green-50",
    iconColor: "text-green-500",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: UserCheck,
  },
  "not interested": {
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50",
    iconColor: "text-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  "not eligible": {
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50",
    iconColor: "text-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  "other enquiry": {
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-500",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Mail,
  },
  future: {
    color: "from-indigo-400 to-indigo-600",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-500",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Calendar,
  },
  "on hold": {
    color: "from-yellow-400 to-yellow-600",
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-500",
    badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
  onhold: {
    color: "from-yellow-400 to-yellow-600",
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-500",
    badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
  rnr: {
    color: "from-pink-400 to-pink-600",
    bgColor: "bg-pink-50",
    iconColor: "text-pink-500",
    badgeClass: "bg-pink-50 text-pink-700 border-pink-200",
    icon: AlertCircle,
  },
  "call back": {
    color: "from-cyan-400 to-teal-600",
    bgColor: "bg-cyan-50",
    iconColor: "text-cyan-500",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: Phone,
  },
  call_back: {
    color: "from-cyan-400 to-teal-600",
    bgColor: "bg-cyan-50",
    iconColor: "text-cyan-500",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: Phone,
  },
  qualified: {
    color: "from-emerald-400 to-emerald-600",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  working: {
    color: "from-blue-400 to-blue-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Briefcase,
  },
  deployed: {
    color: "from-blue-400 to-blue-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Briefcase,
  },
  selected: {
    color: "from-green-400 to-green-600",
    bgColor: "bg-green-50",
    iconColor: "text-green-500",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle,
  },
  rejected: {
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50",
    iconColor: "text-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  "in-process": {
    color: "from-indigo-400 to-indigo-600",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-500",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: FileText,
  },
  shortlisted: {
    color: "from-cyan-400 to-cyan-600",
    bgColor: "bg-cyan-50",
    iconColor: "text-cyan-500",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: UserCheck,
  },
  interviewed: {
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-500",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Calendar,
  },
  offered: {
    color: "from-orange-400 to-orange-600",
    bgColor: "bg-orange-50",
    iconColor: "text-orange-500",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    icon: Award,
  },
  placed: {
    color: "from-emerald-400 to-emerald-600",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Briefcase,
  },
  withdrawn: {
    color: "from-rose-400 to-rose-600",
    bgColor: "bg-rose-50",
    iconColor: "text-rose-500",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: UserX,
  },
  default: {
    color: "from-gray-400 to-gray-600",
    bgColor: "bg-gray-50",
    iconColor: "text-gray-500",
    badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
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
