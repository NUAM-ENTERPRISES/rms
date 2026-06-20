import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Layers,
  Loader2,
  PauseCircle,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/app/hooks";
import {
  useCreateProcessingStatusChangeRequestMutation,
  useGetProcessingStatusUpdateContextQuery,
} from "@/features/processing/data/processing.endpoints";
import { formatProcessingStepLabel } from "@/features/processing/utils/formatProcessingStepLabel";
import { canDirectApplyProcessingStatusChange } from "@/features/processing/utils/processingStatusChangeRoles";

export type ProcessingStatusUpdateRequestType =
  | "processing_cancel"
  | "processing_hold"
  | "processing_reactivate";

type ProcessingPipelineStatus =
  | "cancelled"
  | "on_hold"
  | "in_progress"
  | "assigned";

const CURRENT_STATUS_META: Record<
  string,
  { label: string; badgeClass: string; headerClass: string }
> = {
  cancelled: {
    label: "Processing Cancelled",
    badgeClass: "border-rose-200 bg-rose-100 text-rose-800",
    headerClass:
      "border-rose-200 bg-gradient-to-br from-rose-50 via-background to-rose-50/40",
  },
  on_hold: {
    label: "Processing On Hold",
    badgeClass: "border-amber-200 bg-amber-100 text-amber-900",
    headerClass:
      "border-amber-200 bg-gradient-to-br from-amber-50 via-background to-orange-50/40",
  },
};

const TARGET_STATUS_LABELS: Record<ProcessingStatusUpdateRequestType, string> = {
  processing_cancel: "Processing Cancelled",
  processing_hold: "Processing On Hold",
  processing_reactivate: "Processing In Progress",
};

const REQUEST_OPTIONS: Record<
  ProcessingStatusUpdateRequestType,
  {
    label: string;
    description: string;
    icon: typeof PauseCircle;
    card: string;
    iconWrap: string;
    selectedRing: string;
    badge: string;
    confirmButton: string;
  }
