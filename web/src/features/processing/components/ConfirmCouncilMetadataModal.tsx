import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileCheck, Loader2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  councilIssuedDate?: Date | undefined;
  councilValidDate?: Date | undefined;
  isSubmitting?: boolean;
}

export default function ConfirmCouncilMetadataModal({
  isOpen,
  onClose,
  onConfirm,
  councilIssuedDate,
  councilValidDate,
  isSubmitting,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <FileCheck className="h-5 w-5 text-teal-600" />
            Confirm Council Metadata
          </DialogTitle>
          <DialogDescription>
            Confirm changes for council metadata before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <div className="text-sm text-slate-700 space-y-2">
            <div>
              <span className="font-semibold">Issued Date:</span>{' '}
              {councilIssuedDate ? format(councilIssuedDate, "PPP") : 'Not set'}
            </div>
            <div>
              <span className="font-semibold">Valid Till:</span>{' '}
              {councilValidDate ? format(councilValidDate, "PPP") : 'Not set'}
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
            Save Council Info
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
