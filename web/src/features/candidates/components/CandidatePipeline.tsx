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
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
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

// Status configuration with colors, descriptions, and Lottie animations
const statusConfig: Record<string, any> = {
  untouched: { 
    color: 'from-orange-400 to-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    icon: AlertCircle,
    animation: 'https://lottie.host/469a87a5-dc06-4451-8ba9-681430f82815/FrdEAaIdQk.lottie',
    description: "New candidate",
  },
  interested: { 
    color: 'from-green-400 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    icon: UserCheck,
    animation: 'https://lottie.host/a806adc8-29ef-4a09-956d-0105a35c4f86/PHBSwoLAGL.lottie',
    description: "Showing interest",
  },
  "not interested": { 
    color: 'from-red-400 to-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    icon: XCircle,
    animation: 'https://lottie.host/e3165fc5-a6b7-43d8-a693-46f58759df55/BuGUAAd26d.lottie',
    description: "Not interested",
  },
  "not eligible": { 
    color: 'from-red-400 to-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    icon: XCircle,
    animation: "https://lottie.host/5c18032e-4995-4426-9cb5-5ce4416622ca/XTGAviAX0z.lottie",
    description: "Not eligible",
  },
  "other enquiry": { 
    color: 'from-purple-400 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    icon: Mail,
    animation: "https://lottie.host/9f5f113c-1331-416c-844e-8ca7ef1ef832/9IJATbJipi.lottie",
    description: "Other enquiry",
  },
  future: { 
    color: 'from-indigo-400 to-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    icon: Calendar,
    animation: "https://lottie.host/f66d26fc-d8b5-460e-af75-5c145db78bb6/Y3qUMmgWdm.lottie",
    description: "Future opportunity",
  },
  "on hold": { 
    color: 'from-yellow-400 to-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    icon: Clock,
    animation: "https://lottie.host/fe8c550c-98c1-425b-9c15-ea7ff3022a9f/SBNnDbuqvV.lottie",
    description: "Temporarily paused",
  },
  onhold: { 
    color: 'from-yellow-400 to-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    icon: Clock,
    animation: "https://lottie.host/fe8c550c-98c1-425b-9c15-ea7ff3022a9f/SBNnDbuqvV.lottie",
    description: "Temporarily paused",
  },
  rnr: { 
    color: 'from-pink-400 to-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-300',
    icon: AlertCircle,
    animation: 'https://lottie.host/ad125a14-24a5-4405-83f7-d0e9a0aa3bbc/PHmcJLa3EF.lottie',
    description: "Ready & Referred",
  },
  qualified: { 
    color: 'from-emerald-400 to-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    icon: CheckCircle2,
    animation: 'https://lottie.host/5cdfb2aa-272f-48bd-b4a9-2beb4b179343/MM6t6RYOjD.lottie',
    description: "Qualified candidate",
  },
  deployed: { 
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    icon: Briefcase,
    animation: 'https://lottie.host/b9ab373a-6e93-4979-a51d-c7d125934846/xBU65diZEL.lottie',
    description: "Currently deployed",
  },
  selected: {
    icon: CheckCircle,
    color: "from-green-400 to-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    description: "Selected for process",
  },
  rejected: {
    icon: XCircle,
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    description: "Not suitable",
  },
  "in-process": {
    icon: FileText,
    color: "from-indigo-400 to-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-300",
    description: "Under review",
  },
  shortlisted: {
    icon: UserCheck,
    color: "from-cyan-400 to-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-300",
    description: "Passed screening",
  },
  interviewed: {
    icon: Calendar,
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    description: "Interview completed",
  },
  offered: {
    icon: Award,
    color: "from-orange-400 to-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    description: "Offer extended",
  },
  placed: {
    icon: Briefcase,
    color: "from-emerald-400 to-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    description: "Successfully placed",
  },
  withdrawn: {
    icon: UserX,
    color: "from-rose-400 to-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-300",
    description: "Candidate withdrew",
  },
  default: { 
    color: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    icon: AlertCircle,
    description: "Status update",
  },
};

