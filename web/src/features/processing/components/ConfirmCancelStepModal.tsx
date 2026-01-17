import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isCancelling?: boolean;
}

export default function ConfirmCancelStepModal({ isOpen, onClose, onConfirm, isCancelling }: Props) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const canConfirm = reason.trim().length > 0 && !isCancelling;

  const handleConfirm = async () => {
    setTouched(true);
    if (!canConfirm) return;
    await onConfirm(reason.trim());
    setReason("");
    setTouched(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <XCircle className="h-5 w-5 text-rose-600" />
            Cancel Step
          </DialogTitle>
          <DialogDescription>
            Provide a reason for cancelling this processing step. This reason will be recorded and visible in the step history.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-700">
            <div className="mb-2">
              <label className="text-sm font-medium text-slate-700">Reason</label>
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              onBlur={() => setTouched(true)}
              placeholder="Explain why the step is being cancelled (required)"
            />
            {touched && reason.trim().length === 0 && (
              <div className="text-rose-600 text-xs mt-2">Cancel reason is required</div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isCancelling}>Close</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm} className="bg-rose-600 hover:bg-rose-700 text-white">
            {isCancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />} Cancel Step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