> = {
  processing_hold: {
    label: "Move to Hold",
    description: "Pause processing at the current step until further review.",
    icon: PauseCircle,
    card: "border-amber-200 bg-amber-50/70 hover:bg-amber-50",
    iconWrap: "bg-amber-100 text-amber-700",
    selectedRing: "ring-2 ring-amber-400 border-amber-300",
    badge: "border-amber-200 bg-amber-100 text-amber-900",
    confirmButton: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  processing_reactivate: {
    label: "Reactivate Processing",
    description: "Resume active processing at the step where work was stopped.",
    icon: RefreshCw,
    card: "border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50",
    iconWrap: "bg-emerald-100 text-emerald-700",
    selectedRing: "ring-2 ring-emerald-400 border-emerald-300",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-900",
    confirmButton: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  processing_cancel: {
    label: "Cancel Processing",
    description: "End processing for this candidate on the current project.",
    icon: XCircle,
    card: "border-rose-200 bg-rose-50/70 hover:bg-rose-50",
    iconWrap: "bg-rose-100 text-rose-700",
    selectedRing: "ring-2 ring-rose-400 border-rose-300",
    badge: "border-rose-200 bg-rose-100 text-rose-900",
    confirmButton: "bg-rose-600 hover:bg-rose-700 text-white",
  },
};

interface UpdateProcessingStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  processingStatus?: ProcessingPipelineStatus | string;
  stepKey?: string | null;
  onSubmitted?: () => void | Promise<void>;
}

type ConfirmStep = "form" | "confirm";

function StatusTransitionPreview({
  currentLabel,
  targetLabel,
  targetBadgeClass,
}: {
  currentLabel: string;
  targetLabel: string;
  targetBadgeClass: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge variant="outline" className="font-medium">
        {currentLabel}
      </Badge>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
      <Badge variant="outline" className={cn("font-semibold", targetBadgeClass)}>
        {targetLabel}
      </Badge>
    </div>
  );
}

export function UpdateProcessingStatusModal({
  isOpen,
  onClose,
  processingId,
  processingStatus: processingStatusProp,
  stepKey: stepKeyProp,
  onSubmitted,
}: UpdateProcessingStatusModalProps) {
  const { user } = useAppSelector((state) => state.auth);
  const isDirectAction = canDirectApplyProcessingStatusChange(user?.roles);

  const [selectedType, setSelectedType] =
    useState<ProcessingStatusUpdateRequestType | null>(null);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>("form");

  const {
    data: contextResponse,
    isLoading: isLoadingContext,
    isError: isContextError,
    error: contextError,
  } = useGetProcessingStatusUpdateContextQuery(processingId, {
    skip: !isOpen || !processingId,
  });

  const contextLoadErrorMessage = useMemo(() => {
    if (!isContextError) return null;
    const err = contextError as {
      status?: number;
      data?: { message?: string | string[] };
    };
    const apiMessage = err?.data?.message;
    if (typeof apiMessage === "string" && apiMessage.trim()) {
      return apiMessage;
    }
    if (Array.isArray(apiMessage) && apiMessage.length > 0) {
      return apiMessage.join(", ");
    }
    if (err?.status === 404) {
      return "Status update options endpoint is unavailable. Please restart the backend and try again.";
    }
    return "Unable to load status update options for this candidate. Please refresh and try again.";
  }, [isContextError, contextError]);

  const context = contextResponse?.data;
  const resolvedProcessingStatus =
    context?.processingStatus ?? processingStatusProp ?? "";
  const resolvedStepKey = context?.stepKey ?? stepKeyProp ?? null;
  const stepLabel = resolvedStepKey
    ? formatProcessingStepLabel(resolvedStepKey)
    : context?.stepLabel ?? null;

  const availableTypes = useMemo(() => {
    const raw = context?.availableRequestTypes ?? [];
    return raw.filter(
      (type): type is ProcessingStatusUpdateRequestType =>
        type in REQUEST_OPTIONS,
    );
  }, [context?.availableRequestTypes]);

  const currentStatusMeta =
    CURRENT_STATUS_META[resolvedProcessingStatus] ?? {
      label: resolvedProcessingStatus
        ? resolvedProcessingStatus.replace(/_/g, " ")
        : "Current status",
      badgeClass: "border-slate-200 bg-slate-100 text-slate-800",
      headerClass:
        "border-slate-200 bg-gradient-to-br from-slate-50 via-background to-slate-50/40",
    };

  const [createRequest, { isLoading: isSubmitting }] =
    useCreateProcessingStatusChangeRequestMutation();

  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
      setReason("");
      setTouched(false);
      setConfirmStep("form");
      return;
    }

    if (availableTypes.length === 1) {
      setSelectedType(availableTypes[0]);
    }
  }, [isOpen, availableTypes]);

  const canContinue =
    !!selectedType &&
    reason.trim().length >= 10 &&
    !!context?.anchorStepId &&
    !isLoadingContext &&
    availableTypes.length > 0;

  const selectedOption = selectedType ? REQUEST_OPTIONS[selectedType] : null;
  const selectedTargetLabel = selectedType
    ? TARGET_STATUS_LABELS[selectedType]
    : null;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedType || !context?.anchorStepId) return;

    try {
      const result = await createRequest({
        processingStepId: context.anchorStepId,
        requestType: selectedType,
        reason: reason.trim(),
      }).unwrap();

      const isPending = (result?.data as { status?: string })?.status === "pending";
      const actionLabel =
        selectedType === "processing_reactivate"
          ? "Reactivation"
          : selectedType === "processing_hold"
            ? "Hold"
            : "Cancellation";

      toast.success(
        isPending
          ? `${actionLabel} request submitted for approval`
          : `${actionLabel} applied successfully`,
      );

      handleClose();
      await onSubmitted?.();
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to submit processing status update request";
      toast.error(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
        <div className={cn("border-b px-6 py-5", currentStatusMeta.headerClass)}>
          <DialogHeader className="space-y-3 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={currentStatusMeta.badgeClass}>
                Current: {currentStatusMeta.label}
              </Badge>
              {stepLabel ? (
                <Badge variant="outline" className="border-slate-200 bg-white/80">
                  Step: {stepLabel}
                </Badge>
              ) : null}
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">
              Update Processing Status
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {isDirectAction
                ? "Select the new processing status. Changes take effect immediately."
                : "Select the new processing status you want to request. Manager or Processing Manager approval is required."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {confirmStep === "form" ? (
          <>
            <div className="px-6 py-5 space-y-5 max-h-[min(60vh,520px)] overflow-y-auto">
              {isLoadingContext ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mb-3" />
                  <p className="text-sm font-medium">Loading status options...</p>
                </div>
              ) : isContextError || availableTypes.length === 0 ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
                  {contextLoadErrorMessage ??
                    "Unable to load status update options for this candidate. Please refresh and try again."}
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
                        <Layers className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Resume point
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {stepLabel
                            ? `Changes apply at ${stepLabel}.`
                            : "The anchor processing step will be determined automatically."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Choose new status type
                    </Label>
                    <div
                      className="grid gap-3"
                      role="radiogroup"
                      aria-label="Processing status update type"
                    >
                      {availableTypes.map((type) => {
                        const option = REQUEST_OPTIONS[type];
                        const Icon = option.icon;
                        const isSelected = selectedType === type;
                        const targetLabel = TARGET_STATUS_LABELS[type];

                        return (
                          <button
                            key={type}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => setSelectedType(type)}
                            className={cn(
                              "w-full rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                              option.card,
                              isSelected ? option.selectedRing : "border-border",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                  option.iconWrap,
                                )}
                              >
                                <Icon className="h-5 w-5" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-foreground">
                                    {option.label}
                                  </p>
                                  {isSelected ? (
                                    <Badge className="bg-violet-600 text-white hover:bg-violet-600">
                                      Selected
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {option.description}
                                </p>
                                <StatusTransitionPreview
                                  currentLabel={currentStatusMeta.label}
                                  targetLabel={targetLabel}
                                  targetBadgeClass={option.badge}
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="processing-status-update-reason">
                      Reason for this status change
                      <span className="text-destructive ml-0.5" aria-hidden="true">
                        *
                      </span>
                      <span className="sr-only"> (required)</span>
                    </Label>
                    <Textarea
                      id="processing-status-update-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      onBlur={() => setTouched(true)}
                      rows={4}
                      required
                      aria-required="true"
                      placeholder="Explain why this status change is needed (minimum 10 characters)"
                      className="resize-none bg-background"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-xs",
                          touched && reason.trim().length < 10
                            ? "text-rose-600"
                            : "text-muted-foreground",
                        )}
                      >
                        {touched && reason.trim().length < 10
                          ? "Reason is required (minimum 10 characters)"
                          : isDirectAction
                            ? "This reason will be recorded in processing history."
                            : "This reason will be visible to approvers."}
                      </p>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {reason.trim().length}/10
                      </span>
                    </div>
                  </div>

                  {!isDirectAction ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 flex gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                      <p>
                        Submitting creates an approval request. Processing actions
                        stay locked until the request is reviewed.
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <DialogFooter className="px-6 py-4 bg-muted/30 border-t gap-2 sm:justify-between">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  isDirectAction ? void handleSubmit() : setConfirmStep("confirm")
                }
                disabled={!canContinue || isSubmitting}
                className={isDirectAction ? selectedOption?.confirmButton : undefined}
              >
                {isDirectAction ? "Apply Change" : "Review & Submit"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isDirectAction ? "Change summary" : "Request summary"}
                </p>
                {selectedOption && selectedTargetLabel ? (
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        selectedOption.iconWrap,
                      )}
                    >
                      <selectedOption.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <p className="font-semibold text-foreground">
                        {selectedOption.label}
                      </p>
                      <StatusTransitionPreview
                        currentLabel={currentStatusMeta.label}
                        targetLabel={selectedTargetLabel}
                        targetBadgeClass={selectedOption.badge}
                      />
                      {stepLabel ? (
                        <p className="text-sm text-muted-foreground">
                          Anchor step:{" "}
                          <span className="font-medium text-foreground">
                            {stepLabel}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Reason
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {reason.trim()}
                </p>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-muted/30 border-t gap-2 sm:justify-between">
              <Button
                variant="outline"
                onClick={() => setConfirmStep("form")}
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={selectedOption?.confirmButton}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {isDirectAction ? "Apply Change" : "Submit Request"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
