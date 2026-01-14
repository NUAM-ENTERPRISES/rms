
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AlertCircle, Send, Loader2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  date?: Date | null;
  isSubmitting?: boolean;
}

export default function ConfirmSubmitDateModal({ isOpen, onClose, onConfirm, date, isSubmitting }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <Send className="h-5 w-5 text-blue-600" />
            Confirm Submission Date
          </DialogTitle>
          <DialogDescription>
            Please confirm the HRD submission date you wish to save for this step.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-700">
            {date ? (
              <div>
                <div className="font-semibold">{format(date, "PPP 'at' p")}</div>
                <div className="text-xs text-slate-500 mt-1">This will be recorded as the HRD submitted time.</div>
              </div>
            ) : (
              <div className="text-rose-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> No date selected
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={onConfirm} disabled={isSubmitting || !date} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} Confirm Date
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
