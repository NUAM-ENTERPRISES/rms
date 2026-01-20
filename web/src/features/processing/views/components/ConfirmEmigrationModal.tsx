import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XCircle, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import React from "react";

type EmigrationStatus = "PENDING" | "FAILED" | "COMPLETED";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  emigrationStatus: EmigrationStatus | "" | undefined;
  notes?: string;
  onNotesChange?: (v: string) => void;
  isSubmitting?: boolean;
  onConfirm: () => Promise<boolean> | void;
}

export default function ConfirmEmigrationModal({
  isOpen,
  onClose,
  emigrationStatus,
  notes = "",
  onNotesChange,
  isSubmitting,
  onConfirm,
}: Props) {
  const isFailed = emigrationStatus === "FAILED";
  const isCompleted = emigrationStatus === "COMPLETED";

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-slate-100 flex items-center justify-center">
              {isFailed ? <XCircle className="h-6 w-6 text-rose-600" /> : <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
            </div>
            <div>
              <div className="font-bold">{isFailed ? 'Confirm Emigration — Failed' : 'Confirm Emigration'}</div>
              <DialogDescription className="text-sm text-slate-500">{isFailed ? 'Marking Emigration as Failed will cancel the remaining processing steps for this candidate.' : 'This will mark the emigration step as completed.'}</DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {isFailed && (
            <div>
              <div className="text-sm font-semibold text-rose-700">Emigration status: Failed</div>
              <p className="text-xs text-rose-600 mt-2">If you confirm, processing for this candidate will be cancelled and no further steps will be advanced.</p>
            </div>
          )}

          {isCompleted && (
            <div>
              <div className="text-sm font-semibold text-emerald-700">Emigration status: Completed</div>
              <p className="text-xs text-slate-500 mt-2">The candidate's emigration step will be marked completed and processing will continue.</p>
            </div>
          )}

          {!emigrationStatus && (
            <div>
              <div className="text-sm font-semibold text-slate-700">No status selected</div>
              <p className="text-xs text-slate-500 mt-2">Please select a status before confirming.</p>
            </div>
          )}

          <div className="mt-3">
            <label className="text-xs text-slate-600 mb-1 block">Notes {isFailed ? '(required for failed)' : '(optional)'}</label>
            <Textarea value={notes} onChange={(e) => onNotesChange?.(e.target.value)} rows={4} maxLength={1000} />
            <div className={`text-xs mt-2 ${isFailed ? 'text-rose-600' : 'text-slate-400'}`}>
              {isFailed ? 'Provide a brief reason for failing; this will be stored as the cancellation reason.' : 'Optional — saved to processing history.'}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
            <Button
              size="sm"
              onClick={async () => {
                const ok = await onConfirm();
                if (ok === undefined || ok) onClose();
              }}
              disabled={isSubmitting || !emigrationStatus || (isFailed && (notes?.trim().length ?? 0) === 0) || ((notes?.length ?? 0) > 1000)}
            >
              {isSubmitting ? 'Saving…' : (isFailed ? 'Confirm & Cancel' : 'Confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
