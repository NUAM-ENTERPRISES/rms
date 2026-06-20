import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
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
        "rounded-lg border border-border bg-muted/30 px-3 py-2.5",
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
    request.requestType === "processing_hold";
  const isReactivate = request.requestType === "reactivate";
  const processingStepKey = stepKey ?? request.stepKey;
  const resolvedProjectTitle = projectTitle;
  const resolvedCountryName = countryName;
  const isProcessingCancel = request.requestType === "processing_cancel";
  const isProcessingHold = request.requestType === "processing_hold";

  const statusLabel = isProcessingCancel
    ? "Processing Cancellation"
    : isProcessingHold
      ? "Processing Hold"
      : getStatusChangeTargetLabel(request.requestedStatus ?? "");

  const title = isProcessingRequest
    ? `Review ${statusLabel} Request`
    : isReactivate
      ? "Review Reactivation Request"
      : `Review ${statusLabel} Request`;

  const impactMessage = isProcessingCancel
    ? "Approving will cancel this candidate's processing for the project. All processing steps will be locked until reactivated."
    : isProcessingHold
      ? "Approving will put this candidate's processing on hold. Processing actions will be locked until the hold is lifted."
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        {isConfirmStep ? (
          <>
            <div className={cn("border-b px-6 py-5", theme.header)}>
              <DialogHeader className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                      pendingConfirm === "approve"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700",
                    )}
                  >
                    <ConfirmStepIcon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <DialogTitle className="text-lg font-semibold leading-tight">
                      {confirmTitle}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      Please confirm before continuing. This action cannot be
                      undone.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="space-y-4 px-6 py-5">
              <Alert
                className={cn(
                  "border",
                  pendingConfirm === "approve"
                    ? theme.impact
                    : "border-red-200 bg-red-50/80 text-red-900",
                )}
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {confirmDescription}
                </AlertDescription>
              </Alert>

              {reviewNotes.trim() ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Your review notes</Label>
                  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
                    {reviewNotes.trim()}
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter className="gap-2 border-t bg-muted/20 px-6 py-4 sm:justify-between">
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
            <div className={cn("border-b px-6 py-5", theme.header)}>
              <DialogHeader className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                      theme.iconWrap,
                    )}
                  >
                    <ThemeIcon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <DialogTitle className="text-lg font-semibold leading-tight">
                        {title}
                      </DialogTitle>
                      <Badge variant="outline" className={theme.badge}>
                        Pending review
                      </Badge>
                    </div>
                    <DialogDescription className="text-sm">
                      Review the request details below, then approve or reject.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-2 sm:grid-cols-2">
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
                  className="sm:col-span-2"
                />
                <MetadataItem
                  icon={Calendar}
                  label="Requested on"
                  value={formatRequestDate(request.createdAt)}
                />
                {isProcessingRequest ? (
                  <>
                    <MetadataItem
                      icon={Layers}
                      label="Processing step"
                      value={formatProcessingStepLabel(processingStepKey)}
                    />
                    {resolvedProjectTitle ? (
                      <MetadataItem
                        icon={Briefcase}
                        label="Project"
                        value={resolvedProjectTitle}
                        className="sm:col-span-2"
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

              <div className="space-y-2">
                <Label htmlFor="review-reason" className="text-sm font-medium">
                  Reason provided
                </Label>
                <div
                  className={cn(
                    "rounded-lg border px-4 py-3 text-sm leading-relaxed text-foreground",
                    theme.reason,
                  )}
                  id="review-reason"
                >
                  {request.reason}
                </div>
              </div>

              <Alert className={cn("border", theme.impact)}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {impactMessage}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="review-notes" className="text-sm font-medium">
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
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 border-t bg-muted/20 px-6 py-4 sm:justify-end">
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