// Get status configuration
const getStatusConfig = (statusName?: string) => {
  const lowerStatus = (statusName || "").toLowerCase().trim();
  return statusConfig[lowerStatus] || statusConfig.default;
};

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Calculate duration between statuses
const calculateDuration = (
  enteredAt: string,
  exitedAt: string | null
): string => {
  const start = new Date(enteredAt);
  const end = exitedAt ? new Date(exitedAt) : new Date();
  const diffInHours = Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  );

  if (diffInHours < 1) return "< 1 hour";
  if (diffInHours < 24) return `${diffInHours}h`;
  const days = Math.floor(diffInHours / 24);
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
};

export const CandidatePipeline: React.FC<CandidatePipelineProps> = ({
  pipeline,
  className,
}) => {
  if (!pipeline || pipeline.length === 0) {
    return (
      <div className={cn("bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 text-center border border-slate-200", className)}>
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm mb-4">
          <Clock className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-700 mb-2">No Status History</h3>
        <p className="text-sm text-slate-500">This candidate has no status changes recorded yet</p>
      </div>
    );
  }

  const currentStatus = pipeline[pipeline.length - 1];
  const currentStatusName = currentStatus?.statusName ?? "";
  const currentConfig = getStatusConfig(currentStatusName);
  const totalDuration = calculateDuration(pipeline[0].enteredAt, currentStatus?.exitedAt ?? null);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br",
              currentConfig.color,
              "ring-4 ring-white"
            )}>
              {currentConfig.animation ? (
                <div className="w-10 h-10">
                  <DotLottieReact
                    src={currentConfig.animation}
                    loop
                    autoplay
                  />
                </div>
              ) : (
                <currentConfig.icon className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Current Status: {currentStatusName || "Unknown"}
                </h3>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  currentConfig.bgColor,
                  currentConfig.color
                )}>
                  Active
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-2">{currentConfig.description}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Since {formatDate(currentStatus.enteredAt)}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {pipeline.length} status changes
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Total: {totalDuration}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Route Map Journey */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Target className="h-4 w-4 text-slate-600" />
            Status Journey Route Map
          </h4>
        </div>
        
        <div className="p-8">
          {/* Horizontal Route Map with Row Wrapping */}
          <div className="space-y-0">
            {Array.from({ length: Math.ceil(pipeline.length / 5) }).map((_, rowIndex) => {
              const startIdx = rowIndex * 5;
              const endIdx = Math.min(startIdx + 5, pipeline.length);
              const rowStatuses = pipeline.slice(startIdx, endIdx);
              const isEvenRow = rowIndex % 2 === 0;
              const displayStatuses = isEvenRow ? rowStatuses : [...rowStatuses].reverse();
              const hasNextRow = endIdx < pipeline.length;

              return (
                <div key={rowIndex} className="relative overflow-visible">
                  <div className={cn(
                    "flex items-start gap-0",
                    isEvenRow ? "justify-start" : "justify-end"
                  )}>
                    
                    {displayStatuses.map((stage, localIndex) => {
                      const actualIndex = isEvenRow ? startIdx + localIndex : endIdx - 1 - localIndex;
                      const config = getStatusConfig(stage.statusName ?? "");
                      const IconComponent = config.icon;
                      const isLastInRow = localIndex === displayStatuses.length - 1;
                      const isLastOverall = actualIndex === pipeline.length - 1;
                      const isCurrent = isLastOverall;
                      const duration = calculateDuration(stage.enteredAt, stage.exitedAt);
                      const isFirstInOddRow = !isEvenRow && localIndex === 0;
                      const isLastInEvenRow = isEvenRow && isLastInRow && hasNextRow;

                      return (
                        <div key={`${stage.statusId}-${stage.step}`} className="flex items-start relative overflow-visible">
                          {/* Status Milestone */}
                          <div className="flex flex-col items-center min-w-[160px] max-w-[200px] relative">
                            {/* Date & Duration Above */}
                            <div className="mb-3 text-center h-12 flex flex-col justify-end">
                              <div className="text-xs font-medium text-slate-700 mb-0.5">
                                {formatDate(stage.enteredAt)}
                              </div>
                              <div className="text-xs text-slate-500">
                                ⏱️ {duration}
                              </div>
                            </div>

                            {/* Road Node - Circular with Lottie */}
                            <div className="relative z-10 mb-3">
                              <div
                                className={cn(
                                  "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 relative border-4",
                                  config.bgColor,
                                  config.borderColor,
                                  isCurrent
                                    ? "scale-125 shadow-xl"
                                    : "hover:scale-105"
                                )}
                              >
                                {/* Lottie Animation or Icon */}
                                {config.animation ? (
                                  <div className="w-12 h-12">
                                    <DotLottieReact
                                      src={config.animation}
                                      loop
                                      autoplay
                                    />
                                  </div>
                                ) : (
                                  <IconComponent className="h-8 w-8 text-white" />
                                )}
                                
                                {/* Current Status Indicator */}
                                {isCurrent && (
                                  <>
                                    <span className="absolute -top-2 -right-2 flex h-6 w-6">
                                      <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.bgColor)}></span>
                                      <span className="relative inline-flex rounded-full h-6 w-6 items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
                                        ✓
                                      </span>
                                    </span>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-md whitespace-nowrap">
                                      YOU ARE HERE
                                    </div>
                                  </>
                                )}
                                
                                {/* Step Number Badge */}
                                <div className={cn(
                                  "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md",
                                  isCurrent 
                                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                                    : "bg-slate-200 text-slate-700"
                                )}>
                                  {actualIndex + 1}
                                </div>
                              </div>
                            </div>

                            {/* Status Label & Description Below */}
                            <div className="text-center px-2">
                              <h5 className={cn(
                                "font-bold mb-1 leading-tight",
                                isCurrent ? "text-base text-slate-900" : "text-sm text-slate-700"
                              )}>
                                {stage.statusName || "Unknown"}
                              </h5>
                              <p className="text-xs text-slate-500 leading-tight">
                                {config.description}
                              </p>
                              
                              {/* Progress indicator */}
                              {isCurrent && (
                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                                  Active Now
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Road Connection Arrow - Horizontal */}
                          {!isLastInRow && (
                            <div className="flex flex-col items-center justify-center pt-[88px] px-2">
                              <div className="relative">
                                {/* Road/Path */}
                                <div className={cn(
                                  "h-1 w-12 rounded-full relative",
                                  isCurrent 
                                    ? "bg-gradient-to-r from-amber-400 via-orange-400 to-slate-200"
                                    : "bg-slate-300"
                                )}>
                                  {/* Road markings */}
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1">
                                    <div className="w-1 h-0.5 bg-white/60 rounded-full"></div>
                                    <div className="w-1 h-0.5 bg-white/60 rounded-full"></div>
                                    <div className="w-1 h-0.5 bg-white/60 rounded-full"></div>
                                  </div>
                                </div>
                                
                                {/* Arrow - Right for even rows, Left for odd rows */}
                                {isEvenRow ? (
                                  <ArrowRight className={cn(
                                    "absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 h-5 w-5",
                                    isCurrent ? "text-orange-500" : "text-slate-400"
                                  )} />
                                ) : (
                                  <ArrowRight className={cn(
                                    "absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rotate-180",
                                    isCurrent ? "text-orange-500" : "text-slate-400"
                                  )} />
                                )}
                              </div>
                            </div>
                          )}

                          {/* Downward Arrow at end of even row */}
                          {isLastInEvenRow && (
                            <div className="absolute top-[88px] right-0 translate-x-1/2 z-20">
                              <div className="flex flex-col items-center">
                                {/* Vertical Road/Path */}
                                <div className="w-1 h-16 rounded-full relative bg-slate-300">
                                  {/* Road markings */}
                                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1">
                                    <div className="h-1 w-0.5 bg-white/60 rounded-full"></div>
                                    <div className="h-1 w-0.5 bg-white/60 rounded-full"></div>
                                    <div className="h-1 w-0.5 bg-white/60 rounded-full"></div>
                                  </div>
                                </div>
                                
                                {/* Down Arrow */}
                                <svg 
                                  className="h-6 w-6 text-slate-400 -mt-1" 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
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
            })}

            {/* Journey Progress Bar */}
            <div className="mt-8 px-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs font-semibold text-slate-600">Journey Progress</div>
                <div className="text-xs text-slate-500">
                  {pipeline.length} / {pipeline.length} milestones reached
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidatePipeline;
