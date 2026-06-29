import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Eye, AlertTriangle, Loader2, Hash } from "lucide-react";
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
  Calendar,
  Edit3,
  Settings2,
} from "lucide-react";
import type { ProcessingStep as ApiProcessingStep } from "@/services/processingApi";
import { useSubmitHrdDateMutation } from "@/services/processingApi";
import ConfirmSubmitDateModal from "@/features/processing/components/ConfirmSubmitDateModal";
import ConfirmEditSubmitDateModal from "@/features/processing/components/ConfirmEditSubmitDateModal";
import { LockedProcessingActionButton } from "@/features/processing/components/LockedProcessingActionButton";
import { useProcessingActionLock } from "@/features/processing/context/ProcessingActionLockContext";

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
  | "cancelled"
  | "not_applicable";

// Map API status to component status
const mapApiStatusToComponentStatus = (
  apiStatus: string,
): ProcessingStepStatus => {
  switch (apiStatus) {
    case "pending":
      return "not_started";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "on_hold":
      return "on_hold";
    case "cancelled":
      return "cancelled";
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
  submittedAt?: string | null;
  completedAt?: string | null;
  visaIssuedAt?: string | null;
  visaValidAt?: string | null;
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
  receivedAt?: string | null;
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
  /** Optional handler to update a step's submitted date */
  onUpdateSubmittedDate?: (stepId: string, submittedAt: string | null) => void | Promise<void>;
  /** Locker file number to display (preferred) */
  lockerFileNumber?: string | null;
  /** @deprecated Prefer `lockerFileNumber`. */
  fileNumber?: string | null;
  /** @deprecated No longer used in header. */
  onEditFileNumber?: () => void;
  /** Optional handler to manage step document requirement rules. */
  onManageStepDocs?: (stepKey: string) => void;
  /** Whether current user can manage step rules. */
  canManageStepDocs?: boolean;
  /** Overall processing status (e.g. cancelled, on_hold). */
  processingStatus?: string;
}

export function ProcessingStepsCard({
  steps,
  maxHeight = "950px",
  offerLetterStatus,
  onOfferLetterClick,
  currentStep,
  onStepClick,
  onOpenHire,
  isHired = false,
  onCompleteProcessing,
  onUpdateSubmittedDate,
  lockerFileNumber,
  onManageStepDocs,
  canManageStepDocs = false,
  processingStatus,
}: ProcessingStepsCardProps) {
  const [openStepKey, setOpenStepKey] = useState<string | null>(null);
  const [localCompleting, setLocalCompleting] = useState(false);
  const { isLocked: mutationsLocked } = useProcessingActionLock();

  // Submitted date editor state: store local overrides and the open editor step id
  const [openSubmittedEditorKey, setOpenSubmittedEditorKey] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string>(""); // yyyy-mm-dd format
  const [submittedDates, setSubmittedDates] = useState<Record<string, string | null>>({});
  const [, setSavingSubmittedDate] = useState(false);
  // Confirmation modal state (reuse HRD confirm modals)
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  // RTK Query mutation to save submitted date (API name: submitHrdDate)
  const [submitHrdDate] = useSubmitHrdDateMutation();

  const formatDisplayDate = (iso?: string | null) => {
    if (!iso) return "Not submitted";
    try {
      const dt = new Date(iso);
      return dt.toLocaleString();
    } catch (err) {
      return iso;
    }
  };

  const formatShortDate = (iso?: string | null) => {
    if (!iso) return "Not set";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Not set";
    }
  };

  const toInputDate = (iso?: string | null) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      // produce yyyy-mm-dd for date input
      return d.toISOString().slice(0, 10);
    } catch (err) {
      return "";
    }
  };

  const openEditSubmitted = (stepKey: string, currentIso?: string | null) => {
    // Open the HRD-style Edit Submission Date modal directly (prefill if currentIso available)
    setOpenSubmittedEditorKey(stepKey);
    setEditingDate(toInputDate(currentIso));
    setConfirmEditOpen(true);
  };

  const saveSubmitted = async (stepId: string, date?: Date | null) => {
    // Save locally and call optional callback later
    setSavingSubmittedDate(true);
    try {
      const iso = date ? date.toISOString() : (editingDate ? new Date(editingDate).toISOString() : null);
      setSubmittedDates((s) => ({ ...s, [stepId]: iso }));

      // Try calling API mutation (submitHrdDate) if available
      try {
        await submitHrdDate({ stepId, submittedAt: iso ?? "" }).unwrap();
      } catch (apiErr) {
        // If API fails, we still keep local optimistic state and log error
        console.error("submitHrdDate API failed", apiErr);
      }

      // If parent wants to handle API save, call `onUpdateSubmittedDate` if provided
      if (typeof onUpdateSubmittedDate === "function") {
        try {
          await onUpdateSubmittedDate(stepId, iso ?? null);
        } catch (err) {
          console.error("Parent onUpdateSubmittedDate failed", err);
        }
      }

      return true;
    } catch (err) {
      console.error("Failed to save submitted date", err);
      return false;
    } finally {
      setSavingSubmittedDate(false);
      setOpenSubmittedEditorKey(null);
    }
  }; 

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
        label:
          step.template.key === "prometric"
            ? "Licensing Exam"
            : step.template.key === "document_received"
              ? "Document Original Received"
              : step.template.label,
        description:
          step.template.key === "document_received"
            ? "Processing step 2"
            : step.template.description || `Processing step ${step.template.order}`,
        icon: getStepIcon(step.template.key),
        status: finalStatus,
        apiStatus: step.status,
        notes: step.rejectionReason || undefined,
        updatedAt: step.updatedAt,
        submittedAt: step.submittedAt || null,
        completedAt: step.completedAt || null,
        visaIssuedAt: step.visaIssuedAt || null,
        visaValidAt: step.visaValidAt || null,
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
  const progressPercent =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const isProcessingFrozen =
    processingStatus === "cancelled" || processingStatus === "on_hold";

  // Enable hiring even when full workflow is not completed if Visa and Ticket are done
  const isVisaCompleted = mergedSteps.find((s) => s.key === "visa")?.status === "completed";
  const isTicketCompleted = mergedSteps.find((s) => s.key === "ticket")?.status === "completed";
  const canShowHireButton = !isHired && (completedCount === totalSteps || (isVisaCompleted && isTicketCompleted));

  // Find the current active step - prefer API currentStep, fallback to first non-completed
  const activeStepIndex = currentStepFromApi >= 0 
    ? currentStepFromApi 
    : mergedSteps.findIndex((s) => s.status !== "completed" && s.status !== "not_applicable");
  const activeStep = activeStepIndex >= 0 ? mergedSteps[activeStepIndex] : null;

  // Generate status message
  const getStatusMessage = () => {
    if (processingStatus === "cancelled") {
      return {
        message:
          "Processing cancelled — all steps remain visible. Use the eye icon to view details; step actions are disabled.",
        type: "cancelled" as const,
      };
    }

    if (processingStatus === "on_hold") {
      return {
        message:
          "Processing on hold — all steps remain visible. Use the eye icon to view details; step actions are disabled.",
        type: "hold" as const,
      };
    }

    // If the candidate is already hired, show that prominently
    if (isHired) {
      return {
        message: "Candidate hired for this project",
        type: "success" as const,
      };
    }

    if (canShowHireButton) {
      return {
        message: "Visa and Ticket completed – ready to hire!",
        type: "success" as const,
      };
    }

    if (completedCount === totalSteps) {
      return {
        message: "All processing steps completed! Ready for flying.",
        type: "success" as const,
      };
    }
    
    // Show concise status messages per active step — pending, in progress, or on hold
    if (activeStep) {
      if (activeStep.status === "not_started") {
        return {
          message: `${activeStep.label} — Pending`,
          type: "warning" as const,
        };
      }

      if (activeStep.status === "in_progress") {
        return {
          message: `${activeStep.label} — In progress`,
          type: "info" as const,
        };
      }

      if (activeStep.status === "on_hold") {
        return {
          message: `${activeStep.label} — On hold`,
          type: "hold" as const,
        };
      }
    }

    return {
      message: "Processing steps overview",
      type: "info" as const,
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
        label: "In Progress",
      },
      on_hold: {
        color: "text-violet-600",
        bg: "bg-violet-100",
        icon: AlertCircle,
        label: "Hold",
      },
      cancelled: {
        color: "text-rose-600",
        bg: "bg-rose-100",
        icon: Ban,
        label: "Cancelled",
      },
      not_applicable: {
        color: "text-slate-400",
        bg: "bg-slate-100",
        icon: Ban,
        label: "N/A",
      },
      not_started: {
        color: "text-violet-600",
        bg: "bg-violet-100",
        icon: Clock,
        label: "Pending",
      },
    };
    return config[status];
  };

  const pendingCount = totalSteps - completedCount - inProgressCount;
  const lockerDisplay = lockerFileNumber ?? null;

  return (
    <Card className="min-h-[950px] border-0 shadow-xl overflow-hidden bg-white">

      <CardHeader className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white px-4 py-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-xs font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Processing Steps
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20">
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 group-hover:bg-white/30 transition-colors">
                      <Hash className="h-3.5 w-3.5 text-violet-100" />
                    </div>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Locker No.</span>
                      <span className="text-xs font-black text-white group-hover:text-violet-100 transition-colors">
                        {lockerDisplay || "Not assigned"}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-800 text-white border-slate-700">
                  <p>
                    {lockerDisplay
                      ? `Locker location: ${lockerDisplay}`
                      : "Locker number not assigned yet"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-wider">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>{completedCount}</span>
              <span className="text-white/50 font-medium normal-case">done</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-wider">
              <div className="h-2 w-2 rounded-full bg-sky-300" />
              <span>{inProgressCount}</span>
              <span className="text-white/50 font-medium normal-case">active</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-wider">
              <div className="h-2 w-2 rounded-full bg-violet-300" />
              <span>{pendingCount}</span>
              <span className="text-white/50 font-medium normal-case">pending</span>
            </div>
            <div className="h-9 w-9 rounded-xl border border-white/30 flex items-center justify-center bg-white/10 shrink-0">
              <span className="text-xs font-black">{progressPercent}%</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Overall progress</span>
            <span className="text-xs font-bold text-white/80">{completedCount} of {totalSteps} steps</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>

      {/* Status Message Banner */}
      <div
        className={cn(
          "px-4 py-3 flex items-center gap-3 border-b",
          statusMessage.type === "success" && "bg-emerald-50 border-emerald-100",
          statusMessage.type === "info" && "bg-blue-50 border-blue-100",
          statusMessage.type === "cancelled" && "bg-rose-50 border-rose-100",
          (statusMessage.type === "hold" || statusMessage.type === "warning") && "bg-violet-50 border-violet-100",
        )}
      >
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
            statusMessage.type === "success" && "bg-emerald-100",
            statusMessage.type === "info" && "bg-blue-100",
            statusMessage.type === "cancelled" && "bg-rose-100",
            (statusMessage.type === "hold" || statusMessage.type === "warning") && "bg-violet-100",
          )}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : statusMessage.type === "info" ? (
            <PlayCircle className="h-4 w-4 text-blue-600" />
          ) : statusMessage.type === "cancelled" ? (
            <AlertCircle className="h-4 w-4 text-rose-600" />
          ) : statusMessage.type === "hold" ? (
            <AlertCircle className="h-4 w-4 text-violet-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-violet-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold truncate",
                  statusMessage.type === "success" && "text-emerald-800",
                  statusMessage.type === "info" && "text-blue-800",
                  statusMessage.type === "cancelled" && "text-rose-800",
                  (statusMessage.type === "hold" || statusMessage.type === "warning") && "text-violet-800",
                )}
                title={statusMessage.message}
              >
                {statusMessage.message}
              </p>
              {activeStep && (activeStep.status === "not_started" || activeStep.status === "in_progress") && (
                <Badge className="bg-indigo-600 text-white text-[10px] uppercase font-bold shrink-0">
                  Action required
                </Badge>
              )}
            </div>

            {/* Hire button (prefers opening Hire modal via `onOpenHire`; falls back to `onCompleteProcessing`) */}
            <div className="flex-shrink-0">
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
              ) : canShowHireButton && (
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
      </div>

      <CardContent className="p-0 bg-gradient-to-b from-slate-50/60 to-white">
        <div
          className="overflow-visible"
          style={{ minHeight: maxHeight }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-slate-100">
            {mergedSteps.length === 0 ? (
              <div className="col-span-full p-8 text-center text-sm text-muted-foreground">
                No processing steps are available to display.
              </div>
            ) : (
              <>
            <div className="p-3 space-y-2">
              {mergedSteps.slice(0, 6).map((step, index) => (
                <StepItem
                  key={step.key}
                  step={step}
                  index={index}
                  getStatusConfig={getStatusConfig}
                  onOpen={() => setOpenStepKey(step.key)}
                  isCompleted={completedCount === totalSteps ? true : index < activeStepIndex}
                  isActive={!isProcessingFrozen && index === activeStepIndex}
                  isEnabled={true}
                  forceViewEnabled={isProcessingFrozen}
                  offerLetterStatus={step.key === "offer_letter" ? offerLetterStatus : undefined}
                  onOfferLetterClick={step.key === "offer_letter" ? onOfferLetterClick : undefined}
                  onStepClick={onStepClick}
                  onManageStepDocs={onManageStepDocs}
                  canManageStepDocs={canManageStepDocs}
                  submittedAt={submittedDates[step.stepId] ?? step.submittedAt}
                  completedAt={step.completedAt}
                  onEditSubmitted={() => openEditSubmitted(step.stepId, submittedDates[step.stepId] ?? step.submittedAt)}
                  mutationsLocked={mutationsLocked}
                  isHired={isHired}
                />
              ))}
            </div>
            <div className="p-3 space-y-2">
              {mergedSteps.slice(6).map((step, index) => (
                <StepItem
                  key={step.key}
                  step={step}
                  index={index + 6}
                  getStatusConfig={getStatusConfig}
                  onOpen={() => setOpenStepKey(step.key)}
                  isCompleted={completedCount === totalSteps ? true : index + 6 < activeStepIndex}
                  isActive={!isProcessingFrozen && index + 6 === activeStepIndex}
                  isEnabled={true}
                  forceViewEnabled={isProcessingFrozen}
                  onStepClick={onStepClick}
                  onManageStepDocs={onManageStepDocs}
                  canManageStepDocs={canManageStepDocs}
                  submittedAt={submittedDates[step.stepId] ?? step.submittedAt}
                  completedAt={step.completedAt}
                  onEditSubmitted={() => openEditSubmitted(step.stepId, submittedDates[step.stepId] ?? step.submittedAt)}
                  mutationsLocked={mutationsLocked}
                  isHired={isHired}
                />
              ))}
            </div>
              </>
            )}
          </div>
        </div>
      </CardContent>

      {/* Step Details Dialog */}
      <Dialog open={!!openStepKey} onOpenChange={(isOpen) => { if (!isOpen) setOpenStepKey(null); }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {openStepKey && (() => {
            const selected = mergedSteps.find((s) => s.key === openStepKey);
            if (!selected) return null;
            const SelectedIcon = selected.icon;
            const statusCfg = getStatusConfig(selected.status);
            return (
              <div>
                <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 px-6 py-5 text-white">
                  <DialogHeader className="space-y-0">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center shadow-md">
                        <SelectedIcon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <DialogTitle className="text-lg font-bold text-white">{selected.label}</DialogTitle>
                        <DialogDescription className="text-sm text-white/70">{selected.description}</DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                </div>

                <div className="px-6 py-4 text-sm text-slate-700">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</span>
                    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold", statusCfg.bg, statusCfg.color)}>{statusCfg.label}</span>
                  </div>

                  {selected.notes && (
                    <div className="mt-3">
                      <p className="font-semibold text-sm">Notes</p>
                      <p className="text-sm text-slate-600 mt-1">{selected.notes}</p>
                    </div>
                  )}

                  {selected.updatedAt && (
                    <p className="mt-3 text-xs text-slate-400">Updated: {selected.updatedAt}</p>
                  )}

                  {selected.key === "visa" && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                          Visa issued
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {formatShortDate(selected.visaIssuedAt)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                          Visa expiry
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {formatShortDate(selected.visaValidAt)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show submitted date and edit control in the details modal */}
                  {!selected.key.startsWith("offer_letter") && selected.key !== "visa" && (
                    <div className="mt-3">
                      {selected.status === 'completed' ? (
                        <div className="w-full flex items-start justify-between gap-4">
                          <div className="text-xs">
                            <div className="text-[10px] text-slate-400">
                              {selected.key === "document_received" ? "Document original received" : "Submitted at"}
                            </div>
                            <div className="text-sm font-semibold">{formatDisplayDate(submittedDates[selected.stepId] ?? selected.submittedAt) || '—'}</div>
                          </div>

                          <div className="text-xs text-right">
                            <div className="text-[10px] text-slate-400">Completed at</div>
                            <div className={`text-sm font-semibold ${statusCfg.color}`}>{formatDisplayDate(selected.completedAt ?? submittedDates[selected.stepId] ?? selected.submittedAt) || '—'}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-500">
                            {selected.key === "document_received" ? "Document original received" : "Submitted"}: {formatDisplayDate(submittedDates[selected.stepId] ?? selected.submittedAt)}
                          </div>

                          <div>
                            <LockedProcessingActionButton forceDisabled={mutationsLocked}>
                              <button
                                className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-80"
                                disabled={mutationsLocked}
                                onClick={() => {
                                  if (!mutationsLocked) {
                                    openEditSubmitted(selected.stepId, submittedDates[selected.stepId] ?? selected.submittedAt);
                                  }
                                }}
                              >
                                <Edit3 className={`h-4 w-4 ${statusCfg.color}`} />
                              </button>
                            </LockedProcessingActionButton>
                          </div>
                        </div>
                      )}
                    </div>
                  )}  

                  {/* Sub-steps intentionally hidden in this card UI */}
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-slate-50/50">
                  <Button variant="outline" onClick={() => setOpenStepKey(null)}>Close</Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>



      {/* Confirm modals (reuse HRD confirm dialogs) */}
      <ConfirmSubmitDateModal
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        date={editingDate ? new Date(editingDate) : null}
        isSubmitting={confirmSubmitting}
        onConfirm={async () => {
          if (!openSubmittedEditorKey) return;
          setConfirmSubmitting(true);
          try {
            await saveSubmitted(openSubmittedEditorKey);
          } finally {
            setConfirmSubmitting(false);
            setConfirmSubmitOpen(false);
          }
        }}
      />

      <ConfirmEditSubmitDateModal
        isOpen={confirmEditOpen}
        onClose={() => setConfirmEditOpen(false)}
        existingDate={openSubmittedEditorKey ? (submittedDates[openSubmittedEditorKey] ?? mergedSteps.find(s => s.stepId === openSubmittedEditorKey)?.submittedAt) : undefined}
        initialDate={editingDate ? new Date(editingDate).toISOString() : undefined}
        isSubmitting={confirmSubmitting}
        onConfirm={async (newDate: Date) => {
          if (!openSubmittedEditorKey) return false;
          setConfirmSubmitting(true);
          try {
            const ok = await saveSubmitted(openSubmittedEditorKey, newDate);
            return ok;
          } finally {
            setConfirmSubmitting(false);
            setConfirmEditOpen(false);
          }
        }}
      />
    </Card>
  );
}

/** Glass + glow overlay for completed / verified step cards */
function VerifiedStepGlazeOverlay() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/70 via-white/25 to-emerald-200/35"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -inset-px rounded-xl bg-emerald-400/10 blur-md"
        aria-hidden
      />
    </>
  );
}

const verifiedStepShellClasses =
  "relative border-emerald-300/80 bg-gradient-to-br from-emerald-50/95 via-white/80 to-emerald-100/55 backdrop-blur-md shadow-[0_0_0_1px_rgba(16,185,129,0.14),0_8px_32px_rgba(16,185,129,0.2)] ring-2 ring-emerald-300/40 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_12px_40px_rgba(16,185,129,0.28)]";

const verifiedStepHeaderClasses =
  "bg-gradient-to-r from-emerald-50/80 via-white/50 to-emerald-100/45 backdrop-blur-sm";

const verifiedStepIconClasses =
  "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_18px_rgba(16,185,129,0.55)] ring-2 ring-emerald-300/50";

const verifiedStepBadgeClasses =
  "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_0_14px_rgba(16,185,129,0.45)] ring-1 ring-emerald-300/60";

const verifiedStepFooterClasses =
  "border-t border-emerald-200/80 bg-gradient-to-r from-emerald-50/60 via-white/40 to-emerald-50/50 backdrop-blur-sm";

/** Glass + glow overlay for in-progress step cards */
function InProgressStepGlazeOverlay() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/70 via-white/25 to-blue-200/35"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -inset-px rounded-xl bg-blue-400/10 blur-md"
        aria-hidden
      />
    </>
  );
}

const inProgressStepShellClasses =
  "relative border-blue-300/80 bg-gradient-to-br from-blue-50/95 via-white/80 to-blue-100/55 backdrop-blur-md shadow-[0_0_0_1px_rgba(59,130,246,0.14),0_8px_32px_rgba(59,130,246,0.2)] ring-2 ring-blue-300/40 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_12px_40px_rgba(59,130,246,0.28)]";

const inProgressStepHeaderClasses =
  "bg-gradient-to-r from-blue-50/80 via-white/50 to-blue-100/45 backdrop-blur-sm";

const inProgressStepIconClasses =
  "bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_0_18px_rgba(59,130,246,0.55)] ring-2 ring-blue-300/50";

const inProgressStepBadgeClasses =
  "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_0_14px_rgba(59,130,246,0.45)] ring-1 ring-blue-300/60";

const inProgressStepFooterClasses =
  "border-t border-blue-200/80 bg-gradient-to-r from-blue-50/60 via-white/40 to-blue-50/50 backdrop-blur-sm";

const inProgressDateChipClasses =
  "bg-white/60 backdrop-blur-sm border border-blue-200/80 text-blue-700 shadow-[0_0_12px_rgba(59,130,246,0.12)]";

function StepItem({
  step,
  index,
  getStatusConfig,
  onOpen,
  isCompleted,
  isActive = false,
  isEnabled,
  forceViewEnabled = false,
  offerLetterStatus,
  onOfferLetterClick,
  onStepClick,
  onManageStepDocs,
  canManageStepDocs,
  submittedAt,
  completedAt,
  onEditSubmitted,
  mutationsLocked = false,
  isHired = false,
}: {
  step: {
    key: string;
    label: string;
    description: string;
    icon: typeof CheckCircle2;
    status: ProcessingStepStatus;
    apiStatus?: string;
    notes?: string;
    updatedAt?: string;
    hasDocuments: boolean;
    hasSubSteps?: boolean;
    subStepStatuses?: {
      key: string;
      label: string;
      description: string;
      status: ProcessingStepStatus;
    }[];
    visaIssuedAt?: string | null;
    visaValidAt?: string | null;
  };
  index: number;
  onOpen?: () => void;
  getStatusConfig: (status: ProcessingStepStatus) => {
    color: string;
    bg: string;
    icon: typeof CheckCircle2;
    label: string;
  };
  isCompleted?: boolean;
  isActive?: boolean;
  isEnabled?: boolean;
  forceViewEnabled?: boolean;
  offerLetterStatus?: OfferLetterStatus;
  onOfferLetterClick?: () => void;
  onStepClick?: (stepKey: string) => void;
  onManageStepDocs?: (stepKey: string) => void;
  canManageStepDocs?: boolean;
  submittedAt?: string | null;
  completedAt?: string | null;
  onEditSubmitted?: () => void;
  mutationsLocked?: boolean;
  isHired?: boolean;
}) {
  const statusConfig = getStatusConfig(step.status);
  const StepIcon = step.icon;

  const formatShortDate = (iso?: string | null) => {
    if (!iso) return "Not set";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Not set";
    }
  };

  // Determine offer letter specific styling
  const isOfferLetterStep = step.key === "offer_letter";
  const isVisaStep = step.key === "visa";
  const offerLetterPending = isOfferLetterStep && offerLetterStatus?.status === "pending";
  const offerLetterVerified = isOfferLetterStep && offerLetterStatus?.status === "verified";
  const offerLetterRejected = isOfferLetterStep && offerLetterStatus?.status === "rejected";
  const offerLetterNotUploaded = isOfferLetterStep && (!offerLetterStatus || offerLetterStatus.status === "not_uploaded");

  // Determine general step states
  const isPending = step.status === "not_started";
  const isInProgress = step.status === "in_progress";

  // Use isCompleted and step states to determine styling
  // Consider the step's actual status as well — mark completed when API reports 'completed' or when `completedAt` is present
  const stepCompleted = isCompleted || offerLetterVerified || step.status === 'completed' || !!completedAt;
  const stepInProgressVisual = !stepCompleted && (isInProgress || offerLetterPending);
  const stepEnabled =
    forceViewEnabled ||
    isEnabled ||
    stepCompleted ||
    isPending ||
    isInProgress;
  const showVisaDatesFooter =
    isVisaStep &&
    (!!step.visaIssuedAt ||
      !!step.visaValidAt ||
      stepCompleted ||
      isInProgress ||
      isPending);
  const isVisaExpired =
    !!step.visaValidAt && new Date(step.visaValidAt).getTime() < Date.now();

  const cardBorderClass = stepCompleted
    ? "border border-emerald-200"
    : isPending
    ? "border border-violet-200"
    : isInProgress
    ? "border border-blue-200"
    : offerLetterRejected
    ? "border border-rose-200"
    : "border border-slate-100";

  const cardShellClass = cn(
    "rounded-xl overflow-hidden flex flex-col transition-all duration-300",
    stepCompleted
      ? verifiedStepShellClasses
      : stepInProgressVisual
        ? inProgressStepShellClasses
        : cn(
            "bg-white shadow-sm",
            cardBorderClass,
            isActive && "ring-2 ring-indigo-400/70 ring-offset-2 shadow-md",
            stepEnabled && "hover:shadow-md",
          ),
  );

  // Override status display for offer letter based on document status
  const getOfferLetterBadgeText = () => {
    if (offerLetterVerified) return "Verified";
    if (offerLetterPending) return "Please verify";
    if (offerLetterRejected) return "Rejected";
    if (offerLetterNotUploaded) return "Not Uploaded";
    return statusConfig.label;
  };

  const getOfferLetterDescription = () => {
    const receivedLabel = offerLetterStatus?.receivedAt
      ? `Received on ${new Date(offerLetterStatus.receivedAt).toLocaleDateString()}`
      : "";

    if (offerLetterVerified) return `Offer letter verified ✓${receivedLabel ? ` · ${receivedLabel}` : ""}`;
    if (offerLetterPending) return `Uploaded - Please verify${receivedLabel ? ` · ${receivedLabel}` : ""}`;
    if (offerLetterRejected) return `Rejected - Awaiting resubmission${receivedLabel ? ` · ${receivedLabel}` : ""}`;
    if (offerLetterNotUploaded) return "Not uploaded yet";
    return step.description;
  };

  const isSubmissionDateRequired = ![
    "eligibility",
    "prometric",
    "council_registration",
    "document_attestation",
    "visa",
    "ticket",
  ].includes(step.key);
  const isDocumentOriginalReceivedStep = step.key === "document_received";
  const submittedAtLabel = isDocumentOriginalReceivedStep
    ? "Document original received"
    : "Submitted at";
  const submittedAtEmptyLabel = isDocumentOriginalReceivedStep
    ? "Not received"
    : "Not submitted";

  // Check if this is the Medical step with sub-steps
  if (step.hasSubSteps && step.subStepStatuses) {
    return (
      <div className={cardShellClass}>
        {stepCompleted && <VerifiedStepGlazeOverlay />}
        {stepInProgressVisual && <InProgressStepGlazeOverlay />}
        <div
          className={cn(
            "relative flex items-start gap-3 p-3",
            stepCompleted && verifiedStepHeaderClasses,
            stepInProgressVisual && inProgressStepHeaderClasses,
            isPending && "bg-violet-50/40",
            !stepCompleted && !stepInProgressVisual && !isPending && "bg-white",
          )}
        >
          <div
            className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm",
              stepCompleted && verifiedStepIconClasses,
              stepInProgressVisual && inProgressStepIconClasses,
              isPending && "bg-gradient-to-br from-violet-500 to-indigo-600 text-white",
              !stepEnabled && !stepCompleted && !stepInProgressVisual && !isPending && "bg-slate-200 text-slate-500",
              stepEnabled && !stepCompleted && !stepInProgressVisual && !isPending && "bg-rose-100 text-rose-500",
            )}
          >
            {stepCompleted ? (
              <CheckCircle2 className="h-4 w-4 drop-shadow-sm" />
            ) : (
              <div className="relative">
                <StepIcon className="h-4 w-4" />
                <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-white text-[8px] font-black text-indigo-600 flex items-center justify-center leading-none">
                  {index + 1}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-black text-sm leading-snug break-words ${
              stepCompleted 
                ? "text-emerald-800 drop-shadow-sm" 
                : stepInProgressVisual
                ? "text-blue-800 drop-shadow-sm"
                : isPending
                ? "text-violet-700"
                : !stepEnabled
                ? "text-slate-600"
                : "text-rose-700"
            }`}>{step.label}</h4>
            <p className={`text-xs leading-snug break-words ${
              stepCompleted 
                ? "text-emerald-500" 
                : stepInProgressVisual
                ? "text-blue-500"
                : isPending
                ? "text-violet-500"
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
              className={cn(
                "shrink-0 mt-0.5 p-1.5 rounded-full ml-2 transition-colors",
                stepCompleted
                  ? "bg-white/70 backdrop-blur-sm border border-emerald-200/80 hover:bg-white shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : stepInProgressVisual
                  ? "bg-white/70 backdrop-blur-sm border border-blue-200/80 hover:bg-white shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                  : isPending
                  ? "bg-violet-100 hover:bg-violet-200"
                  : "bg-rose-100/80 hover:bg-rose-100",
              )}
            >
              <Eye className={`h-4 w-4 ${
                stepCompleted 
                  ? "text-emerald-600" 
                  : isPending 
                  ? "text-violet-600" 
                  : isInProgress
                  ? "text-blue-600"
                  : "text-rose-600"
              }`} />
            </button>
          )}

          <Badge className={cn(
            "text-[9px] uppercase font-black tracking-wider shrink-0 border-0 px-2 py-0.5",
            stepCompleted
              ? verifiedStepBadgeClasses
              : stepInProgressVisual
              ? inProgressStepBadgeClasses
              : isPending
              ? "bg-violet-500 text-white"
              : !stepEnabled
              ? "bg-slate-200 text-slate-400"
              : "bg-rose-100 text-rose-600",
          )}>
            {stepCompleted ? "Verified" : stepInProgressVisual ? "In Progress" : isPending ? "Start" : !stepEnabled ? "Locked" : statusConfig.label}
          </Badge>
        </div>

        {/* Sub-step list intentionally hidden in this card UI */}

        {(isSubmissionDateRequired || stepCompleted || stepInProgressVisual) && (
          <div className={cn(
            "relative px-3 py-2.5 flex items-center justify-between gap-2 border-t",
            stepCompleted
              ? verifiedStepFooterClasses
              : stepInProgressVisual
                ? inProgressStepFooterClasses
                : "border-slate-100 bg-slate-50/50",
          )}>
            <div className="flex items-center gap-2 text-xs">
              {isOfferLetterStep ? (
                <span className="inline-flex flex-col items-start gap-0 px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-600">
                  <span className="text-[10px] text-slate-400">Offer letter received</span>
                  <div className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-semibold" title={offerLetterStatus?.receivedAt ? new Date(offerLetterStatus.receivedAt).toLocaleString() : undefined}>
                      {offerLetterStatus?.receivedAt ? new Date(offerLetterStatus.receivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "No date"}
                    </span>
                  </div>
                </span>
              ) : isSubmissionDateRequired ? (
                <span className={`inline-flex flex-col items-start gap-0 px-2 py-1 rounded-md ${stepCompleted ? 'bg-white/60 backdrop-blur-sm border border-emerald-200/80 text-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.12)]' : stepInProgressVisual ? inProgressDateChipClasses : isPending ? 'bg-violet-50 border border-violet-200 text-violet-700' : offerLetterRejected ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-slate-50 border border-slate-100 text-slate-600'}`}>
                  <span className="text-[10px] text-slate-400">{submittedAtLabel}</span>
                  <div className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-semibold" title={submittedAt ? new Date(submittedAt).toLocaleString() : undefined}>
                      {submittedAt ? new Date(submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : submittedAtEmptyLabel}
                    </span>
                  </div>
                </span>
              ) : null}
            </div>

            {isOfferLetterStep ? (
              <div className="text-xs text-right space-y-1">
                <div className="text-[10px] text-slate-400">Completed at</div>
                <div className={`text-sm font-semibold ${statusConfig.color}`}>{completedAt ? new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : offerLetterStatus?.receivedAt ? new Date(offerLetterStatus.receivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Not completed"}</div>
              </div>
            ) : stepCompleted ? (
              <div className="text-xs text-right">
                <div className="text-[10px] text-slate-400">Completed at</div>
                <div className={`text-sm font-semibold ${statusConfig.color}`}>{completedAt ? new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : (submittedAt ? new Date(submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "—")}</div>
              </div>
            ) : isSubmissionDateRequired ? (
              <div>
                <LockedProcessingActionButton forceDisabled={mutationsLocked}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!mutationsLocked) {
                        onEditSubmitted?.();
                      }
                    }}
                    disabled={mutationsLocked}
                    className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/50 border border-slate-100 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-80"
                    aria-label={isDocumentOriginalReceivedStep ? "Edit document original received date" : "Edit submitted date"}
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Set date</span>
                  </button>
                </LockedProcessingActionButton>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cardShellClass}>
      {stepCompleted && <VerifiedStepGlazeOverlay />}
      {stepInProgressVisual && <InProgressStepGlazeOverlay />}
      <div
        className={cn(
          "relative flex items-start gap-3 p-3 transition-colors group",
          stepCompleted && cn(verifiedStepHeaderClasses, "hover:from-emerald-50/90"),
          stepInProgressVisual && cn(inProgressStepHeaderClasses, "hover:from-blue-50/90"),
          isPending && "bg-violet-50/40 hover:bg-violet-50/60",
          offerLetterRejected && "bg-red-50/50 hover:bg-red-50",
          step.apiStatus === "cancelled" && "bg-rose-50/50 hover:bg-rose-50",
          !stepEnabled && !stepCompleted && "bg-slate-100/30 opacity-90",
          stepEnabled && !stepCompleted && !stepInProgressVisual && !isPending && !offerLetterRejected && step.apiStatus !== "cancelled" && "hover:bg-slate-50",
          stepEnabled ? "cursor-pointer" : "cursor-not-allowed",
        )}
        onClick={() => {
          if (!stepEnabled) return;
          // Only allow an explicit action button for offer letter editing
          if (isOfferLetterStep) return;
          if (onStepClick) {
            onStepClick(step.key);
          }
        }}
      >
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm",
            stepCompleted && verifiedStepIconClasses,
            stepInProgressVisual && inProgressStepIconClasses,
            isPending && "bg-gradient-to-br from-violet-500 to-indigo-600 text-white",
            offerLetterRejected && "bg-red-100 text-red-600",
            !stepEnabled && !stepCompleted && !stepInProgressVisual && "bg-slate-200 text-slate-500",
            stepEnabled && !stepCompleted && !stepInProgressVisual && !isPending && !offerLetterRejected && "bg-slate-100 text-slate-500",
          )}
        >
          {stepCompleted ? (
            <CheckCircle2 className="h-4 w-4 drop-shadow-sm" />
          ) : (
            <div className="relative">
              <StepIcon className="h-4 w-4" />
              <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-white text-[8px] font-black text-indigo-600 flex items-center justify-center leading-none">
                {index + 1}
              </span>
            </div>
          )}
        </div>

        {/* Step Info */}
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-bold text-sm leading-snug break-words",
            stepCompleted
              ? "text-emerald-800 drop-shadow-sm"
              : stepInProgressVisual
              ? "text-blue-800 drop-shadow-sm"
              : isPending
              ? "text-violet-700"
              : offerLetterRejected
              ? "text-red-700"
              : !stepEnabled
              ? "text-slate-600"
              : "text-slate-700"
          )}>
            {step.label}
          </h4>
          <p className={cn(
            "text-xs leading-snug break-words",
            stepCompleted
              ? "text-emerald-500"
              : stepInProgressVisual
              ? "text-blue-500"
              : isPending
              ? "text-violet-500"
              : offerLetterRejected
              ? "text-red-500"
              : !stepEnabled
              ? "text-slate-500"
              : "text-slate-400"
          )}>
            {isOfferLetterStep
              ? getOfferLetterDescription()
              : isVisaStep && step.visaValidAt
              ? `Visa expires ${formatShortDate(step.visaValidAt)}`
              : step.apiStatus === "cancelled"
              ? `Processing cancelled — ${step.notes || "No reason provided"}`
              : step.description}
          </p>
        </div>

        {/* View details button - only show for enabled steps and not hired */}
        {stepEnabled && !isHired && (
          <div className="flex items-center gap-1 shrink-0">
          {canManageStepDocs && step.hasDocuments && onManageStepDocs && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onManageStepDocs(step.key);
              }}
              aria-label={`Manage ${step.label} document rules`}
              className="mt-0.5 p-1.5 rounded-full bg-indigo-100 hover:bg-indigo-200 transition-colors"
            >
              <Settings2 className="h-4 w-4 text-indigo-700" />
            </button>
          )}
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
              "shrink-0 mt-0.5 p-1.5 rounded-full transition-colors",
              stepCompleted
                ? "bg-white/70 backdrop-blur-sm border border-emerald-200/80 hover:bg-white shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                : isPending
                ? "bg-violet-100 hover:bg-violet-200"
                : isInProgress || offerLetterPending
                ? "bg-blue-100 hover:bg-blue-200"
                : offerLetterRejected
                ? "bg-red-100 hover:bg-red-200"
                : "bg-slate-100 hover:bg-slate-200"
            )}
          >
            <Eye className={cn(
              "h-4 w-4",
              stepCompleted
                ? "text-emerald-600"
                : stepInProgressVisual
                ? "text-blue-600"
                : isPending
                ? "text-violet-600"
                : offerLetterRejected
                ? "text-red-600"
                : "text-slate-600"
            )} />
          </button>
          </div>
        )}

        {/* Status Badge */}
        <Badge
          className={cn(
            "text-[9px] uppercase font-black tracking-wider shrink-0 mt-0.5 border-0 px-2 py-0.5",
            stepCompleted
              ? verifiedStepBadgeClasses
              : stepInProgressVisual
              ? inProgressStepBadgeClasses
              : isPending
              ? "bg-violet-500 text-white"
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
          ? "Verified" 
          : stepInProgressVisual
          ? "In Progress"
          : isPending
          ? "Start"
          : !stepEnabled
          ? "Locked"
          : statusConfig.label}
      </Badge>
      </div>

      {(isSubmissionDateRequired || stepCompleted || stepInProgressVisual || showVisaDatesFooter) && (
        <div className={cn(
          "relative px-3 py-2.5 flex items-center justify-between border-t",
          stepCompleted
            ? verifiedStepFooterClasses
            : stepInProgressVisual
              ? inProgressStepFooterClasses
              : "border-slate-100 bg-slate-50/50",
        )}>
          <div className="flex items-center gap-2 text-xs">
            {isOfferLetterStep ? (
              <span className="inline-flex flex-col items-start gap-0 px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-600">
                <span className="text-[10px] text-slate-400">Offer letter received</span>
                <div className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-semibold" title={offerLetterStatus?.receivedAt ? new Date(offerLetterStatus.receivedAt).toLocaleString() : undefined}>
                    {offerLetterStatus?.receivedAt ? new Date(offerLetterStatus.receivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "No date"}
                  </span>
                </div>
              </span>
            ) : isVisaStep ? (
              <span className="inline-flex flex-col items-start gap-0 rounded-md border border-teal-100 bg-teal-50 px-2 py-1 text-teal-800">
                <span className="text-[10px] text-teal-600">Visa issued</span>
                <div className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span
                    className="text-xs font-semibold"
                    title={step.visaIssuedAt ? new Date(step.visaIssuedAt).toLocaleString() : undefined}
                  >
                    {formatShortDate(step.visaIssuedAt)}
                  </span>
                </div>
              </span>
            ) : isSubmissionDateRequired ? (
              <span className={`inline-flex flex-col items-start gap-0 px-2 py-1 rounded-md ${stepCompleted ? 'bg-white/60 backdrop-blur-sm border border-emerald-200/80 text-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.12)]' : stepInProgressVisual ? inProgressDateChipClasses : isPending ? 'bg-violet-50 border border-violet-200 text-violet-700' : offerLetterRejected ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-slate-50 border border-slate-100 text-slate-600'}`}>
                <span className="text-[10px] text-slate-400">{submittedAtLabel}</span>
                <div className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-semibold" title={submittedAt ? new Date(submittedAt).toLocaleString() : undefined}>
                    {submittedAt ? new Date(submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : submittedAtEmptyLabel}
                  </span>
                </div>
              </span>
            ) : null}
          </div>

          {isOfferLetterStep ? (
            offerLetterStatus?.status === 'verified' ? (
              <div className="text-xs text-right space-y-1">
                <div className="text-[10px] text-slate-400">Completed at</div>
                <div className={`text-sm font-semibold ${statusConfig.color}`}>{completedAt ? new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : offerLetterStatus?.receivedAt ? new Date(offerLetterStatus.receivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Not completed"}</div>
              </div>
            ) : null
          ) : isVisaStep ? (
            <div className="text-xs text-right">
              <div className="text-[10px] text-slate-400">Visa expiry</div>
              <div
                className={cn(
                  "text-sm font-semibold",
                  isVisaExpired ? "text-rose-600" : "text-teal-700",
                )}
                title={step.visaValidAt ? new Date(step.visaValidAt).toLocaleString() : undefined}
              >
                {formatShortDate(step.visaValidAt)}
              </div>
            </div>
          ) : stepCompleted ? (
            <div className="text-xs text-right">
              <div className="text-[10px] text-slate-400">Completed at</div>
              <div className={`text-sm font-semibold ${statusConfig.color}`}>{completedAt ? new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : (submittedAt ? new Date(submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "—")}</div>
            </div>
          ) : isSubmissionDateRequired ? (
            <div>
              <LockedProcessingActionButton forceDisabled={mutationsLocked}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!mutationsLocked) {
                      onEditSubmitted?.();
                    }
                  }}
                  disabled={mutationsLocked}
                  className="p-1 rounded-md bg-white/50 border border-slate-100 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-80"
                  aria-label={isDocumentOriginalReceivedStep ? "Edit document original received date" : "Edit submitted date"}
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </LockedProcessingActionButton>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
