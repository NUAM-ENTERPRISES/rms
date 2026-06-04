import * as React from "react";
import { FileText } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const defaultUploadProgressColor = (percentage: number) => {
  if (percentage < 30) return "from-rose-500 to-rose-600";
  if (percentage < 70) return "from-amber-400 to-amber-500";
  if (percentage < 100) return "from-sky-500 to-blue-600";
  return "from-emerald-500 to-emerald-600";
};

const HOVER_OPEN_DELAY_MS = 200;
const HOVER_CLOSE_DELAY_MS = 200;

type RecruiterUploadProgressProps = {
  done: number;
  total: number;
  percent: number;
  unitLabel: string;
  pendingWord: "pending" | "missing";
  accent?: "amber" | "sky";
  getProgressColor?: (percentage: number) => string;
  checklistCompleteLabel: string;
  checklistPendingLabel: string;
  progressAriaLabel: string;
  checklistContentClassName?: string;
  tooltipContent:
    | React.ReactNode
    | ((api: { close: () => void }) => React.ReactNode);
  className?: string;
  onStopRowNav: (e: React.MouseEvent) => void;
};

function resolveStatusTone(
  isComplete: boolean,
  accent: "amber" | "sky",
): {
  statusClass: string;
  iconWrap: string;
} {
  if (isComplete) {
    return {
      statusClass: "text-emerald-700",
      iconWrap: "bg-emerald-500/10 text-emerald-600",
    };
  }
  if (accent === "sky") {
    return {
      statusClass: "text-sky-700",
      iconWrap: "bg-sky-500/10 text-sky-600",
    };
  }
  return {
    statusClass: "text-amber-700",
    iconWrap: "bg-amber-500/10 text-amber-600",
  };
}

export function RecruiterUploadProgress({
  done,
  total,
  percent,
  unitLabel,
  pendingWord,
  accent = "amber",
  getProgressColor = defaultUploadProgressColor,
  checklistCompleteLabel,
  checklistPendingLabel,
  progressAriaLabel,
  checklistContentClassName,
  tooltipContent,
  className,
  onStopRowNav,
}: RecruiterUploadProgressProps) {
  const [checklistOpen, setChecklistOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const openTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverZoneCountRef = React.useRef(0);

  const missingCount = Math.max(0, total - done);
  const isComplete = total > 0 && done >= total;
  const tone = resolveStatusTone(isComplete, accent);
  const fillGradient = getProgressColor(percent);

  const clearOpenTimer = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const enterHoverZone = () => {
    hoverZoneCountRef.current += 1;
    clearCloseTimer();
    if (checklistOpen) return;
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => {
      setChecklistOpen(true);
    }, HOVER_OPEN_DELAY_MS);
  };

  const leaveHoverZone = () => {
    hoverZoneCountRef.current = Math.max(0, hoverZoneCountRef.current - 1);
    if (hoverZoneCountRef.current > 0) return;
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setChecklistOpen(false);
    }, HOVER_CLOSE_DELAY_MS);
  };

  React.useEffect(
    () => () => {
      clearOpenTimer();
      clearCloseTimer();
    },
    [],
  );

  const closeChecklist = React.useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    hoverZoneCountRef.current = 0;
    setChecklistOpen(false);
  }, []);

  const resolvedChecklistContent =
    typeof tooltipContent === "function"
      ? tooltipContent({ close: closeChecklist })
      : tooltipContent;

  const pinChecklistOpen = (e: React.MouseEvent) => {
    onStopRowNav(e);
    clearCloseTimer();
    hoverZoneCountRef.current = 1;
    setChecklistOpen(true);
  };

  return (
    <Popover open={checklistOpen} onOpenChange={setChecklistOpen} modal={false}>
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
          data-recruiter-upload-action
          className={cn(
            "flex w-[168px] max-w-full cursor-default flex-col rounded-md border border-border/60 bg-card/80 p-1 shadow-sm",
            className,
          )}
          onMouseEnter={enterHoverZone}
          onMouseLeave={leaveHoverZone}
          onClick={pinChecklistOpen}
          onKeyDown={(e) => e.stopPropagation()}
          role="group"
          aria-label="View document upload checklist"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="inline-flex items-baseline gap-px rounded bg-background px-1 py-px text-[9px] font-semibold tabular-nums leading-none text-foreground ring-1 ring-border/40">
              <span>{done}</span>
              <span className="font-normal text-muted-foreground">/{total}</span>
              <span className="ml-px font-normal text-muted-foreground">
                {unitLabel}
              </span>
            </span>
            <span
              className={cn(
                "rounded px-1 py-px text-[8px] font-bold uppercase leading-none tracking-wide",
                isComplete
                  ? "bg-emerald-500/10 text-emerald-700"
                  : accent === "sky"
                    ? "bg-sky-500/10 text-sky-700"
                    : "bg-amber-500/10 text-amber-700",
              )}
            >
              {isComplete ? "Done" : `${missingCount} ${pendingWord}`}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1">
            <div
              className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border/40"
              aria-hidden
            >
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
                  fillGradient,
                )}
                style={{ width: `${percent}%` }}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={progressAriaLabel}
              />
            </div>
            <span
              className={cn(
                "w-7 shrink-0 text-right text-[9px] font-semibold tabular-nums leading-none",
                isComplete ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {percent}%
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1 px-0.5 text-[9px] leading-none text-muted-foreground">
            <span
              className={cn(
                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full",
                tone.iconWrap,
              )}
            >
              <FileText className="h-2 w-2" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate">
              {isComplete ? checklistCompleteLabel : checklistPendingLabel}
            </span>
            {!isComplete ? (
              <span
                className={cn(
                  "shrink-0 text-[8px] font-bold uppercase",
                  tone.statusClass,
                )}
              >
                View
              </span>
            ) : null}
          </div>
        </div>
      </PopoverAnchor>

      <PopoverContent
        side="left"
        align="start"
        sideOffset={8}
        data-recruiter-upload-action
        className={cn(
          "z-[200] w-80 rounded-xl border border-border/80 bg-card p-3 shadow-xl",
          checklistContentClassName,
        )}
        onMouseEnter={enterHoverZone}
        onMouseLeave={leaveHoverZone}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onInteractOutside={(e) => {
          if (anchorRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        {resolvedChecklistContent}
      </PopoverContent>
    </Popover>
  );
}
