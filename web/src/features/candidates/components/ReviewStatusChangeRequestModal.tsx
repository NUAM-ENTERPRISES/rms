import { useState } from "react";
import { X, CheckCircle2, XCircle, PauseCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui";
import { toast } from "sonner";
import {
  useApproveCandidateProjectStatusChangeRequestMutation,
  useRejectCandidateProjectStatusChangeRequestMutation,
  type PendingStatusChangeRequest,
} from "@/features/candidates/api";
import { getStatusChangeTargetLabel } from "@/features/candidates/utils/candidateProjectPipelineBlocked";

interface ReviewStatusChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PendingStatusChangeRequest;
  candidateId: string;
  projectId: string;
  candidateProjectMapId?: string;
  currentStatus?: string;
  previousStatus?: { name: string; label: string };
  onReviewed?: () => void;
}

export function ReviewStatusChangeRequestModal({
  isOpen,
  onClose,
  request,
  candidateId,
  projectId,
  candidateProjectMapId,
  currentStatus,
  previousStatus,
  onReviewed,
}: ReviewStatusChangeRequestModalProps) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [approveRequest, { isLoading: isApproving }] =
    useApproveCandidateProjectStatusChangeRequestMutation();
  const [rejectRequest, { isLoading: isRejecting }] =
    useRejectCandidateProjectStatusChangeRequestMutation();

  const statusLabel = request.requestedStatus 
    ? getStatusChangeTargetLabel(request.requestedStatus)
    : previousStatus?.label || "Previous Status";
  const isBusy = isApproving || isRejecting;

  const getRequestDescription = () => {
    if (request.requestType === "reactivate") {
      return `wants to reactivate this candidate back to ${previousStatus?.label || "their previous status"}`;
    }
    // Block type
    if (currentStatus && ["withdrawn", "on_hold"].includes(currentStatus.toLowerCase())) {
      return `wants to change status from ${currentStatus} to ${request.requestedStatus}`;
    }
    return `wants to set status to ${request.requestedStatus}`;
  };

  const getRequestIcon = () => {
    if (request.requestType === "reactivate") {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (request.requestedStatus === "withdrawn") {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
    return <PauseCircle className="h-5 w-5 text-orange-600" />;
  };

  const formattedDate = new Date(request.createdAt).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleApprove = async () => {
    try {
      await approveRequest({
        requestId: request.id,
        candidateId,
        projectId,
        candidateProjectMapId,
        reviewNotes: reviewNotes.trim() || undefined,
      }).unwrap();
      
      const successMessage = request.requestType === "reactivate"
        ? "Reactivation request approved."
        : `${statusLabel} request approved.`;
      toast.success(successMessage);
      onReviewed?.();
      onClose();
      setReviewNotes("");
    } catch {
      toast.error("Failed to approve the request. Please try again.");
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
      
      const successMessage = request.requestType === "reactivate"
        ? "Reactivation request rejected."
        : `${statusLabel} request rejected.`;
      toast.success(successMessage);
      onReviewed?.();
      onClose();
      setReviewNotes("");
    } catch {
      toast.error("Failed to reject the request. Please try again.");
    }
  };

  const handleClose = () => {
    if (!isBusy) {
      onClose();
      setReviewNotes("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {getRequestIcon()}
              {request.requestType === "reactivate" 
                ? "Reactivation Request" 
                : `Review ${statusLabel} Request`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isBusy}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            <strong>{request.requester?.name ?? "Recruiter"}</strong>{" "}
            {getRequestDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {request.requestType === "reactivate" && previousStatus && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will restore the candidate to: <strong>{previousStatus.label}</strong>
              </AlertDescription>
            </Alert>
          )}

          {request.requestType === "block" && request.requestedStatus && (
            <Alert
              variant={request.requestedStatus === "withdrawn" ? "destructive" : "default"}
              className={request.requestedStatus === "withdrawn" ? "" : "border-orange-300 bg-orange-50"}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will change the status to <strong>{statusLabel}</strong> and block pipeline progression.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                Request Type:
              </span>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-900">
                {request.requestType === "reactivate" ? "Reactivation" : "Status Change"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Requested By:</span>
              <span className="text-slate-900">
                {request.requester?.name ?? "Unknown"}
                {request.requester?.email && (
                  <span className="ml-1.5 text-xs text-slate-500">
                    ({request.requester.email})
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Submitted On:</span>
              <span className="text-slate-900">{formattedDate}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-900">
              Reason
            </Label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {request.reason}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-notes" className="text-sm font-semibold">
              Review Notes <span className="text-slate-500">(optional)</span>
            </Label>
            <Textarea
              id="review-notes"
              rows={4}
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder="Add notes for the recruiter (optional)..."
              disabled={isBusy}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t pt-4">
          <Button
            type="button"
            onClick={handleApprove}
            disabled={isBusy}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {isApproving ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Approving...
              </>
            ) : (
              "Approve Request"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReject}
            disabled={isBusy}
            className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
          >
            {isRejecting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Rejecting...
              </>
            ) : (
              "Reject Request"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isBusy}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
