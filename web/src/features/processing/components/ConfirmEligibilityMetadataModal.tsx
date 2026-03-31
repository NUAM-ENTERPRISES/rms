import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileCheck, Loader2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  eligibilityIssuedDate?: Date | undefined;
  eligibilityValidDate?: Date | undefined;
  eligibilityDuration?: string;
  isSubmitting?: boolean;
}

export default function ConfirmEligibilityMetadataModal({
  isOpen,
  onClose,
  onConfirm,
  eligibilityIssuedDate,
  eligibilityValidDate,
  eligibilityDuration,
  isSubmitting,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <FileCheck className="h-5 w-5 text-teal-600" />
            Confirm Eligibility Metadata
          </DialogTitle>
          <DialogDescription>
            Confirm changes for eligibility metadata before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <div className="text-sm text-slate-700 space-y-2">
            <div>
              <span className="font-semibold">Issued Date:</span>{' '}
              {eligibilityIssuedDate ? format(eligibilityIssuedDate, "PPP") : 'Not set'}
            </div>
            <div>
              <span className="font-semibold">Valid Till:</span>{' '}
              {eligibilityValidDate ? format(eligibilityValidDate, "PPP") : 'Not set'}
            </div>
            <div>
              <span className="font-semibold">Duration:</span>{' '}
              {eligibilityDuration || 'Not set'}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileCheck className="h-4 w-4 mr-2" />}
            Save Eligibility Info
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
