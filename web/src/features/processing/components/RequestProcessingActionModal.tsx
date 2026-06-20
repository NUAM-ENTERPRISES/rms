import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, PauseCircle, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";

export type ProcessingActionType = "cancel" | "hold";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  actionType: ProcessingActionType;
  onConfirm: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
  isDirectAction?: boolean;
}

export default function RequestProcessingActionModal({
  isOpen,
  onClose,
  actionType,
  onConfirm,
  isSubmitting,
  isDirectAction,
}: Props) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const isCancel = actionType === "cancel";
  const canConfirm = reason.trim().length >= 10 && !isSubmitting;

  const handleConfirm = async () => {
    setTouched(true);
    if (!canConfirm) return;
    await onConfirm(reason.trim());
    setReason("");
    setTouched(false);
  };

  const title = isDirectAction
    ? isCancel
      ? "Cancel Processing"
      : "Hold Processing"
    : isCancel
      ? "Request Processing Cancellation"
      : "Request Processing Hold";

  const description = isDirectAction
    ? isCancel
      ? "Provide a reason for cancelling this processing. This will take effect immediately."
      : "Provide a reason for putting this processing on hold. This will take effect immediately."
    : isCancel
      ? "Submit a cancellation request for manager approval. A reason is required."
      : "Submit a hold request for manager approval. A reason is required.";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4">
          <DialogTitle className="flex items-center gap-3 text-lg">
            {isCancel ? (
              <XCircle className="h-5 w-5 text-rose-600" />
            ) : (
              <PauseCircle className="h-5 w-5 text-orange-600" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-700">
            <label className="text-sm font-medium text-slate-700">Reason</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              onBlur={() => setTouched(true)}
              placeholder="Explain why (minimum 10 characters, required)"
              className="mt-2"
            />
            {touched && reason.trim().length < 10 && (
              <div className="text-rose-600 text-xs mt-2">
                Reason is required (minimum 10 characters)
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={
              isCancel
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-orange-600 hover:bg-orange-700 text-white"
            }
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            {isDirectAction
              ? isCancel
                ? "Cancel Processing"
                : "Hold Processing"
              : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
