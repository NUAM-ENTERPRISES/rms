import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Eye, AlertTriangle, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  FileText,
  Stethoscope,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlayCircle,
  Ban,
  FileCheck,
  Database,
  Award,
  BookCheck,
  Building2,
  FileSignature,
  Heart,
  Fingerprint,
  ScrollText,
  Ticket,
  Stamp,
} from "lucide-react";
import type { ProcessingStep as ApiProcessingStep } from "@/services/processingApi";

// Icon mapping for different step keys
const STEP_ICON_MAP: Record<string, typeof FileText> = {
  offer_letter: FileText,
  hrd: FileCheck,
  data_flow: Database,
  eligibility: Award,
  prometric: BookCheck,
  council_registration: Building2,
  document_attestation: FileSignature,
  medical: Heart,
  mofa_number: Stethoscope,
  medical_fitness: Heart,
  biometrics: Fingerprint,
  visa: Stamp,
  emigration: ScrollText,
  ticket: Ticket,
};

const getStepIcon = (key: string) => STEP_ICON_MAP[key] || ClipboardList;

export type ProcessingStepStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "not_applicable";

// Map API status to component status
const mapApiStatusToComponentStatus = (
  apiStatus: "pending" | "in_progress" | "completed" | "rejected" | "resubmission_requested"
): ProcessingStepStatus => {
  switch (apiStatus) {
    case "pending":
      return "not_started";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "rejected":
    case "resubmission_requested":
      return "on_hold";
    default:
      return "not_started";
  }
};

interface TransformedStep {
  key: string;
  label: string;
  description: string;
  icon: typeof FileText;
  status: ProcessingStepStatus;
  apiStatus?: string; // raw API status (e.g., 'cancelled')
  notes?: string;
  updatedAt?: string;
  hasSubSteps?: boolean;
  subStepStatuses?: {
    key: string;
    label: string;
    description: string;
    status: ProcessingStepStatus;
  }[];
  stepId: string;
  hasDocuments: boolean;
  documents: ApiProcessingStep["documents"];
}

export interface OfferLetterStatus {
  hasOfferLetter: boolean;
  status: "pending" | "verified" | "rejected" | "not_uploaded";
  documentId?: string;
  verificationId?: string;
  fileUrl?: string;
  fileName?: string;
}

interface ProcessingStepsCardProps {
  /** Processing steps from API */
  steps: ApiProcessingStep[];
  maxHeight?: string;
  offerLetterStatus?: OfferLetterStatus;
  onOfferLetterClick?: () => void;
  /** Current step key from API (e.g., "hrd", "data_flow") - determines which step is active */
  currentStep?: string;
  onStepClick?: (stepKey: string) => void;
  /** Open the Hire modal (preferred) */
  onOpenHire?: () => void;
  /** If true, the candidate is already hired for this project and the Hire action must be hidden */
  isHired?: boolean;
  /** Optional handler to finalize the entire processing once every step is completed (fallback) */
  onCompleteProcessing?: () => void | Promise<void>;
}

