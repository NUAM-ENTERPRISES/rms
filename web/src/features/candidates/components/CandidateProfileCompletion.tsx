import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGetDocumentsQuery } from "../api";
import { getCandidateProfileCompletion } from "../profileCompletion";
import type { Document } from "../api";

interface CandidateProfileCompletionProps {
  documents?: Document[];
  isLoading?: boolean;
  compact?: boolean;
}

interface CandidateProfileCompletionCellProps {
  candidateId: string;
}

const getProgressColor = (percent: number) => {
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 60) return "bg-amber-400";
  return "bg-rose-500";
};

export const CandidateProfileCompletion: React.FC<CandidateProfileCompletionProps> = ({
  documents,
  isLoading,
  compact = false,
}) => {
  const completion = getCandidateProfileCompletion(documents);
  const missingLabels = completion.missing.map((item) => item.label);
  const progressColor = getProgressColor(completion.percent);

  if (isLoading) {
    return (
      <div className={compact ? "text-xs text-slate-500" : "text-sm text-slate-500"}>
        Loading profile completion...
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={compact ? "text-xs font-semibold text-slate-900" : "text-sm font-semibold text-slate-900"}>
            Profile completion
          </p>
          {!compact && (
            <p className="text-xs text-slate-500">
              Based on required candidate documents submitted so far.
            </p>
          )}
        </div>
        <div className={compact ? "text-sm font-semibold text-slate-900" : "text-xl font-bold text-slate-900"}>
          {completion.percent}%
        </div>
      </div>

      <div className="rounded-full bg-slate-100 h-2 overflow-hidden">
        <div
          className={`${progressColor} h-full rounded-full transition-all duration-300`}
          style={{ width: `${completion.percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {completion.completedCount}/{completion.requiredCount} required documents uploaded
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {completion.missing.length} missing
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="max-w-[220px]">
            <div className="space-y-2 text-xs text-slate-900">
              <p className="font-semibold">{completion.percent}% complete</p>
              {completion.missing.length > 0 ? (
                <div>
                  <p className="font-medium">Missing documents</p>
                  <p className="mt-1 text-slate-600">
                    {missingLabels.join(", ")}
                  </p>
                </div>
              ) : (
                <p className="text-emerald-700">All required documents are submitted.</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export const CandidateProfileCompletionCell: React.FC<CandidateProfileCompletionCellProps> = ({
  candidateId,
}) => {
  const { data, isLoading } = useGetDocumentsQuery(
    { candidateId, page: 1, limit: 20 },
    { skip: !candidateId }
  );

  const documents = data?.data?.documents;

  return (
    <div className="min-w-[120px]">
      <CandidateProfileCompletion
        documents={documents}
        isLoading={isLoading}
        compact={true}
      />
    </div>
  );
};
