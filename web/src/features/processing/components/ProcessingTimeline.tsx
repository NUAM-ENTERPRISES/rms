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
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
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
            className="flex gap-3 rounded-2xl border border-border bg-card/50 p-4 shadow-sm"
          >
            <div className="mt-1">
              <Clock3 className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {meta.title}
                <span className="text-xs font-medium text-muted-foreground">
                  {new Date(entry.changedAt).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {entry.actorName ?? "System"} changed status from{" "}
                <span className="font-semibold">{entry.previousStatus}</span> to{" "}
                <span className="font-semibold text-emerald-600">
                  {entry.newStatus}
                </span>
              </div>
              {entry.notes && (
                <p className="text-sm text-muted-foreground">{entry.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
