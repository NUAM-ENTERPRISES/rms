import { useState } from "react";
import { X } from "lucide-react";
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
  onReviewed?: () => void;
}

export function ReviewStatusChangeRequestModal({
  isOpen,
  onClose,
  request,
  candidateId,
  projectId,
  candidateProjectMapId,
  onReviewed,
}: ReviewStatusChangeRequestModalProps) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [approveRequest, { isLoading: isApproving }] =
    useApproveCandidateProjectStatusChangeRequestMutation();
  const [rejectRequest, { isLoading: isRejecting }] =
    useRejectCandidateProjectStatusChangeRequestMutation();

  const statusLabel = getStatusChangeTargetLabel(request.requestedStatus);
  const isBusy = isApproving || isRejecting;

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
      toast.success(`${statusLabel} request approved.`);
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
      toast.success(`${statusLabel} request rejected.`);
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
            <span>Review {statusLabel} Request</span>
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
            Review and approve or reject this status change request from{" "}
            {request.requester?.name ?? "recruiter"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                Requested Status:
              </span>
              <span className="rounded-md bg-amber-100 px-2.5 py-1 font-semibold text-amber-900">
                {statusLabel}
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
              Recruiter Remarks
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
