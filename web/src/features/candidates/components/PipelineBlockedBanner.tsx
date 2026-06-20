import { AlertCircle, Clock, PauseCircle } from "lucide-react";
import { getStatusChangeTargetLabel } from "@/features/candidates/utils/candidateProjectPipelineBlocked";

interface PipelineBlockedBannerProps {
  mainStatusName?: string | null;
  pipelineBlockedReason?: string | null;
  pipelineBlockedOnThisProject?: boolean;
}

export function PipelineBlockedBanner({
  mainStatusName,
  pipelineBlockedReason,
  pipelineBlockedOnThisProject = false,
}: PipelineBlockedBannerProps) {
  const isProcessingBlock =
    pipelineBlockedOnThisProject ||
    Boolean(pipelineBlockedReason?.includes("Processing In Progress"));

  const label = mainStatusName
    ? getStatusChangeTargetLabel(mainStatusName)
    : "Withdrawn or On Hold";

  return (
    <div
      className={
        isProcessingBlock
          ? "flex items-start gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 p-4"
          : "flex items-start gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-4"
      }
      role="status"
    >
      <div
        className={
          isProcessingBlock
            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-white"
            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white"
        }
      >
        {isProcessingBlock ? (
          <Clock className="h-5 w-5 text-orange-600" aria-hidden />
        ) : (
          <PauseCircle className="h-5 w-5 text-slate-600" aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p
          className={
            isProcessingBlock
              ? "text-sm font-semibold text-orange-900"
              : "text-sm font-semibold text-slate-900"
          }
        >
          {isProcessingBlock
            ? "Pipeline paused on this project"
            : "Pipeline actions disabled"}
        </p>
        <p
          className={
            isProcessingBlock
              ? "mt-1 text-sm text-orange-800"
              : "mt-1 text-sm text-slate-600"
          }
        >
          {pipelineBlockedReason ??
            `This candidate's project is currently ${label}. Pipeline actions are disabled until status changes.`}
        </p>
      </div>
      <AlertCircle
        className={
          isProcessingBlock
            ? "mt-0.5 h-5 w-5 shrink-0 text-orange-400"
            : "mt-0.5 h-5 w-5 shrink-0 text-slate-400"
        }
        aria-hidden
      />
    </div>
  );
}
