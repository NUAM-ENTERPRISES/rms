import { cn } from "@/lib/utils";

export type StatusBadgeStyle = {
  label: string;
  badgeClass: string;
};

const PROJECT_STATUS_BADGES: Record<string, StatusBadgeStyle> = {
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  active: {
    label: "In Progress",
    badgeClass: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  on_hold: {
    label: "On Hold",
    badgeClass: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-muted text-foreground border-border",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  inactive: {
    label: "Cancelled",
    badgeClass: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
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
    badgeClass: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  hidden: {
    label: "Hidden",
    badgeClass: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  required: {
    label: "Required",
    badgeClass: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  "not required": {
    label: "Not Required",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
  none: {
    label: "None",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

const DEFAULT_BADGE: StatusBadgeStyle = {
  label: "Unknown",
  badgeClass: "bg-muted text-foreground border-border",
};

export function getProjectStatusBadge(
  status?: string | null
): StatusBadgeStyle {
  if (!status) return DEFAULT_BADGE;
  const key = normalizeProjectStatusKey(status);
  return PROJECT_STATUS_BADGES[key] ?? { ...DEFAULT_BADGE, label: status };
}

/** Card background blink on the projects list — not applied to in-progress projects. */
export function getProjectStatusBlinkClass(
  status?: string | null
): string | undefined {
  const key = normalizeProjectStatusKey(status);
  switch (key) {
    case "on_hold":
      return "animate-project-status-blink-hold";
    case "completed":
      return "animate-project-status-blink-completed";
    case "cancelled":
    case "inactive":
      return "animate-project-status-blink-cancelled";
    default:
      return undefined;
  }
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
