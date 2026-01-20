import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import React, { useState } from "react";
import { useHireCandidateMutation } from "@/services/processingApi";
import { toast } from "sonner";

interface HireModalProps {
  isOpen: boolean;
  onClose: () => void;
  processingId: string;
  candidateName?: string;
  onComplete?: () => void | Promise<void>;
}

export function HireModal({ isOpen, onClose, processingId, candidateName, onComplete }: HireModalProps) {
  const [notes, setNotes] = useState<string>("");
  const [hireCandidate, { isLoading }] = useHireCandidateMutation();

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

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => { setNotes(""); onClose(); }} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm Hire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HireModal;
