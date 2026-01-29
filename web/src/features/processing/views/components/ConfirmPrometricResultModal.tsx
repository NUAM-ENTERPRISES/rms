import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XCircle, CheckCircle2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prometricResult: string;
  isSubmitting?: boolean;
  onConfirm: () => Promise<boolean> | void;
  onRequestCancel?: () => void;
}

export default function ConfirmPrometricResultModal({ isOpen, onClose, prometricResult, isSubmitting, onConfirm, onRequestCancel }: Props) {
  const isFailed = prometricResult === "failed";
  const isPassed = prometricResult === "passed";

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-slate-100 flex items-center justify-center">
              {isFailed ? <XCircle className="h-6 w-6 text-rose-600" /> : <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
            </div>
            <div>
              <div className="font-bold">Confirm Prometric result</div>
              <DialogDescription className="text-sm text-slate-500">This action will save the selected Prometric result.</DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {isFailed && (
                <div>
                  <div className="text-sm font-semibold text-rose-700">Prometric result: Failed</div>
                  <p className="text-xs text-rose-600 mt-2">If you confirm, processing for this candidate will stop here and no further steps will be advanced.</p>
                </div>
              )}

              {isPassed && (
                <div>
                  <div className="text-sm font-semibold text-emerald-700">Prometric result: Passed</div>
                  <p className="text-xs text-slate-500 mt-2">The candidate has passed Prometric — processing will continue as normal.</p>
                </div>
              )}

              {!isFailed && !isPassed && (
                <div>
                  <div className="text-sm font-semibold text-slate-700">No result selected</div>
                  <p className="text-xs text-slate-500 mt-2">Please select a Prometric result before saving.</p>
                </div>
              )}
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
              disabled={isSubmitting || !prometricResult}
            >
              {isSubmitting ? 'Saving…' : 'Save Prometric'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
