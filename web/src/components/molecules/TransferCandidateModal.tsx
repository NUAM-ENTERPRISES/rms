import React from "react";
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

interface TransferCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Candidate</DialogTitle>
          <DialogDescription>
            Candidate <strong>{candidateName}</strong> is currently assigned to <strong>{currentRecruiterName || 'N/A'}</strong>.
            Recruiter dashboard candidate will be under untouched list also send notification to recruiter.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={async () => {
              await onConfirm();
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
