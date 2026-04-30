import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGetCandidateProfileCompletionQuery } from "../api";
import { getCandidateProfileCompletion } from "../profileCompletion";
import type { Candidate, Document } from "../api";

interface CandidateProfileCompletionProps {
  candidateId?: string;
  candidate?: Pick<Candidate, "email" | "mobileNumber" | "dateOfBirth">;
  documents?: Document[];
  isLoading?: boolean;
  compact?: boolean;
  variant?: "default" | "circular";
}

interface CandidateProfileCompletionCellProps {
  candidateId: string;
}

const getProgressColor = (percent: number) => {
  if (percent >= 100) return "text-emerald-500";
  if (percent >= 60) return "text-amber-400";
  return "text-rose-500";
};

const getProgressBgColor = (percent: number) => {
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 60) return "bg-amber-400";
  return "bg-rose-500";
};

export const CandidateProfileCompletion: React.FC<CandidateProfileCompletionProps> = ({
  candidateId,
  candidate,
  documents,
  isLoading,
  compact = false,
  variant = "default",
}) => {
  const { data: serverCompletion, isLoading: isServerLoading } =
    useGetCandidateProfileCompletionQuery(candidateId!, {
      skip: !candidateId,
    });

  const docsCompletion = getCandidateProfileCompletion(documents);

  const localCompletion = (() => {
    const missingPersonal = [
      { key: "dateOfBirth" as const, label: "Date of Birth", ok: !!candidate?.dateOfBirth },
      { key: "mobileNumber" as const, label: "Mobile Number", ok: !!candidate?.mobileNumber },
      { key: "email" as const, label: "Email", ok: !!candidate?.email },
    ].filter((x) => !x.ok);

    const missing = [
      ...missingPersonal.map((p) => ({ type: "personal" as const, key: p.key, label: p.label })),
      ...docsCompletion.missing.map((d) => ({ type: "document" as const, key: String(d.docType), label: d.label })),
    ];

    const requiredCount = docsCompletion.requiredCount + 3;
    const completedCount = requiredCount - missing.length;
    const percent =
      requiredCount > 0 ? Math.round((completedCount / requiredCount) * 100) : 0;

    return {
      percent,
      requiredCount,
      completedCount,
      missing,
      breakdown: {
        personal: {
          requiredCount: 3,
          completedCount: 3 - missingPersonal.length,
          missing: missingPersonal.map((p) => ({ key: p.key, label: p.label })),
        },
        documents: docsCompletion,
      },
    };
  })();

  const completion = serverCompletion ?? localCompletion;
  const missingLabels = completion.missing.map((item) => item.label);
  const progressColor = getProgressColor(completion.percent);
  const progressBgColor = getProgressBgColor(completion.percent);

  if (isLoading || isServerLoading) {
    return (
      <div className={compact ? "text-xs text-slate-500" : "text-sm text-slate-500"}>
        Loading profile completion...
      </div>
    );
  }

  if (variant === "circular") {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (completion.percent / 100) * circumference;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center justify-center w-12 h-12 cursor-help group">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-slate-100"
                />
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className={`${progressColor} transition-all duration-500 ease-in-out`}
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-slate-700">
                {completion.percent}%
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="w-64 p-4 bg-white text-slate-900 border border-slate-200 shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900">Profile Completion</h4>
                <span className={`text-sm font-bold ${progressColor}`}>{completion.percent}%</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  <span>Overall</span>
                  <span>{completion.completedCount}/{completion.requiredCount}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${progressBgColor} transition-all duration-500`} 
                    style={{ width: `${completion.percent}%` }}
                  />
                </div>
              </div>

              {completion.missing.length > 0 ? (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Missing Required Items</p>
                  <div className="flex flex-wrap gap-1">
                    {completion.missing.map((item, i) => (
                      <span
                        key={`${item.key}-${i}`}
                        className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-medium"
                      >
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-emerald-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">Profile complete</p>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
              Based on required personal details and documents.
            </p>
          )}
        </div>
        <div className={compact ? "text-sm font-semibold text-slate-900" : "text-xl font-bold text-slate-900"}>
          {completion.percent}%
        </div>
      </div>

      <div className="rounded-full bg-slate-100 h-2 overflow-hidden">
        <div
          className={`${progressBgColor} h-full rounded-full transition-all duration-300`}
          style={{ width: `${completion.percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {completion.completedCount}/{completion.requiredCount} required items completed
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {completion.missing.length} missing
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="max-w-[220px] bg-white text-slate-900 border border-slate-200 shadow-lg">
              <div className="space-y-2 text-xs text-slate-900">
                <p className="font-semibold">{completion.percent}% complete</p>
                {completion.missing.length > 0 ? (
                  <div>
                    <p className="font-medium">Missing items</p>
                    <p className="mt-1 text-slate-600">
                      {missingLabels.join(", ")}
                    </p>
                  </div>
                ) : (
                  <p className="text-emerald-700">All required items are completed.</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export const CandidateProfileCompletionCell: React.FC<CandidateProfileCompletionCellProps> = ({
  candidateId,
}) => {
  return (
    <div className="flex justify-center">
      <CandidateProfileCompletion
        candidateId={candidateId}
        compact={true}
        variant="circular"
      />
    </div>
  );
};
