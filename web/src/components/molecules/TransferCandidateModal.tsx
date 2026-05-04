import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightLeft, User, FileText, Loader2 } from "lucide-react";

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Header gradient banner */}
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-6 pt-6 pb-8">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <ArrowRightLeft className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-white text-lg font-semibold">Reassign Candidate</DialogTitle>
            </div>
            <p className="text-indigo-100 text-sm mt-1 ml-0.5">
              Transfer candidate to a recruiter's pipeline
            </p>
          </DialogHeader>
        </div>

        {/* Info card pulled up over the gradient */}
        <div className="px-6 -mt-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center">
                <User className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Candidate</p>
                <p className="text-sm font-semibold text-slate-800">{candidateName}</p>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center">
                <ArrowRightLeft className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Current Recruiter</p>
                <p className="text-sm font-semibold text-slate-800">{currentRecruiterName || 'Unassigned'}</p>
                <p className="text-xs text-slate-500 mt-0.5">Candidate will move to recruiter's untouched list and a notification will be sent.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes section */}
        <div className="px-6 pt-4 pb-2 space-y-2">
          <Label htmlFor="remarks" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            Remarks
            <span className="text-slate-400 font-normal">(Optional)</span>
          </Label>
          <Textarea
            id="remarks"
            placeholder="Add any internal notes or handover details for the recruiter..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[90px] resize-none text-sm rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20"
          />
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 flex gap-2">
          <DialogClose asChild>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={async () => { await onConfirm(notes); }}
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-200 font-semibold"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transferring...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Confirm Reassign
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
