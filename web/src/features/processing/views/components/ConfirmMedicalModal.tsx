import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XCircle, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isMedicalPassed: boolean | null;
  mofaNumber?: string;
  notes?: string;
  onNotesChange?: (v: string) => void;
  isSubmitting?: boolean;
  onConfirm: () => Promise<boolean> | void;
}

export default function ConfirmMedicalModal({ isOpen, onClose, isMedicalPassed, mofaNumber, notes = "", onNotesChange, isSubmitting, onConfirm }: Props) {
  const isFailed = isMedicalPassed === false;
  const isPassed = isMedicalPassed === true;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-slate-100 flex items-center justify-center">
              {isFailed ? <XCircle className="h-6 w-6 text-rose-600" /> : <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
            </div>
            <div>
              <div className="font-bold">Confirm Medical result</div>
              <DialogDescription className="text-sm text-slate-500">This will save the medical result and any provided MOFA number.</DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {isFailed && (
                <div>
                  <div className="text-sm font-semibold text-rose-700">Medical result: Failed</div>
                  <p className="text-xs text-rose-600 mt-2">If you confirm, processing for this candidate will be cancelled and no further steps will be advanced.</p>
                </div>
              )}

              {isPassed && (
                <div>
                  <div className="text-sm font-semibold text-emerald-700">Medical result: Passed</div>
                  <p className="text-xs text-slate-500 mt-2">The candidate has passed Medical — processing will continue as normal.</p>
                  {mofaNumber && (
                    <div className="mt-3 text-xs text-slate-500">MOFA number: <span className="font-medium text-slate-700">{mofaNumber}</span></div>
                  )}

                  <div className="mt-3">
                    <label className="text-xs text-slate-600 mb-1 block">Notes (optional)</label>
                    <Textarea value={notes} onChange={(e) => onNotesChange?.(e.target.value)} rows={4} maxLength={1000} />
                    <div className="text-xs text-slate-400 mt-2">Optional — saved to processing history</div>
                  </div>
                </div>
              )}

              {isMedicalPassed === null && (
                <div>
                  <div className="text-sm font-semibold text-slate-700">No result selected</div>
                  <p className="text-xs text-slate-500 mt-2">Please select Passed or Failed before saving the Medical result.</p>
                </div>
              )}

              {/* Notes for failed result */}
              {isFailed && (
                <div className="mt-3">
                  <label className="text-xs text-slate-600 mb-1 block">Notes (required for failed)</label>
                  <Textarea value={notes} onChange={(e) => onNotesChange?.(e.target.value)} rows={4} maxLength={1000} />
                  <div className="text-xs text-rose-600 mt-2">Provide a brief reason for failing; this will be stored as cancellation reason.</div>
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
              disabled={isSubmitting || isMedicalPassed === null || ( (notes?.length ?? 0) > 1000 )}
            >
              {isSubmitting ? 'Saving…' : 'Save Medical'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
