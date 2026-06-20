import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Layers,
  MapPin,
  PauseCircle,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useApproveCandidateProjectStatusChangeRequestMutation,
  useRejectCandidateProjectStatusChangeRequestMutation,
  type PendingStatusChangeRequest,
} from "@/features/candidates/api";
import { formatProcessingStepLabel } from "@/features/processing/utils/formatProcessingStepLabel";
import { getProcessingStatusChangeTransition } from "@/features/processing/utils/processingStatusChangeDisplay";
import { getStatusChangeTargetLabel } from "@/features/candidates/utils/candidateProjectPipelineBlocked";

interface ReviewStatusChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PendingStatusChangeRequest;
  candidateId: string;
  projectId: string;
  candidateProjectMapId?: string;
  projectTitle?: string;
  countryName?: string;
  stepKey?: string;
  currentStatus?: string;
  processingStatus?: string;
  previousStatus?: { name: string; label: string };
  onReviewed?: () => void;
}

type PendingConfirmAction = "approve" | "reject" | null;

function formatRequestDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function MetadataItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/30 px-3 py-2",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function ProcessingStatusTransitionCard({
  fromLabel,
  toLabel,
  actionPhrase,
  stepLabel,
  targetBadgeClass,
  compact = false,
}: {
  fromLabel: string;
  toLabel: string;
  actionPhrase: string;
  stepLabel?: string | null;
  badgeClass: string;
  targetBadgeClass: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Requested status change
            </p>
            <p className="text-sm font-medium text-foreground">{actionPhrase}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-medium">
              {fromLabel}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            <Badge variant="outline" className={cn("font-semibold", targetBadgeClass)}>
              {toLabel}
            </Badge>
            {stepLabel ? (
              <Badge variant="outline" className="text-xs">
                Resume at: {stepLabel}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Requested status change
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{actionPhrase}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-medium">
          {fromLabel}
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        <Badge variant="outline" className={cn("font-semibold", targetBadgeClass)}>
          {toLabel}
        </Badge>
      </div>

      {stepLabel ? (
        <Badge variant="outline" className="text-xs">
          Resume at: {stepLabel}
        </Badge>
      ) : null}
    </div>
  );
}

export function ReviewStatusChangeRequestModal({
  isOpen,
  onClose,
  request,
  candidateId,
  projectId,
  candidateProjectMapId,
  projectTitle,
  countryName,
  stepKey,
  currentStatus,
  processingStatus,
  onReviewed,
}: ReviewStatusChangeRequestModalProps) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [pendingConfirm, setPendingConfirm] =
    useState<PendingConfirmAction>(null);
  const [approveRequest, { isLoading: isApproving }] =
    useApproveCandidateProjectStatusChangeRequestMutation();
  const [rejectRequest, { isLoading: isRejecting }] =
    useRejectCandidateProjectStatusChangeRequestMutation();

  const isProcessingRequest =
    request.requestType === "processing_cancel" ||
    request.requestType === "processing_hold" ||
    request.requestType === "processing_reactivate";
  const isReactivate = request.requestType === "reactivate";
  const processingStepKey = stepKey ?? request.stepKey;
  const resolvedProjectTitle = projectTitle;
  const resolvedCountryName = countryName;
  const isProcessingCancel = request.requestType === "processing_cancel";
  const isProcessingHold = request.requestType === "processing_hold";
  const isProcessingReactivate = request.requestType === "processing_reactivate";
  const resolvedProcessingStatus = processingStatus ?? currentStatus;
  const processingTransition = isProcessingRequest
    ? getProcessingStatusChangeTransition(
        request.requestType,
        resolvedProcessingStatus,
      )
    : null;
  const formattedStepLabel = processingStepKey
    ? formatProcessingStepLabel(processingStepKey)
    : null;

  const statusLabel =
    processingTransition?.reviewTitle ??
    getStatusChangeTargetLabel(request.requestedStatus ?? "");

  const title = isProcessingRequest
    ? `Review ${statusLabel} Request`
    : isReactivate
      ? "Review Reactivation Request"
      : `Review ${statusLabel} Request`;

  const impactMessage = isProcessingRequest && processingTransition
    ? `Approving will change processing from ${processingTransition.fromLabel} to ${processingTransition.toLabel}${
        formattedStepLabel ? ` at ${formattedStepLabel}` : ""
      }.`
    : isProcessingCancel
    ? "Approving will cancel this candidate's processing for the project. All processing steps will be locked until reactivated."
    : isProcessingHold
      ? "Approving will put this candidate's processing on hold. Processing actions will be locked until the hold is lifted."
      : isProcessingReactivate
        ? "Approving will reactivate processing in progress at the step where it was stopped."
        : isReactivate
          ? "Approving will reactivate this candidate for the project."
          : `Approving will change the candidate's status to ${statusLabel}.`;

  const rejectConfirmDescription = isProcessingRequest
    ? "The requester will be notified and processing will continue unchanged."
    : "The requester will be notified and the candidate's current status will remain unchanged.";

  const theme = isProcessingCancel
    ? {
        header: "border-rose-200 bg-gradient-to-br from-rose-50 via-background to-rose-50/40",
        iconWrap: "bg-rose-100 text-rose-700",
        icon: XCircle,
        badge: "border-rose-200 bg-rose-100 text-rose-800",
        impact: "border-rose-200 bg-rose-50/80 text-rose-900",
        reason: "border-rose-100 bg-rose-50/50",
        confirmWrap: "bg-rose-100 text-rose-700",
        approveButton: "bg-rose-600 hover:bg-rose-700",
      }
    : isProcessingHold
      ? {
          header:
            "border-orange-200 bg-gradient-to-br from-orange-50 via-background to-orange-50/40",
          iconWrap: "bg-orange-100 text-orange-700",
          icon: PauseCircle,
          badge: "border-orange-200 bg-orange-100 text-orange-800",
          impact: "border-orange-200 bg-orange-50/80 text-orange-900",
          reason: "border-orange-100 bg-orange-50/50",
          confirmWrap: "bg-orange-100 text-orange-700",
          approveButton: "bg-orange-600 hover:bg-orange-700",
        }
      : isProcessingReactivate
        ? {
            header:
              "border-emerald-200 bg-gradient-to-br from-emerald-50 via-background to-emerald-50/40",
            iconWrap: "bg-emerald-100 text-emerald-700",
            icon: CheckCircle2,
            badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
            impact: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
            reason: "border-emerald-100 bg-emerald-50/50",
            confirmWrap: "bg-emerald-100 text-emerald-700",
            approveButton: "bg-emerald-600 hover:bg-emerald-700",
          }
      : isReactivate
        ? {
            header:
              "border-emerald-200 bg-gradient-to-br from-emerald-50 via-background to-emerald-50/40",
            iconWrap: "bg-emerald-100 text-emerald-700",
            icon: CheckCircle2,
            badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
            impact: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
            reason: "border-border bg-muted/40",
            confirmWrap: "bg-emerald-100 text-emerald-700",
            approveButton: "",
          }
        : {
            header:
              "border-border bg-gradient-to-br from-muted/60 via-background to-muted/30",
            iconWrap: "bg-muted text-muted-foreground",
            icon: AlertCircle,
            badge: "border-border bg-muted text-foreground",
            impact: "border-border bg-muted/50 text-foreground",
            reason: "border-border bg-muted/40",
            confirmWrap: "bg-muted text-muted-foreground",
            approveButton: "",
          };

  const ThemeIcon = theme.icon;
  const isSubmitting = isApproving || isRejecting;
  const isConfirmStep = pendingConfirm !== null;

  const confirmTitle =
    pendingConfirm === "approve"
      ? `Approve ${statusLabel.toLowerCase()} request?`
      : `Reject ${statusLabel.toLowerCase()} request?`;

  const confirmDescription =
    pendingConfirm === "approve" ? impactMessage : rejectConfirmDescription;

  const ConfirmStepIcon =
    pendingConfirm === "approve" ? CheckCircle2 : XCircle;

  const resetAndClose = () => {
    setPendingConfirm(null);
    setReviewNotes("");
    onClose();
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setPendingConfirm(null);
      onClose();
    }
  };

  const handleApprove = async () => {
    try {
      await approveRequest({
        requestId: request.id,
        candidateId,
        projectId,
        candidateProjectMapId,
        processingCandidateId: request.processingCandidateId,
        reviewNotes: reviewNotes.trim() || undefined,
      }).unwrap();

      toast.success("Request approved successfully");
      setReviewNotes("");
      setPendingConfirm(null);
      onClose();
      onReviewed?.();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to approve request");
    }
  };

  const handleReject = async () => {
    try {
      await rejectRequest({
        requestId: request.id,
        candidateId,
        projectId,
        candidateProjectMapId,
        processingCandidateId: request.processingCandidateId,
        reviewNotes: reviewNotes.trim() || undefined,
      }).unwrap();

      toast.success("Request rejected");
      setReviewNotes("");
      setPendingConfirm(null);
      onClose();
      onReviewed?.();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to reject request");
    }
  };

  const handleConfirmAction = () => {
    if (pendingConfirm === "approve") {
      void handleApprove();
      return;
    }
    if (pendingConfirm === "reject") {
      void handleReject();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {isConfirmStep ? (
          <>
            <div className={cn("border-b px-5 py-3", theme.header)}>
              <DialogHeader className="space-y-1 text-left">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      pendingConfirm === "approve"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700",
                    )}
                  >
                    <ConfirmStepIcon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-base font-semibold leading-tight">
                      {confirmTitle}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Please confirm before continuing.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="space-y-3 px-5 py-4">
              {processingTransition ? (
                <ProcessingStatusTransitionCard
                  fromLabel={processingTransition.fromLabel}
                  toLabel={processingTransition.toLabel}
                  actionPhrase={processingTransition.actionPhrase}
                  stepLabel={formattedStepLabel}
                  badgeClass={theme.badge}
                  targetBadgeClass={theme.badge}
                  compact
                />
              ) : null}

              <Alert
                className={cn(
                  "border py-2",
                  pendingConfirm === "approve"
                    ? theme.impact
                    : "border-red-200 bg-red-50/80 text-red-900",
                )}
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm leading-snug">
                  {confirmDescription}
                </AlertDescription>
              </Alert>

              {reviewNotes.trim() ? (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Your review notes</Label>
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                    {reviewNotes.trim()}
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter className="gap-2 border-t bg-muted/20 px-5 py-3 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPendingConfirm(null)}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Go back
              </Button>
              <div className="flex flex-wrap gap-2">
                {pendingConfirm === "approve" ? (
                  <Button
                    type="button"
                    onClick={handleConfirmAction}
                    disabled={isSubmitting}
                    className={cn(theme.approveButton)}
                  >
                    {isApproving ? "Approving..." : "Yes, approve"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleConfirmAction}
                    disabled={isSubmitting}
                  >
                    {isRejecting ? "Rejecting..." : "Yes, reject"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className={cn("border-b px-5 py-3", theme.header)}>
              <DialogHeader className="space-y-1 text-left">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      theme.iconWrap,
                    )}
                  >
                    <ThemeIcon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <DialogTitle className="text-base font-semibold leading-tight">
                        {title}
                      </DialogTitle>
                      <Badge variant="outline" className={cn("text-xs", theme.badge)}>
                        Pending review
                      </Badge>
                    </div>
                    <DialogDescription className="text-xs">
                      Review the details below, then approve or reject.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="space-y-3 px-5 py-4">
              {processingTransition ? (
                <ProcessingStatusTransitionCard
                  fromLabel={processingTransition.fromLabel}
                  toLabel={processingTransition.toLabel}
                  actionPhrase={processingTransition.actionPhrase}
                  stepLabel={formattedStepLabel}
                  badgeClass={theme.badge}
                  targetBadgeClass={theme.badge}
                  compact
                />
              ) : null}

              <div
                className={cn(
                  "grid gap-2",
                  isProcessingRequest
                    ? "sm:grid-cols-2 lg:grid-cols-4"
                    : "sm:grid-cols-2",
                )}
              >
                <MetadataItem
                  icon={User}
                  label="Requested by"
                  value={
                    <span className="block truncate">
                      {request.requester?.name ?? "Unknown"}
                      {request.requester?.email ? (
                        <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                          {request.requester.email}
                        </span>
                      ) : null}
                    </span>
                  }
                  className={isProcessingRequest ? undefined : "sm:col-span-2"}
                />
                <MetadataItem
                  icon={Calendar}
                  label="Requested on"
                  value={formatRequestDate(request.createdAt)}
                />
                {isProcessingRequest ? (
                  <>
                    {resolvedProjectTitle ? (
                      <MetadataItem
                        icon={Briefcase}
                        label="Project"
                        value={resolvedProjectTitle}
                      />
                    ) : null}
                    {resolvedCountryName ? (
                      <MetadataItem
                        icon={MapPin}
                        label="Country"
                        value={resolvedCountryName}
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <MetadataItem
                      icon={AlertCircle}
                      label="Request type"
                      value={isReactivate ? "Reactivation" : "Status change"}
                    />
                    {!isReactivate ? (
                      <MetadataItem
                        icon={Layers}
                        label="Requested status"
                        value={statusLabel}
                      />
                    ) : null}
                  </>
                )}
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="review-reason" className="text-xs font-medium">
                    Reason provided
                  </Label>
                  <div
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm leading-snug text-foreground max-h-20 overflow-y-auto",
                      theme.reason,
                    )}
                    id="review-reason"
                  >
                    {request.reason}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="review-notes" className="text-xs font-medium">
                    Review notes{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Add notes for the requester (optional)..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={2}
                    className="resize-none min-h-0"
                  />
                </div>
              </div>

              {!isProcessingRequest ? (
                <Alert className={cn("border py-2", theme.impact)}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm leading-snug">
                    {impactMessage}
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            <DialogFooter className="gap-2 border-t bg-muted/20 px-5 py-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetAndClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setPendingConfirm("reject")}
                disabled={isSubmitting}
              >
                Reject Request
              </Button>
              <Button
                type="button"
                onClick={() => setPendingConfirm("approve")}
                disabled={isSubmitting}
                className={cn(theme.approveButton)}
              >
                Approve Request
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
