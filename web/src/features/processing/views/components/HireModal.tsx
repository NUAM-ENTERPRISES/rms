import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useHireCandidateMutation, useGetProcessingStepsQuery } from "@/services/processingApi";
import { ProcessingStepActionButtons } from "../../components/ProcessingStepActionButtons";
import { ProcessingActionLockBanner } from "../../components/ProcessingActionLockBanner";
import { LockedProcessingActionButton } from "../../components/LockedProcessingActionButton";
import { useProcessingActionLock } from "@/features/processing/context/ProcessingActionLockContext";
import { toast } from "sonner";

interface HireModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  candidateName?: string;
  onComplete?: () => void | Promise<void>;
}

export function HireModal({ isOpen, onClose, processingId, candidateName, onComplete }: HireModalProps) {
  const { isLocked } = useProcessingActionLock();
  const [notes, setNotes] = useState<string>("");
  const [hireCandidate, { isLoading }] = useHireCandidateMutation();
  const { data: processingSteps = [], refetch } = useGetProcessingStepsQuery(processingId, {
    skip: !isOpen || !processingId,
  });
  const ticketStep = useMemo(
    () => processingSteps.find((step: { template?: { key?: string } }) => step.template?.key === "ticket"),
    [processingSteps],
  );
  const isStepCancelled = ticketStep?.status === "cancelled";
  const isStepCompleted = ticketStep?.status === "completed";

  const handleConfirm = async () => {
    try {
      await hireCandidate({ processingId, ...(notes ? { notes } : {}) }).unwrap();
      toast.success(`${candidateName ? `${candidateName} ` : "Candidate "}hired successfully`);
      if (onComplete) await onComplete();
      setNotes("");
      onClose();
    } catch (err: any) {
      console.error("Hire candidate failed", err);
      toast.error(err?.data?.message || "Failed to mark candidate as hired");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Hire {candidateName ? candidateName : "candidate"}</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">Confirm hiring this candidate and optionally add notes.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <ProcessingActionLockBanner />

          <div>
            <Label className="text-sm">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any hiring notes (reason, comments) — optional"
              rows={4}
            />
          </div>
          <p className="text-xs text-slate-500">Submitting will call the backend to mark the candidate as hired. Empty notes are allowed.</p>
        </div>

        <DialogFooter className="mt-6 flex flex-wrap gap-2">
          <ProcessingStepActionButtons
            processingStepId={ticketStep?.id}
            show={!isStepCompleted && !isStepCancelled}
            onSubmitted={async () => {
              await refetch();
              if (onComplete) await onComplete();
            }}
          />
          <Button variant="outline" onClick={() => { setNotes(""); onClose(); }} disabled={isLoading}>Cancel</Button>
          <LockedProcessingActionButton forceDisabled={isLocked}>
            <Button onClick={handleConfirm} disabled={isLoading || isLocked} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Hire
            </Button>
          </LockedProcessingActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HireModal;
