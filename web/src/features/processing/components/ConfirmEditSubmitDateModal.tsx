import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { AlertCircle, Edit2, Loader2 } from "lucide-react";
import { DatePicker } from "@/components/molecules/DatePicker";
import { useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingDate?: string | null;
  initialDate?: string | null; // optional prefill for the 'New date' picker
  onConfirm: (newDate: Date) => Promise<boolean>;
  isSubmitting?: boolean;
}

export default function ConfirmEditSubmitDateModal({ isOpen, onClose, existingDate, initialDate, onConfirm, isSubmitting }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate ? new Date(initialDate) : existingDate ? new Date(existingDate) : undefined);

  useEffect(() => {
    if (isOpen) {
      // Prefer an explicitly provided initial date (for example, when the user already picked a date in a smaller editor),
      // otherwise fall back to the stored existing date.
      setSelectedDate(initialDate ? new Date(initialDate) : existingDate ? new Date(existingDate) : undefined);
    }
  }, [isOpen, existingDate, initialDate]);

  const handleConfirm = async () => {
    if (!selectedDate) return;
    const ok = await onConfirm(selectedDate);
    if (ok) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <Edit2 className="h-5 w-5 text-indigo-600" />
            Edit Submission Date
          </DialogTitle>
          <DialogDescription>
            Change the previously saved HRD submission date for this step.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-3">
          <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-700">
            <div className="font-semibold">Existing:</div>
            {existingDate ? (
              <div className="mt-1">{format(new Date(existingDate), "PPP 'at' p")}</div>
            ) : (
              <div className="text-rose-600 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> No date recorded</div>
            )}
          </div>

          <div>
            <Label className="text-xs text-slate-600 mb-1 block">New date</Label>
            <div className="flex items-center gap-2">
              <DatePicker value={selectedDate} onChange={setSelectedDate} compact />
              <Button size="sm" variant="outline" onClick={() => setSelectedDate(existingDate ? new Date(existingDate) : undefined)}>Reset</Button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || !selectedDate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Confirm Edit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
