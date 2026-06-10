import { AlertCircle, PauseCircle } from "lucide-react";
import { getStatusChangeTargetLabel } from "@/features/candidates/utils/candidateProjectPipelineBlocked";

interface PipelineBlockedBannerProps {
  mainStatusName?: string | null;
  pipelineBlockedReason?: string | null;
}

export function PipelineBlockedBanner({
  mainStatusName,
  pipelineBlockedReason,
}: PipelineBlockedBannerProps) {
  const label = mainStatusName
    ? getStatusChangeTargetLabel(mainStatusName)
    : "Withdrawn or On Hold";

  return (
    <div
      className="flex items-start gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-4"
      role="status"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <PauseCircle className="h-5 w-5 text-slate-600" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">
          Pipeline actions disabled
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {pipelineBlockedReason ??
            `This candidate's project is currently ${label}. Pipeline actions are disabled until status changes.`}
        </p>
      </div>
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
    </div>
  );
}
