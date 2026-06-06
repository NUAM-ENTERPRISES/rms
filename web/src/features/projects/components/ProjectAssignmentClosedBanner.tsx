import {
  Ban,
  CalendarX,
  CheckCircle2,
  Lock,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getProjectClosureDetails,
  type ProjectAssignmentGate,
  type ProjectClosureReason,
} from "@/features/projects/utils/project-assignment";

type ClosureTheme = {
  shell: string;
  accent: string;
  iconWrap: string;
  icon: string;
  title: string;
  detail: string;
  badge: string;
  glance: string;
  pulse?: string;
};

const CLOSURE_THEMES: Record<ProjectClosureReason, ClosureTheme> = {
  deadline: {
    shell:
      "border-red-300/80 bg-gradient-to-br from-red-50 via-orange-50/90 to-amber-50/80 shadow-md shadow-red-100/60",
    accent: "bg-gradient-to-b from-red-500 to-orange-500",
    iconWrap: "bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-200/70",
    icon: "text-white",
    title: "text-red-900",
    detail: "text-red-800/85",
    badge: "border-red-200 bg-red-100 text-red-800",
    glance: "via-red-200/55",
    pulse: "animate-project-deadline-blink-urgent",
  },
  completed: {
    shell:
      "border-emerald-300/70 bg-gradient-to-br from-emerald-50 via-teal-50/80 to-slate-50/90 shadow-md shadow-emerald-100/50",
    accent: "bg-gradient-to-b from-emerald-500 to-teal-500",
    iconWrap: "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-200/60",
    icon: "text-white",
    title: "text-emerald-900",
    detail: "text-emerald-800/85",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
    glance: "via-emerald-200/50",
  },
  cancelled: {
    shell:
      "border-rose-300/80 bg-gradient-to-br from-rose-50 via-red-50/90 to-slate-50/80 shadow-md shadow-rose-100/50",
    accent: "bg-gradient-to-b from-rose-500 to-red-500",
    iconWrap: "bg-gradient-to-br from-rose-500 to-red-500 shadow-lg shadow-rose-200/60",
    icon: "text-white",
    title: "text-rose-900",
    detail: "text-rose-800/85",
    badge: "border-rose-200 bg-rose-100 text-rose-800",
    glance: "via-rose-200/50",
  },
  inactive: {
    shell:
      "border-slate-300/80 bg-gradient-to-br from-slate-100 via-slate-50/90 to-white shadow-md shadow-slate-100/60",
    accent: "bg-gradient-to-b from-slate-500 to-slate-400",
    iconWrap: "bg-gradient-to-br from-slate-500 to-slate-400 shadow-lg shadow-slate-200/60",
    icon: "text-white",
    title: "text-slate-900",
    detail: "text-slate-700/90",
    badge: "border-slate-200 bg-slate-100 text-slate-800",
    glance: "via-slate-200/50",
  },
};

const CLOSURE_ICONS: Record<ProjectClosureReason, typeof CalendarX> = {
  deadline: CalendarX,
  completed: CheckCircle2,
  cancelled: Ban,
  inactive: Lock,
};

function formatDeadlineLabel(deadline?: string | null): string | null {
  if (!deadline) return null;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface ProjectAssignmentClosedBannerProps {
  project: ProjectAssignmentGate | null | undefined;
  className?: string;
}

export function ProjectAssignmentClosedBanner({
  project,
  className,
}: ProjectAssignmentClosedBannerProps) {
  const closure = getProjectClosureDetails(project);
  if (!closure) {
    return null;
  }

  const theme = CLOSURE_THEMES[closure.reason];
  const Icon = CLOSURE_ICONS[closure.reason];
  const deadlineLabel = formatDeadlineLabel(project?.deadline);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2",
        theme.shell,
        theme.pulse,
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-[1] w-1.5 rounded-l-2xl",
          theme.accent,
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.55),_transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[48%] animate-processing-glance bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-90 mix-blend-overlay"
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-[40%] animate-processing-glance bg-gradient-to-r from-transparent to-transparent opacity-70 mix-blend-soft-light [animation-delay:0.85s]",
          theme.glance,
        )}
        aria-hidden
      />

      <div className="relative z-[1] flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            theme.iconWrap,
          )}
          aria-hidden
        >
          <Icon className={cn("h-6 w-6", theme.icon)} />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={cn("text-base font-bold tracking-tight sm:text-lg", theme.title)}>
              {closure.title}
            </h2>
            <Badge
              variant="outline"
              className={cn("text-[10px] font-bold uppercase tracking-wider", theme.badge)}
            >
              Assignments closed
            </Badge>
          </div>
          <p className={cn("text-sm font-semibold leading-snug", theme.title)}>
            {closure.message}
          </p>
          <p className={cn("text-sm leading-relaxed", theme.detail)}>
            {closure.reason === "deadline" && deadlineLabel
              ? `Deadline was ${deadlineLabel}. Existing nominated candidates can still be managed, but new assignments are blocked.`
              : `${closure.detail} Existing nominated candidates can still be managed, but new assignments are blocked.`}
          </p>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 sm:flex-col sm:items-center sm:px-4",
            theme.badge,
          )}
        >
          <UserPlus className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span className="text-[11px] font-bold uppercase tracking-wide text-center leading-tight">
            No new
            <br className="hidden sm:block" />
            {" "}assignments
          </span>
        </div>
      </div>
    </div>
  );
}
