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

type Outcome = "completed" | "passed" | "failed";

const statusMeta: Record<Outcome, { label: string; note?: string; badgeClass: string; accentClass: string; iconColor: string }> = {
  completed: {
    label: "Interview Completed",
    note: "Mark interview as completed (no pass/fail)",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    accentClass: "accent-blue-600",
    iconColor: "text-blue-600",
  },
  passed: {
    label: "Interview Passed",
    note: "Candidate passed the interview",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    accentClass: "accent-emerald-500",
    iconColor: "text-emerald-600",
  },
  failed: {
    label: "Interview Failed",
    note: "Candidate did not pass the interview",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    accentClass: "accent-red-500",
    iconColor: "text-red-600",
  },
};

const options: { value: Outcome; label: string; note?: string }[] = [
  { value: "completed", label: statusMeta.completed.label, note: statusMeta.completed.note },
  { value: "passed", label: statusMeta.passed.label, note: statusMeta.passed.note },
  { value: "failed", label: statusMeta.failed.label, note: statusMeta.failed.note },
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
    if (!isOpen || !interview || interview.isBulk) return;
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
          {interview?.isBulk ? (
            <div className="mb-4 text-sm text-slate-600 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
              <div className="font-semibold text-indigo-700 dark:text-indigo-400">Bulk Interview Review</div>
              <div className="text-xs text-indigo-600 dark:text-indigo-300">Applying changes to {interview.count} selected interviews</div>
            </div>
          ) : interview && (
            <div className="mb-4 text-sm text-slate-600">
              <div className="font-medium">{interview.candidateProjectMap?.candidate ? `${interview.candidateProjectMap.candidate.firstName} ${interview.candidateProjectMap.candidate.lastName}` : 'Unknown Candidate'}</div>
              <div className="text-xs text-muted-foreground">{interview.candidateProjectMap?.project?.title || 'Unknown Project'}</div>
            </div>
          )}

          <div className="space-y-2">
            {options.map((opt) => {
              const meta = statusMeta[opt.value];
              const selected = status === opt.value;
              return (
                <label
                  key={String(opt.value)}
                  className={`flex items-center gap-3 p-2 rounded border cursor-pointer ${selected ? 'ring-2 ring-offset-1' : 'hover:bg-accent/50'}`}
                >
                  <input
                    type="radio"
                    name="review-status"
                    value={String(opt.value)}
                    checked={status === opt.value}
                    onChange={() => setStatus(opt.value)}
                    className={meta.accentClass}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{opt.label}</div>
                    {opt.note && <div className="text-xs text-muted-foreground">{opt.note}</div>}
                  </div>
                  <Badge className={`text-xs capitalize ${meta.badgeClass}`}>{String(opt.value)}</Badge>
                </label>
              );
            })}
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
