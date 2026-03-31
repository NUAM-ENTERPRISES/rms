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

interface ConvertCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  candidateName: string;
  isSubmitting: boolean;
}

export const ConvertCandidateModal: React.FC<ConvertCandidateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  isSubmitting,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert Candidate</DialogTitle>
          <DialogDescription>
            Are you sure you want to mark <strong>{candidateName}</strong> as a converted response?
            This will move the candidate into Converted Responses status.
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
            {isSubmitting ? "Converting..." : "Confirm Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