export function ProcessingStepsCard({
  steps,
  maxHeight = "500px",
  offerLetterStatus,
  onOfferLetterClick,
  currentStep,
  onStepClick,
  onOpenHire,
  isHired = false,
  onCompleteProcessing,
}: ProcessingStepsCardProps) {
  const [openStepKey, setOpenStepKey] = useState<string | null>(null);
  const [localCompleting, setLocalCompleting] = useState(false);

  // Transform API steps into component structure with parent-child relationships
  const mergedSteps = useMemo(() => {
    // Separate parent steps and child steps
    const parentSteps = steps.filter((s) => !s.template.parentId);
    const childSteps = steps.filter((s) => s.template.parentId);

    // Sort by order
    parentSteps.sort((a, b) => a.template.order - b.template.order);

    return parentSteps.map((step): TransformedStep => {
      const componentStatus = mapApiStatusToComponentStatus(step.status);
      
      // Find child steps for this parent (match by template ID)
      const children = childSteps.filter((c) => c.template.parentId === step.template.id);
      children.sort((a, b) => a.template.order - b.template.order);

      // Special case for offer_letter - use offerLetterStatus if available
      let finalStatus = componentStatus;
      if (step.template.key === "offer_letter" && offerLetterStatus) {
        if (offerLetterStatus.status === "verified") {
          finalStatus = "completed";
        } else if (offerLetterStatus.status === "pending") {
          finalStatus = "in_progress";
        }
      }

      return {
        key: step.template.key,
        label: step.template.label,
        description: step.template.description || `Processing step ${step.template.order}`,
        icon: getStepIcon(step.template.key),
        status: finalStatus,
        apiStatus: step.status,
        notes: step.rejectionReason || undefined,
        updatedAt: step.updatedAt,
        stepId: step.id,
        hasDocuments: step.template.hasDocuments,
        documents: step.documents,
        hasSubSteps: children.length > 0,
        subStepStatuses: children.length > 0
          ? children.map((child) => ({
              key: child.template.key,
              label: child.template.label,
              description: child.template.description || child.template.label,
              status: mapApiStatusToComponentStatus(child.status),
            }))
          : undefined,
      };
    });
  }, [steps, offerLetterStatus]);

  // Get the index of the current step from API
  const currentStepFromApi = currentStep 
    ? mergedSteps.findIndex((s) => s.key === currentStep)
    : -1;

  const completedCount = mergedSteps.filter((s) => s.status === "completed").length;
  const inProgressCount = mergedSteps.filter((s) => s.status === "in_progress").length;
  const totalSteps = mergedSteps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  // Find the current active step - prefer API currentStep, fallback to first non-completed
  const activeStepIndex = currentStepFromApi >= 0 
    ? currentStepFromApi 
    : mergedSteps.findIndex((s) => s.status !== "completed" && s.status !== "not_applicable");
  const activeStep = activeStepIndex >= 0 ? mergedSteps[activeStepIndex] : null;

  // Generate status message
  const getStatusMessage = () => {
    // If the candidate is already hired, show that prominently
    if (isHired) {
      return {
        message: "Candidate hired for this project",
        type: "success" as const,
      };
    }

    if (completedCount === totalSteps) {
      return {
        message: "All processing steps completed! Ready for flying.",
        type: "success" as const,
      };
    }
    
    // Special handling for Offer Letter step
    if (activeStep?.key === "offer_letter") {
      if (offerLetterStatus) {
        if (offerLetterStatus.status === "not_uploaded") {
          return {
            message: "Offer Letter not uploaded. Please request recruiter to upload.",
            type: "warning" as const,
          };
        }
        if (offerLetterStatus.status === "pending") {
          return {
            message: "Offer Letter uploaded. Please verify to proceed.",
            type: "info" as const,
          };
        }
        if (offerLetterStatus.status === "rejected") {
          return {
            message: "Offer Letter rejected. Waiting for resubmission.",
            type: "hold" as const,
          };
        }
        if (offerLetterStatus.status === "verified") {
          return {
            message: "Offer Letter verified. Proceed to next step.",
            type: "success" as const,
          };
        }
      }
      return {
        message: "Offer Letter not verified. Please start from this step.",
        type: "warning" as const,
      };
    }
    
    if (activeStep) {
      if (activeStep.status === "not_started" || activeStep.status === "in_progress") {
        return {
          message: `${activeStep.label} - Please complete this step to proceed.`,
          type: "warning" as const,
        };
      }
      if (activeStep.status === "on_hold") {
        return {
          message: `${activeStep.label} is on hold. Please resolve pending issues.`,
          type: "hold" as const,
        };
      }
    }
    
    return {
      message: "Start processing by verifying the Offer Letter.",
      type: "warning" as const,
    };
  };

  const statusMessage = getStatusMessage();

  const getStatusConfig = (status: ProcessingStepStatus) => {
    const config: Record<
      ProcessingStepStatus,
      { color: string; bg: string; icon: typeof CheckCircle2; label: string }
    > = {
      completed: {
        color: "text-emerald-600",
        bg: "bg-emerald-100",
        icon: CheckCircle2,
        label: "Done",
      },
      in_progress: {
        color: "text-blue-600",
        bg: "bg-blue-100",
        icon: PlayCircle,
        label: "Active",
      },
      on_hold: {
        color: "text-amber-600",
        bg: "bg-amber-100",
        icon: AlertCircle,
        label: "Hold",
      },
      not_applicable: {
        color: "text-slate-400",
        bg: "bg-slate-100",
        icon: Ban,
        label: "N/A",
      },
      not_started: {
        color: "text-slate-400",
        bg: "bg-slate-50",
        icon: Clock,
        label: "Pending",
      },
    };
    return config[status];
  };

  return (
    <Card className="border-0 shadow-xl overflow-hidden bg-white">
      {/* CSS for blinking animation */}
      <style>{`
        @keyframes blink-orange {
          0%, 100% {
            background-color: rgb(255, 237, 213);
            border-color: rgb(251, 146, 60);
          }
          50% {
            background-color: rgb(254, 215, 170);
            border-color: rgb(249, 115, 22);
          }
        }
        .blink-orange {
          animation: blink-orange 1.5s ease-in-out infinite;
          border-width: 2px;
          border-style: solid;
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(251, 146, 60, 0.4);
          }
          50% {
            box-shadow: 0 0 12px 4px rgba(251, 146, 60, 0.6);
          }
        }
        .pulse-glow {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
      `}</style>

      <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Processing Steps
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-white/70">{completedCount}</span>
              <div className="h-2 w-2 rounded-full bg-blue-400 ml-2" />
              <span className="text-white/70">{inProgressCount}</span>
              <div className="h-2 w-2 rounded-full bg-slate-400 ml-2" />
              <span className="text-white/70">{totalSteps - completedCount - inProgressCount}</span>
            </div>
            <div className="h-10 w-10 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10">
              <span className="text-sm font-black">{progressPercent}%</span>
            </div>


          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>

      {/* Status Message Banner */}
      <div
        className={`px-4 py-3 flex items-center gap-3 border-b ${
          statusMessage.type === "success"
            ? "bg-emerald-50 border-emerald-200"
            : statusMessage.type === "info"
            ? "bg-blue-50 border-blue-200"
            : statusMessage.type === "hold"
            ? "bg-amber-50 border-amber-200"
            : "bg-orange-50 border-orange-200"
        }`}
      >
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
            statusMessage.type === "success"
              ? "bg-emerald-100"
              : statusMessage.type === "info"
              ? "bg-blue-100"
              : statusMessage.type === "hold"
              ? "bg-amber-100"
              : "bg-orange-100"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : statusMessage.type === "info" ? (
            <PlayCircle className="h-4 w-4 text-blue-600" />
          ) : statusMessage.type === "hold" ? (
            <AlertCircle className="h-4 w-4 text-amber-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 justify-between">
            <div className="min-w-0 pr-4">
              <p
                className={`text-sm font-semibold truncate ${
                  statusMessage.type === "success"
                    ? "text-emerald-800"
                    : statusMessage.type === "info"
                    ? "text-blue-800"
                    : statusMessage.type === "hold"
                    ? "text-amber-800"
                    : "text-orange-800"
                }`}
                title={statusMessage.message}
              >
                {statusMessage.message}
              </p>
            </div>

            {/* Hire button (prefers opening Hire modal via `onOpenHire`; falls back to `onCompleteProcessing`) */}
            <div className="flex-shrink-0 ml-4">
              {isHired ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Badge className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm px-3 py-1 rounded-full">
                          <CheckCircle2 className="h-4 w-4" />
                          Hired
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Candidate already hired for this project</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : completedCount === totalSteps && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (onOpenHire) {
                              onOpenHire();
                              return;
                            }

                            if (!onCompleteProcessing) return;
                            try {
                              setLocalCompleting(true);
                              await onCompleteProcessing();
                            } catch (err) {
                              console.error("Complete processing fallback failed", err);
                            } finally {
                              setLocalCompleting(false);
                            }
                          }}
                          disabled={!onOpenHire && !onCompleteProcessing || localCompleting}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {localCompleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Hire
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{onOpenHire ? 'Open hire modal' : onCompleteProcessing ? 'Finalize processing' : 'Handler not provided'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
        {activeStep && (activeStep.status === "not_started" || activeStep.status === "in_progress") && (
          <Badge className="bg-orange-500 text-white text-[10px] uppercase font-bold animate-pulse">
            Action Required
          </Badge>
        )}
      </div>

      <CardContent className="p-0">
        <div 
          className="overflow-auto scrollbar-thin scrollbar-thumb-slate-200"
          style={{ maxHeight }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Left Column */}
            <div className="divide-y divide-slate-100">
              {mergedSteps.slice(0, 6).map((step, index) => (
                <StepItem 
                  key={step.key} 
                  step={step} 
                  index={index} 
                  getStatusConfig={getStatusConfig} 
                  onOpen={() => setOpenStepKey(step.key)}
                  isCurrentStep={activeStepIndex === index}
                  // If all steps are completed, treat every step as completed and enabled so the eye/button remain visible
                  isCompleted={completedCount === totalSteps ? true : index < activeStepIndex}
                  isEnabled={completedCount === totalSteps ? true : index <= activeStepIndex}
                  offerLetterStatus={step.key === "offer_letter" ? offerLetterStatus : undefined}
                  onOfferLetterClick={step.key === "offer_letter" ? onOfferLetterClick : undefined}
                  onStepClick={onStepClick}
                />
              ))}
            </div>
            {/* Right Column */}
            <div className="divide-y divide-slate-100">
              {mergedSteps.slice(6, 12).map((step, index) => (
                <StepItem 
                  key={step.key} 
                  step={step} 
                  index={index + 6} 
                  getStatusConfig={getStatusConfig} 
                  onOpen={() => setOpenStepKey(step.key)}
                  isCurrentStep={activeStepIndex === index + 6}
                  // Show completed state + eye button for all steps when everything is completed
                  isCompleted={completedCount === totalSteps ? true : index + 6 < activeStepIndex}
                  isEnabled={completedCount === totalSteps ? true : index + 6 <= activeStepIndex}
                  onStepClick={onStepClick}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Step Details Dialog */}
      <Dialog open={!!openStepKey} onOpenChange={(isOpen) => { if (!isOpen) setOpenStepKey(null); }}>
        <DialogContent className="sm:max-w-lg">
          {openStepKey && (() => {
            const selected = mergedSteps.find((s) => s.key === openStepKey);
            if (!selected) return null;
            const SelectedIcon = selected.icon as any;
            const statusCfg = getStatusConfig(selected.status);
            return (
              <div>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <SelectedIcon className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="flex-1">
                      <DialogTitle className="text-lg font-bold text-slate-900">{selected.label}</DialogTitle>
                      <DialogDescription className="text-sm text-slate-500">{selected.description}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="mt-4 text-sm text-slate-700">
                  <p className="font-semibold">Status: <span className={`ml-2 px-2 py-0.5 rounded ${statusCfg.bg} ${statusCfg.color} text-[10px] uppercase`}>{statusCfg.label}</span></p>

                  {selected.notes && (
                    <div className="mt-3">
                      <p className="font-semibold text-sm">Notes</p>
                      <p className="text-sm text-slate-600 mt-1">{selected.notes}</p>
                    </div>
                  )}

                  {selected.updatedAt && (
                    <p className="mt-3 text-xs text-slate-400">Updated: {selected.updatedAt}</p>
                  )}

                  {selected.subStepStatuses && (
                    <div className="mt-4">
                      <h4 className="font-bold text-sm mb-2">Sub-steps</h4>
                      <div className="space-y-2">
                        {selected.subStepStatuses.map((ss) => (
                          <div key={ss.key} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                            <div className="text-sm font-medium">{ss.label}</div>
                            <div className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">{getStatusConfig(ss.status).label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setOpenStepKey(null)}>Close</Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StepItem({
  step,
  index,
  getStatusConfig,
  onOpen,
  isCurrentStep,
  isCompleted,
  isEnabled,
  offerLetterStatus,
  onOfferLetterClick,
  onStepClick,
}: {
  step: {
    key: string;
    label: string;
    description: string;
    icon: typeof CheckCircle2;
    status: ProcessingStepStatus;
    apiStatus?: string; // raw API status for special cases like 'cancelled'
    notes?: string;
    updatedAt?: string;
    hasSubSteps?: boolean;
    subStepStatuses?: {
      key: string;
      label: string;
      description: string;
      status: ProcessingStepStatus;
    }[];
  };
  index: number;
  onOpen?: () => void;
  getStatusConfig: (status: ProcessingStepStatus) => {
    color: string;
    bg: string;
    icon: typeof CheckCircle2;
    label: string;
  };
  isCurrentStep?: boolean;
  isCompleted?: boolean;
  isEnabled?: boolean;
  offerLetterStatus?: OfferLetterStatus;
  onOfferLetterClick?: () => void;
  onStepClick?: (stepKey: string) => void;
}) {
  const statusConfig = getStatusConfig(step.status);

  // Determine offer letter specific styling
  const isOfferLetterStep = step.key === "offer_letter";
  const offerLetterPending = isOfferLetterStep && offerLetterStatus?.status === "pending";
  const offerLetterVerified = isOfferLetterStep && offerLetterStatus?.status === "verified";
  const offerLetterRejected = isOfferLetterStep && offerLetterStatus?.status === "rejected";
  const offerLetterNotUploaded = isOfferLetterStep && (!offerLetterStatus || offerLetterStatus.status === "not_uploaded");

  // Use isCompleted and isCurrentStep to determine styling
  const stepCompleted = isCompleted || offerLetterVerified;
  const shouldBlink = isCurrentStep && !stepCompleted;
  const stepEnabled = isEnabled || stepCompleted;
  
  // Override status display for offer letter based on document status
  const getOfferLetterBadgeText = () => {
    if (offerLetterVerified) return "Verified";
    if (offerLetterPending) return "Verify";
    if (offerLetterRejected) return "Rejected";
    if (offerLetterNotUploaded) return "Not Uploaded";
    return statusConfig.label;
  };

  const getOfferLetterDescription = () => {
    if (offerLetterVerified) return "Offer letter verified ✓";
    if (offerLetterPending) return "Uploaded - Click to verify";
    if (offerLetterRejected) return "Rejected - Awaiting resubmission";
    if (offerLetterNotUploaded) return "Not uploaded yet";
    return step.description;
  };

  // Check if this is the Medical step with sub-steps
  if (step.hasSubSteps && step.subStepStatuses) {
    return (
      <div className={`${stepCompleted ? "bg-emerald-50/50" : ""} ${shouldBlink ? "blink-orange pulse-glow rounded-lg m-1" : ""} ${!stepEnabled ? "opacity-90" : ""}`}>
        {/* Main Step Header */}
        <div className={`flex items-center gap-3 p-3 border-b border-slate-100 ${
          stepCompleted 
            ? "bg-gradient-to-r from-emerald-50 to-emerald-100/50" 
            : shouldBlink 
            ? "bg-transparent" 
            : !stepEnabled
            ? "bg-slate-100/50"
            : "bg-gradient-to-r from-rose-50 to-pink-50"
        }`}>
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              stepCompleted
                ? "bg-emerald-500 text-white"
                : shouldBlink
                ? "bg-orange-500 text-white"
                : !stepEnabled
                ? "bg-slate-200 text-slate-500"
                : "bg-rose-100 text-rose-500"
            }`}
          >
            {stepCompleted ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-black text-sm ${
              stepCompleted 
                ? "text-emerald-700" 
                : shouldBlink 
                ? "text-orange-700" 
                : !stepEnabled
                ? "text-slate-600"
                : "text-rose-700"
            }`}>{step.label}</h4>
            <p className={`text-xs ${
              stepCompleted 
                ? "text-emerald-500" 
                : shouldBlink 
                ? "text-orange-500" 
                : !stepEnabled
                ? "text-slate-500"
                : "text-rose-400"
            }`}>{step.description}</p>
          </div>

          {/* Eye button to view step details - only enabled for current and completed steps */}
          {stepEnabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onStepClick) {
                  onStepClick(step.key);
                } else {
                  onOpen && onOpen();
                }
              }}
              aria-label={`View ${step.label} details`}
              className={`p-1.5 rounded-full hover:bg-white/50 ml-2 transition-colors ${
                stepCompleted 
                  ? "bg-emerald-100 hover:bg-emerald-200" 
                  : shouldBlink 
                  ? "bg-orange-100 hover:bg-orange-200" 
                  : "bg-rose-100/80 hover:bg-rose-100"
              }`}
            >
              <Eye className={`h-4 w-4 ${
                stepCompleted 
                  ? "text-emerald-600" 
                  : shouldBlink 
                  ? "text-orange-600" 
                  : "text-rose-600"
              }`} />
            </button>
          )}

          <Badge className={`text-[9px] uppercase font-black tracking-wider shrink-0 border-0 px-2 py-0.5 ${
            stepCompleted
              ? "bg-emerald-500 text-white"
              : shouldBlink
              ? "bg-orange-500 text-white animate-pulse"
              : !stepEnabled
              ? "bg-slate-200 text-slate-400"
              : "bg-rose-100 text-rose-600"
          }`}>
            {stepCompleted ? "Done" : shouldBlink ? "Start" : !stepEnabled ? "Locked" : statusConfig.label}
          </Badge>
        </div>

        {/* Sub-steps */}
        <div className={`pl-6 ${
          step.status === "completed" 
            ? "bg-gradient-to-r from-emerald-50/50 to-transparent" 
            : "bg-gradient-to-r from-rose-50/50 to-transparent"
        }`}>
          {step.subStepStatuses.map((subStep, subIndex) => {
            const subConfig = getStatusConfig(subStep.status);
            return (
              <div
                key={subStep.key}
                className={`flex items-center gap-3 py-2 px-3 border-b last:border-b-0 hover:bg-white/50 transition-colors ${
                  step.status === "completed" 
                    ? "border-emerald-100/50" 
                    : "border-rose-100/50"
                }`}
              >
                <div className={`h-5 w-5 rounded-md bg-white border flex items-center justify-center text-[10px] font-bold ${
                  step.status === "completed" 
                    ? "border-emerald-200 text-emerald-400" 
                    : "border-rose-200 text-rose-400"
                }`}>
                  {String.fromCharCode(97 + subIndex)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs text-slate-700">{subStep.label}</p>
                </div>
                <Badge
                  className={`text-[8px] uppercase font-bold tracking-wider shrink-0 border-0 px-1.5 py-0 ${subConfig.bg} ${subConfig.color}`}
                >
                  {subConfig.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Regular step without sub-steps
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 transition-colors group",
        stepCompleted
          ? "bg-emerald-50/50 hover:bg-emerald-50"
          : shouldBlink
          ? "blink-orange pulse-glow rounded-lg m-1"
          : offerLetterRejected
          ? "bg-red-50/50 hover:bg-red-50"
          : step.apiStatus === 'cancelled'
          ? "bg-rose-50/50 hover:bg-rose-50"
          : !stepEnabled
          ? "bg-slate-100/30 opacity-90"
          : "hover:bg-slate-50",
        stepEnabled ? "cursor-pointer" : "cursor-not-allowed"
      )}
      onClick={() => {
        if (!stepEnabled) return;
        if (isOfferLetterStep && onOfferLetterClick) {
          onOfferLetterClick();
        } else if (onStepClick) {
          onStepClick(step.key);
        }
      }}
    >
      {/* Step Number */}
      <div
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
          stepCompleted
            ? "bg-emerald-500 text-white"
            : shouldBlink
            ? "bg-orange-500 text-white"
            : offerLetterPending
            ? "bg-blue-100 text-blue-600"
            : offerLetterRejected
            ? "bg-red-100 text-red-600"
            : !stepEnabled
            ? "bg-slate-200 text-slate-500"
            : "bg-slate-100 text-slate-400"
        )}
      >
        {stepCompleted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          index + 1
        )}
      </div>

      {/* Step Info */}
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "font-bold text-sm truncate",
          stepCompleted
            ? "text-emerald-700"
            : shouldBlink
            ? "text-orange-700"
            : offerLetterPending
            ? "text-blue-700"
            : offerLetterRejected
            ? "text-red-700"
            : !stepEnabled
            ? "text-slate-600"
            : "text-slate-700"
        )}>
          {step.label}
        </h4>
        <p className={cn(
          "text-xs truncate",
          stepCompleted
            ? "text-emerald-500"
            : shouldBlink
            ? "text-orange-500"
            : offerLetterPending
            ? "text-blue-500"
            : offerLetterRejected
            ? "text-red-500"
            : !stepEnabled
            ? "text-slate-500"
            : "text-slate-400"
        )}>
          {isOfferLetterStep ? getOfferLetterDescription() : (step.apiStatus === 'cancelled' ? `Processing cancelled — ${step.notes || 'No reason provided'}` : step.description)}
        </p>
      </div>

      {/* View details button - only show for enabled steps */}
      {stepEnabled && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isOfferLetterStep && onOfferLetterClick) {
              onOfferLetterClick();
            } else if (onStepClick) {
              onStepClick(step.key);
            } else {
              onOpen && onOpen();
            }
          }}
          aria-label={`View ${step.label} details`}
          className={cn(
            "p-1.5 rounded-full transition-colors",
            stepCompleted
              ? "bg-emerald-100 hover:bg-emerald-200"
              : shouldBlink || offerLetterPending
              ? "bg-orange-100 hover:bg-orange-200"
              : offerLetterRejected
              ? "bg-red-100 hover:bg-red-200"
              : "bg-slate-100 hover:bg-slate-200"
          )}
        >
          <Eye className={cn(
            "h-4 w-4",
            stepCompleted
              ? "text-emerald-600"
              : shouldBlink || offerLetterPending
              ? "text-orange-600"
              : offerLetterRejected
              ? "text-red-600"
              : "text-slate-600"
          )} />
        </button>
      )}

      {/* Status Badge */}
      <Badge
        className={cn(
          "text-[9px] uppercase font-black tracking-wider shrink-0 border-0 px-2 py-0.5",
          stepCompleted
            ? "bg-emerald-500 text-white"
            : shouldBlink && !offerLetterPending
            ? "bg-orange-500 text-white animate-pulse"
            : offerLetterPending
            ? "bg-blue-500 text-white animate-pulse"
            : offerLetterRejected
            ? "bg-red-500 text-white"
            : step.apiStatus === 'cancelled'
            ? "bg-rose-500 text-white"
            : !stepEnabled
            ? "bg-slate-200 text-slate-400"
            : `${statusConfig.bg} ${statusConfig.color}`
        )}
      >
        {isOfferLetterStep 
          ? getOfferLetterBadgeText()
          : step.apiStatus === 'cancelled'
          ? "Cancelled"
          : stepCompleted 
          ? "Done" 
          : shouldBlink 
          ? "Start" 
          : !stepEnabled
          ? "Locked"
          : statusConfig.label}
      </Badge>
    </div>
  );
}
