import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import React from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isSubmitting?: boolean;
  onConfirm: () => Promise<boolean> | void;
}

export default function ConfirmEmigrationModal({
  isOpen,
  onClose,
  isSubmitting,
  onConfirm,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-slate-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-bold">Confirm Emigration</div>
              <DialogDescription className="text-sm text-slate-500">This will mark the emigration step as completed.</DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="mt-3">
            <div className={`text-xs mt-2 text-slate-400`}>
              Confirming will mark this emigration step as completed.
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}