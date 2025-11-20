import React from "react";
import {
  User,
  FileText,
  CheckCircle,
  Calendar,
  Target,
  Briefcase,
  Award,
  Clock,
  XCircle,
  UserX,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusPipelineStage {
  step: number;
  statusId: number;
  statusName: string;
  enteredAt: string;
  exitedAt: string | null;
}

interface CandidatePipelineProps {
  pipeline: StatusPipelineStage[];
  className?: string;
}

// Status icon mapping
const statusIcons: Record<string, any> = {
  untouched: User,
  interested: UserCheck,
  rnr: Clock,
  selected: CheckCircle,
  rejected: XCircle,
  "in-process": FileText,
  shortlisted: UserCheck,
  interviewed: Calendar,
  offered: Award,
  placed: Briefcase,
  onhold: AlertCircle,
  withdrawn: UserX,
  default: Target,
};

// Get icon for status
const getStatusIcon = (statusName: string) => {
  const lowerStatus = statusName.toLowerCase();
  return statusIcons[lowerStatus] || statusIcons.default;
};

export const CandidatePipeline: React.FC<CandidatePipelineProps> = ({
  pipeline,
  className,
}) => {
  if (!pipeline || pipeline.length === 0) {
    return (
      <div className={cn("bg-slate-50 rounded-lg p-6 text-center", className)}>
        <Clock className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-700 mb-1">No Status History</h3>
        <p className="text-sm text-slate-500">No status changes recorded yet</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Candidate Status Pipeline
              </h3>
              <p className="text-xs text-slate-500">
                {pipeline.length} status steps
              </p>
            </div>
          </div>
        </div>

        {/* Status Pipeline - Only steps with icons, no durations, no progress bar */}
        <div className="relative">
          <div className="flex items-start justify-between gap-2 py-4">
            {pipeline.map((stage, index) => {
              const IconComponent = getStatusIcon(stage.statusName);
              const isLast = index === pipeline.length - 1;

              return (
                <div
                  key={`${stage.statusId}-${stage.step}`}
                  className="flex flex-col items-center relative min-w-0 flex-1"
                >
                  {/* Status Node */}
                  <div className="relative z-10 mb-3">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 relative shadow-lg",
                        index === pipeline.length - 1
                          ? "bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-700 border-3 border-amber-400 shadow-amber-200/50 scale-110"
                          : "bg-slate-100 text-slate-600 border-2 border-slate-200"
                      )}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Status Label */}
                  <div className="text-center px-1">
                    <p className="text-sm font-semibold text-slate-800 leading-tight break-words mb-1">
                      {stage.statusName}
                    </p>
                  </div>

                  {/* Connecting Line */}
                  {!isLast && (
                    <div className="absolute top-6 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-0.5 z-0 bg-slate-200" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidatePipeline;
