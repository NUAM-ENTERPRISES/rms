import { Badge } from "@/components/ui/badge";
import { PROCESSING_STEP_STATUS_META } from "../constants/processingSteps";
import { ProcessingStepStatus } from "../types";

type ProcessingStatusBadgeProps = {
  status: ProcessingStepStatus;
};

export function ProcessingStatusBadge({ status }: ProcessingStatusBadgeProps) {
  const meta = PROCESSING_STEP_STATUS_META[status];

  return (
    <Badge
      variant="outline"
      className={`text-xs font-semibold ${
        meta?.badge || "bg-slate-100 text-slate-700"
      }`}
    >
      {meta?.label ?? status.replace("_", " ")}
    </Badge>
  );
}
