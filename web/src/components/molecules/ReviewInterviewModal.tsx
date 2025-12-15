import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

export interface ReviewInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The interview object (optional) used for display */
  interview?: any;
  /** Called when user confirms a new status. Should return a promise that resolves on success and rejects on failure. */
  onSubmit: (payload: { interviewStatus: "passed" | "failed" | "completed"; subStatus?: string; reason?: string }) => Promise<any>;
}

const options: { value: ReviewInterviewModalProps["onSubmit"] extends (s: infer S) => any ? S : string; label: string; note?: string }[] = [
  { value: "passed" as any, label: "Interview Passed", note: "Candidate passed the interview" },
  { value: "failed" as any, label: "Interview Failed", note: "Candidate did not pass the interview" },
  { value: "completed" as any, label: "Interview Completed", note: "Mark interview as completed (no pass/fail)" },
];

export default function ReviewInterviewModal({ isOpen, onClose, interview, onSubmit }: ReviewInterviewModalProps) {
  const [status, setStatus] = useState<"passed" | "failed" | "completed" | null>(null);
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset selection when modal opens/closes
    if (!isOpen) {
      setStatus(null);
      setReason("");
      setIsSubmitting(false);
    }
  }, [isOpen]);


  // Try to initialize the outcome selection from interview data when opening
  useEffect(() => {
    if (!isOpen || !interview) return;
    const outcome = (interview.outcome || (interview as any).status) as string | undefined;
    if (!outcome) return;
    if (outcome === "passed" || outcome === "failed" || outcome === "completed") {
      setStatus(outcome as any);
    }
  }, [isOpen, interview]);

  // subStatus will be derived automatically in handleConfirm based on outcome

  const handleConfirm = async () => {
    if (!status) return;
    setIsSubmitting(true);
    try {
      const mappedSubStatus = status === "passed" ? "interview_passed" : status === "failed" ? "interview_failed" : "interview_completed";
      await onSubmit({ interviewStatus: status, subStatus: mappedSubStatus, reason: reason || undefined });
      // success -> close handled here
      onClose();
    } catch (err) {
      // parent should show toasts, but keep the modal open for retry
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-slate-900">Review Interview</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {interview && (
            <div className="mb-4 text-sm text-slate-600">
              <div className="font-medium">{interview.candidateProjectMap?.candidate ? `${interview.candidateProjectMap.candidate.firstName} ${interview.candidateProjectMap.candidate.lastName}` : 'Unknown Candidate'}</div>
              <div className="text-xs text-muted-foreground">{interview.candidateProjectMap?.project?.title || 'Unknown Project'}</div>
            </div>
          )}

          <div className="space-y-2">
            {options.map((opt) => (
              <label key={String(opt.value)} className="flex items-center gap-3 p-2 rounded border hover:bg-accent/50 cursor-pointer">
                <input
                  type="radio"
                  name="review-status"
                  value={String(opt.value)}
                  checked={status === (opt.value as any)}
                  onChange={() => setStatus(opt.value as any)}
                  className="accent-primary"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{opt.label}</div>
                  {opt.note && <div className="text-xs text-muted-foreground">{opt.note}</div>}
                </div>
                <Badge className="text-xs capitalize">{String(opt.value)}</Badge>
              </label>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Add a note or reason for the status change" />
            </div>

            <div className="text-xs text-muted-foreground">
              <em>Sub-status will be set automatically based on chosen outcome (passed → interview_passed, failed → interview_failed, completed → interview_completed).</em>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!status || isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
