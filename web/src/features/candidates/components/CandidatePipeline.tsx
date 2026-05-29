import React, { useState } from "react";
import {
  Target,
  Clock,
  Calendar,
  TrendingUp,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DateUtils } from "@/shared/utils/date";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getCandidatePipelineStatusConfig,
  type CandidatePipelineStatusVisual,
} from "../constants/candidatePipelineStatusConfig";

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

function StatusNodeIcon({
  config,
  className,
}: {
  config: CandidatePipelineStatusVisual;
  className?: string;
}) {
  const IconComponent = config.icon;
  return (
    <IconComponent
      className={cn("h-8 w-8 shrink-0", config.iconColor, className)}
      strokeWidth={2.25}
      aria-hidden
    />
  );
}

function PipelineStageDates({
  updatedAt,
  config,
}: {
  updatedAt: string;
  config: CandidatePipelineStatusVisual;
}) {
  return (
    <div className="mb-3 w-full max-w-[11.5rem] mx-auto">
      <div
        className={cn(
          "overflow-hidden rounded-xl border-2 bg-white shadow-md ring-1 ring-slate-900/[0.03]",
          config.borderColor
        )}
        role="group"
        aria-label={`Updated ${DateUtils.formatDateTimeAmPm(updatedAt)}`}
      >
        <div
          className={cn(
            "flex items-center justify-center gap-1.5 border-b px-2.5 py-1.5",
            config.bgColor,
            config.borderColor
          )}
        >
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full bg-white/80 shadow-sm",
              config.borderColor,
              "border"
            )}
          >
            <Clock className={cn("h-2.5 w-2.5", config.iconColor)} aria-hidden />
          </span>
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.12em]",
              config.iconColor
            )}
          >
            Updated
          </span>
        </div>
        <div className="space-y-2 px-2.5 py-2.5">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-2 py-1.5",
              config.bgColor,
              config.borderColor
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-white shadow-sm",
                config.borderColor
              )}
            >
              <Calendar className={cn("h-3.5 w-3.5", config.iconColor)} aria-hidden />
            </span>
            <p className="min-w-0 text-left text-[11px] font-bold leading-tight text-slate-900 tabular-nums">
              {DateUtils.formatDate(updatedAt)}
            </p>
          </div>
          <div className="flex justify-center">
            <span
              className={cn(
                "inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br px-2 py-1.5 text-[11px] font-semibold text-white tabular-nums shadow-sm",
                config.color
              )}
            >
              <Clock className="h-3 w-3 shrink-0 text-white/95" aria-hidden />
              {DateUtils.formatTimeAmPm(updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const CandidatePipeline: React.FC<CandidatePipelineProps> = ({
  pipeline,
  className,
}) => {
  const [routeMapOpen, setRouteMapOpen] = useState(true);

  if (!pipeline || pipeline.length === 0) {
    return (
      <div
        className={cn(
          "bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 text-center border border-slate-200",
          className
        )}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm mb-4">
          <Clock className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-700 mb-2">No Status History</h3>
        <p className="text-sm text-slate-500">
          This candidate has no status changes recorded yet
        </p>
      </div>
    );
  }

  const currentStatus = pipeline[pipeline.length - 1];
  const currentStatusName = currentStatus?.statusName ?? "";
  const currentConfig = getCandidatePipelineStatusConfig(currentStatusName);
  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full border-2 bg-white shadow-lg ring-4 ring-white",
                currentConfig.borderColor,
                currentConfig.bgColor
              )}
            >
              <StatusNodeIcon config={currentConfig} className="h-9 w-9" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Current Status: {currentStatusName || "Unknown"}
                </h3>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium border",
                    currentConfig.bgColor,
                    currentConfig.iconColor,
                    currentConfig.borderColor
                  )}
                >
                  Active
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-2">
                {currentConfig.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium shadow-sm",
                    currentConfig.bgColor,
                    currentConfig.borderColor,
                    currentConfig.iconColor
                  )}
                >
                  <Clock className={cn("h-3.5 w-3.5 shrink-0", currentConfig.iconColor)} />
                  Updated {DateUtils.formatDateTimeAmPm(currentStatus.enteredAt)}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  {pipeline.length} status changes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Route Map Journey — collapsed by default to defer heavy DOM */}
      <Collapsible open={routeMapOpen} onOpenChange={setRouteMapOpen}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-2 text-left hover:bg-slate-100/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-expanded={routeMapOpen}
            >
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Target className="h-4 w-4 text-slate-600" />
                Status Journey Route Map
              </h4>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-slate-500 shrink-0 transition-transform",
                  routeMapOpen && "rotate-180"
                )}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="p-8">
              <div className="space-y-0">
                {Array.from({ length: Math.ceil(pipeline.length / 5) }).map(
                  (_, rowIndex) => {
                    const startIdx = rowIndex * 5;
                    const endIdx = Math.min(startIdx + 5, pipeline.length);
                    const rowStatuses = pipeline.slice(startIdx, endIdx);
                    const isEvenRow = rowIndex % 2 === 0;
                    const displayStatuses = isEvenRow
                      ? rowStatuses
                      : [...rowStatuses].reverse();
                    const hasNextRow = endIdx < pipeline.length;

                    return (
                      <div
                        key={rowIndex}
                        className="relative overflow-visible"
                      >
                        <div
                          className={cn(
                            "flex items-start gap-0",
                            isEvenRow ? "justify-start" : "justify-end"
                          )}
                        >
                          {displayStatuses.map((stage, localIndex) => {
                            const actualIndex = isEvenRow
                              ? startIdx + localIndex
                              : endIdx - 1 - localIndex;
                            const config = getCandidatePipelineStatusConfig(
                              stage.statusName ?? ""
                            );
                            const isLastInRow =
                              localIndex === displayStatuses.length - 1;
                            const isLastOverall =
                              actualIndex === pipeline.length - 1;
                            const isCurrent = isLastOverall;
                            const isLastInEvenRow =
                              isEvenRow && isLastInRow && hasNextRow;

                            return (
                              <div
                                key={`${stage.statusId}-${stage.step}`}
                                className="flex items-start relative overflow-visible"
                              >
                                <div className="flex flex-col items-center min-w-[160px] max-w-[200px] relative">
                                  <PipelineStageDates
                                    updatedAt={stage.exitedAt ?? stage.enteredAt}
                                    config={config}
                                  />

                                  <div className="relative z-10 mb-3">
                                    <div
                                      className={cn(
                                        "relative flex h-20 w-20 items-center justify-center rounded-full border-4 bg-white shadow-lg transition-all duration-300",
                                        config.borderColor,
                                        isCurrent
                                          ? "scale-125 shadow-xl ring-2 ring-amber-400/60 ring-offset-2"
                                          : "hover:scale-105"
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          "flex h-14 w-14 items-center justify-center rounded-full",
                                          config.bgColor
                                        )}
                                      >
                                        <StatusNodeIcon config={config} />
                                      </div>

                                      {isCurrent && (
                                        <>
                                          <span className="absolute -top-2 -right-2 flex h-6 w-6">
                                            <span
                                              className={cn(
                                                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                                config.bgColor
                                              )}
                                            />
                                            <span className="relative inline-flex rounded-full h-6 w-6 items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
                                              ✓
                                            </span>
                                          </span>
                                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-md whitespace-nowrap">
                                            YOU ARE HERE
                                          </div>
                                        </>
                                      )}

                                      <div
                                        className={cn(
                                          "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md",
                                          isCurrent
                                            ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                                            : "bg-slate-200 text-slate-700"
                                        )}
                                      >
                                        {actualIndex + 1}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-center px-2">
                                    <h5
                                      className={cn(
                                        "font-bold mb-1 leading-tight",
                                        isCurrent
                                          ? "text-base text-slate-900"
                                          : "text-sm text-slate-700"
                                      )}
                                    >
                                      {stage.statusName || "Unknown"}
                                    </h5>
                                    <p className="text-xs text-slate-500 leading-tight">
                                      {config.description}
                                    </p>

                                    {isCurrent && (
                                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                        Active Now
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {!isLastInRow && (
                                  <div className="flex flex-col items-center justify-center pt-[88px] px-2">
                                    <div className="relative">
                                      <div
                                        className={cn(
                                          "h-1 w-12 rounded-full relative",
                                          isCurrent
                                            ? "bg-gradient-to-r from-amber-400 via-orange-400 to-slate-200"
                                            : "bg-slate-300"
                                        )}
                                      >
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1">
                                          <div className="w-1 h-0.5 bg-white/60 rounded-full" />
                                          <div className="w-1 h-0.5 bg-white/60 rounded-full" />
                                          <div className="w-1 h-0.5 bg-white/60 rounded-full" />
                                        </div>
                                      </div>

                                      {isEvenRow ? (
                                        <ArrowRight
                                          className={cn(
                                            "absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 h-5 w-5",
                                            isCurrent
                                              ? "text-orange-500"
                                              : "text-slate-400"
                                          )}
                                        />
                                      ) : (
                                        <ArrowRight
                                          className={cn(
                                            "absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rotate-180",
                                            isCurrent
                                              ? "text-orange-500"
                                              : "text-slate-400"
                                          )}
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}

                                {isLastInEvenRow && (
                                  <div className="absolute top-[88px] right-0 translate-x-1/2 z-20">
                                    <div className="flex flex-col items-center">
                                      <div className="w-1 h-16 rounded-full relative bg-slate-300">
                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1">
                                          <div className="h-1 w-0.5 bg-white/60 rounded-full" />
                                          <div className="h-1 w-0.5 bg-white/60 rounded-full" />
                                          <div className="h-1 w-0.5 bg-white/60 rounded-full" />
                                        </div>
                                      </div>
                                      <svg
                                        className="h-6 w-6 text-slate-400 -mt-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        aria-hidden
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                        />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                )}

                <div className="mt-8 px-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xs font-semibold text-slate-600">
                      Journey Progress
                    </div>
                    <div className="text-xs text-slate-500">
                      {pipeline.length} / {pipeline.length} milestones reached
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

export default CandidatePipeline;
