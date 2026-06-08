import { cn } from "@/lib/utils";

export type StatusBadgeStyle = {
  label: string;
  badgeClass: string;
};

const PROJECT_STATUS_BADGES: Record<string, StatusBadgeStyle> = {
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  active: {
    label: "In Progress",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  on_hold: {
    label: "On Hold",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  inactive: {
    label: "Cancelled",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
};

/** Normalizes API enum (`IN_PROGRESS`) or snake_case (`in_progress`) to a badge lookup key. */
export function normalizeProjectStatusKey(status?: string | null): string {
  if (!status) return "";
  return status.toLowerCase().trim().replace(/-/g, "_");
}

const CONFIG_VALUE_BADGES: Record<string, StatusBadgeStyle> = {
  visible: {
    label: "Visible",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  hidden: {
    label: "Hidden",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  required: {
    label: "Required",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "not required": {
    label: "Not Required",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
  },
  none: {
    label: "None",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

const DEFAULT_BADGE: StatusBadgeStyle = {
  label: "Unknown",
  badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
};

export function getProjectStatusBadge(
  status?: string | null
): StatusBadgeStyle {
  if (!status) return DEFAULT_BADGE;
  const key = normalizeProjectStatusKey(status);
  return PROJECT_STATUS_BADGES[key] ?? { ...DEFAULT_BADGE, label: status };
}

export function getConfigValueBadge(value?: string | null): StatusBadgeStyle {
  if (!value) return DEFAULT_BADGE;
  const key = value.toLowerCase().trim();
  return (
    CONFIG_VALUE_BADGES[key] ?? {
      label: value,
      badgeClass: DEFAULT_BADGE.badgeClass,
    }
  );
}

export function statusBadgeClassNames(
  style: StatusBadgeStyle,
  extra?: string
): string {
  return cn(
    "text-[10px] font-semibold uppercase tracking-wide",
    style.badgeClass,
    extra
  );
}
