import { cn } from "@/lib/utils";
import { getStatusConfig } from "@/constants/statuses";
import { CandidateProjectStatus } from "@/constants/statuses";

interface WorkflowProgressProps {
  currentStatus: CandidateProjectStatus;
  className?: string;
}

const WORKFLOW_STAGES = [
  "nominated",
  "pending_documents",
  "documents_submitted",
  "verification_in_progress",
  "documents_verified",
  "approved",
  "interview_scheduled",
  "interview_completed",
  "interview_passed",
  "selected",
  "processing",
  "hired",
] as const;

export default function WorkflowProgress({
  currentStatus,
  className,
}: WorkflowProgressProps) {
  const currentIndex = WORKFLOW_STAGES.indexOf(currentStatus as any);
  const isCompleted = (index: number) => index < currentIndex;
  const isCurrent = (index: number) => index === currentIndex;
  const isUpcoming = (index: number) => index > currentIndex;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        {WORKFLOW_STAGES.map((stage, index) => {
          const config = getStatusConfig(stage as CandidateProjectStatus);
          const completed = isCompleted(index);
          const current = isCurrent(index);
          const upcoming = isUpcoming(index);

          return (
            <div key={stage} className="flex flex-col items-center space-y-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                  completed && "border-green-500 bg-green-500 text-white",
                  current && "border-blue-500 bg-blue-500 text-white",
                  upcoming && "border-gray-300 bg-white text-gray-400"
                )}
              >
                {completed ? "✓" : index + 1}
              </div>
              <div className="text-center">
                <div
                  className={cn(
                    "text-xs font-medium",
                    completed && "text-green-600",
                    current && "text-blue-600",
                    upcoming && "text-gray-400"
                  )}
                >
                  {config.shortLabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
