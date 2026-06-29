import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, FileText } from "lucide-react";
import { useMemo, useState } from "react";
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
      <DialogContent className="sm:max-w-lg bg-emerald-50 border-emerald-300">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
              <CheckCircle2 className="h-7 w-7 text-white relative z-10 drop-shadow-sm" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-700">
                Hire {candidateName ? candidateName : "Candidate"}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 mt-1 leading-relaxed">
                Confirm hiring this candidate and optionally add notes for record-keeping.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <ProcessingActionLockBanner />

          <div className="relative">
            <Label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-emerald-600" />
              Notes (optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add hiring notes, comments, or special instructions..."
              rows={4}
              className="bg-white border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
            />
          </div>
          <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-3">
            <p className="text-xs text-emerald-800 leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Confirming will mark this candidate as hired and finalize their processing workflow.</span>
            </p>
          </div>
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
          <Button 
            variant="outline" 
            onClick={() => { setNotes(""); onClose(); }} 
            disabled={isLoading}
            className="hover:bg-slate-100"
          >
            Cancel
          </Button>
          <LockedProcessingActionButton forceDisabled={isLocked}>
            <Button 
              onClick={handleConfirm} 
              disabled={isLoading || isLocked} 
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirm Hire
            </Button>
          </LockedProcessingActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HireModal;
