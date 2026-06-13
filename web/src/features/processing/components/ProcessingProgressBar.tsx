import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  formatProcessingStepLabel,
  formatProcessingStepStatus,
} from "../utils/formatProcessingStepLabel";

export type ProcessingPendingStep = {
  key: string;
  label?: string;
  status: string;
};

export type ProcessingProgressBarProps = {
  processingStatus: string;
  progressCount?: number;
  progressCompletedSteps?: number;
  progressTotalSteps?: number;
  progressPendingSteps?: ProcessingPendingStep[];
  className?: string;
};

function resolveProgressPercent(
  processingStatus: string,
  progressCount?: number,
  progressCompletedSteps?: number,
  progressTotalSteps?: number,
): number {
  if (processingStatus === "completed") return 100;

  if (typeof progressCount === "number" && Number.isFinite(progressCount)) {
    return Math.min(100, Math.max(0, Math.round(progressCount)));
  }

  if (
    typeof progressCompletedSteps === "number" &&
    typeof progressTotalSteps === "number" &&
    progressTotalSteps > 0
  ) {
    return Math.round((progressCompletedSteps / progressTotalSteps) * 100);
  }

  return 0;
}

export function ProcessingProgressBar({
  processingStatus,
  progressCount,
  progressCompletedSteps,
  progressTotalSteps,
  progressPendingSteps = [],
  className,
}: ProcessingProgressBarProps) {
  const pct = resolveProgressPercent(
    processingStatus,
    progressCount,
    progressCompletedSteps,
    progressTotalSteps,
  );
  const completed =
    typeof progressCompletedSteps === "number"
      ? progressCompletedSteps
      : progressTotalSteps && pct > 0
        ? Math.round((pct / 100) * progressTotalSteps)
        : undefined;
  const total = typeof progressTotalSteps === "number" ? progressTotalSteps : undefined;
  const pending = progressPendingSteps ?? [];
  const hasStepBreakdown = typeof total === "number" && total > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "space-y-1.5 text-left rounded-md p-1 -m-1 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
              className,
            )}
            aria-label={
              hasStepBreakdown
                ? `Processing progress ${pct} percent, ${completed} of ${total} steps completed`
                : `Processing progress ${pct} percent`
            }
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700 tabular-nums">{pct}%</span>
              {hasStepBreakdown ? (
                <span className="text-[10px] text-slate-500 tabular-nums">
                  {completed}/{total}
                </span>
              ) : null}
            </div>
            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
              <div
                style={{ width: `${pct}%` }}
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  pct === 100 ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          className="max-w-xs p-0 overflow-hidden bg-white text-slate-900 border border-slate-200 shadow-lg [&>svg]:fill-white [&>svg]:bg-white"
        >
          <div className="px-3 py-2 border-b border-slate-200 bg-white">
            <p className="text-xs font-bold text-slate-900">Processing progress</p>
            {hasStepBreakdown ? (
              <p className="text-[11px] text-slate-600 mt-0.5">
                {completed} of {total} steps completed ({pct}%)
              </p>
            ) : (
              <p className="text-[11px] text-slate-600 mt-0.5">{pct}% complete</p>
            )}
          </div>
          {pending.length > 0 ? (
            <div className="max-h-48 overflow-y-auto px-3 py-2 space-y-1.5 bg-white">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Remaining steps
              </p>
              <ul className="space-y-1">
                {pending.map((step) => (
                  <li
                    key={step.key}
                    className="flex items-start justify-between gap-2 text-[11px] text-slate-900"
                  >
                    <span className="font-medium leading-snug text-slate-900">
                      {formatProcessingStepLabel(step.key, step.label)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        step.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : step.status === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : step.status === "resubmission_requested"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700",
                      )}
                    >
                      {formatProcessingStepStatus(step.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="px-3 py-2 text-[11px] text-emerald-700 font-medium bg-white">
              {processingStatus === "completed" || pct === 100
                ? "All applicable steps completed"
                : "No pending steps on file"}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
