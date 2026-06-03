import type { LucideIcon } from "lucide-react";
import {
  Award,
  BadgeCheck,
  Ban,
  Briefcase,
  Building2,
  CalendarClock,
  CircleHelp,
  FileSearch,
  ListChecks,
  MapPin,
  MessageCircle,
  Pause,
  PhoneCall,
  PhoneOff,
  ShieldX,
  Star,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  User,
  UserMinus,
  UserPlus,
  Video,
} from "lucide-react";

export type CandidatePipelineStatusVisual = {
  color: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  icon: LucideIcon;
  description: string;
};

/** Normalize API / DB status names for lookup (e.g. `on_hold` → `on hold`). */
export function normalizeCandidateStatusKey(statusName?: string): string {
  return (statusName || "").toLowerCase().trim().replace(/_/g, " ");
}

/**
 * Visual config for candidate global status pipeline nodes.
 * Each status has a distinct Lucide icon (no Lottie).
 */
export const CANDIDATE_PIPELINE_STATUS_CONFIG: Record<
  string,
  CandidatePipelineStatusVisual
> = {
  untouched: {
    color: "from-orange-400 to-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    iconColor: "text-orange-600",
    icon: User,
    description: "New candidate",
  },
  interested: {
    color: "from-green-400 to-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    iconColor: "text-green-600",
    icon: ThumbsUp,
    description: "Showing interest",
  },
  "not interested": {
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    iconColor: "text-red-600",
    icon: ThumbsDown,
    description: "Not interested",
  },
  "not eligible": {
    color: "from-rose-400 to-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-300",
    iconColor: "text-rose-600",
    icon: ShieldX,
    description: "Not eligible",
  },
  "other enquiry": {
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    iconColor: "text-purple-600",
    icon: MessageCircle,
    description: "Other enquiry",
  },
  future: {
    color: "from-indigo-400 to-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-300",
    iconColor: "text-indigo-600",
    icon: CalendarClock,
    description: "Future opportunity",
  },
  "on hold": {
    color: "from-yellow-400 to-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    iconColor: "text-yellow-600",
    icon: Pause,
    description: "Temporarily paused",
  },
  onhold: {
    color: "from-yellow-400 to-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    iconColor: "text-yellow-600",
    icon: Pause,
    description: "Temporarily paused",
  },
  rnr: {
    color: "from-pink-400 to-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-300",
    iconColor: "text-pink-600",
    icon: PhoneOff,
    description: "Ringing no response",
  },
  "call back": {
    color: "from-cyan-400 to-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-300",
    iconColor: "text-cyan-600",
    icon: PhoneCall,
    description: "Scheduled callback with candidate",
  },
  callback: {
    color: "from-cyan-400 to-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-300",
    iconColor: "text-cyan-600",
    icon: PhoneCall,
    description: "Scheduled callback with candidate",
  },
  qualified: {
    color: "from-emerald-400 to-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    iconColor: "text-emerald-600",
    icon: BadgeCheck,
    description: "Qualified candidate",
  },
  working: {
    color: "from-blue-400 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    iconColor: "text-blue-600",
    icon: Briefcase,
    description: "Currently working",
  },
  deployed: {
    color: "from-teal-400 to-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-300",
    iconColor: "text-teal-600",
    icon: Building2,
    description: "Successfully deployed",
  },
  selected: {
    color: "from-green-400 to-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    iconColor: "text-green-600",
    icon: Star,
    description: "Selected for process",
  },
  rejected: {
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    iconColor: "text-red-600",
    icon: Ban,
    description: "Not suitable",
  },
  "in-process": {
    color: "from-indigo-400 to-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-300",
    iconColor: "text-indigo-600",
    icon: FileSearch,
    description: "Under review",
  },
  shortlisted: {
    color: "from-cyan-400 to-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-300",
    iconColor: "text-cyan-600",
    icon: ListChecks,
    description: "Passed screening",
  },
  interviewed: {
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    iconColor: "text-purple-600",
    icon: Video,
    description: "Interview completed",
  },
  offered: {
    color: "from-orange-400 to-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    iconColor: "text-orange-600",
    icon: Award,
    description: "Offer extended",
  },
  placed: {
    color: "from-emerald-400 to-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    iconColor: "text-emerald-600",
    icon: MapPin,
    description: "Successfully placed",
  },
  withdrawn: {
    color: "from-rose-400 to-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-300",
    iconColor: "text-rose-600",
    icon: UserMinus,
    description: "Candidate withdrew",
  },
  backout: {
    color: "from-amber-400 to-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    iconColor: "text-amber-600",
    icon: Undo2,
    description: "Candidate backed out",
  },
  new: {
    color: "from-sky-400 to-sky-600",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-300",
    iconColor: "text-sky-600",
    icon: UserPlus,
    description: "New candidate",
  },
};

const pipelineStatusDefault: CandidatePipelineStatusVisual = {
  color: "from-gray-400 to-gray-600",
  bgColor: "bg-gray-50",
  borderColor: "border-gray-300",
  iconColor: "text-slate-600",
  icon: CircleHelp,
  description: "Status update",
};

export function getCandidatePipelineStatusConfig(
  statusName?: string
): CandidatePipelineStatusVisual {
  const key = normalizeCandidateStatusKey(statusName);
  return CANDIDATE_PIPELINE_STATUS_CONFIG[key] ?? pipelineStatusDefault;
}
