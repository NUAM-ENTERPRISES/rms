import { ProcessingHistoryEntry } from "../types";
import { PROCESSING_STEP_META_MAP } from "../constants/processingSteps";
import { cn } from "@/lib/utils";
import { Clock3 } from "lucide-react";

type ProcessingTimelineProps = {
  history: ProcessingHistoryEntry[];
};

export function ProcessingTimeline({ history }: ProcessingTimelineProps) {
  if (!history.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => {
        const meta = PROCESSING_STEP_META_MAP[entry.stepKey];
        return (
          <div
            key={entry.id}
            className="flex gap-3 rounded-2xl border border-slate-100 bg-white/50 p-4 shadow-sm"
          >
            <div className="mt-1">
              <Clock3 className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {meta.title}
                <span className="text-xs font-medium text-slate-500">
                  {new Date(entry.changedAt).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {entry.actorName ?? "System"} changed status from{" "}
                <span className="font-semibold">{entry.previousStatus}</span> to{" "}
                <span className="font-semibold text-emerald-600">
                  {entry.newStatus}
                </span>
              </div>
              {entry.notes && (
                <p className="text-sm text-slate-600">{entry.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
