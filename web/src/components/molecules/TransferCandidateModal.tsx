import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TransferCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
  candidateName: string;
  currentRecruiterName: string;
  isSubmitting: boolean;
}

export const TransferCandidateModal: React.FC<TransferCandidateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  currentRecruiterName,
  isSubmitting,
}) => {
  const [notes, setNotes] = useState("");

  const handleClose = () => {
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Candidate</DialogTitle>
          <DialogDescription>
            Candidate <strong>{candidateName}</strong> is currently assigned to <strong>{currentRecruiterName || 'N/A'}</strong>.
            Recruiter dashboard candidate will be under untouched list also send notification to recruiter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-medium">Remarks (Optional)</Label>
            <Textarea
              id="remarks"
              placeholder="Add any internal notes or remarks for the recruiter..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={async () => {
              await onConfirm(notes);
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Transferring..." : "Confirm Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
