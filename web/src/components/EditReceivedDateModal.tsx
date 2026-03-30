import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/molecules/DatePicker";
import { format } from "date-fns";
import { AlertCircle, Loader2, Edit3 } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documentLabel?: string;
  currentDate?: string | null;
  onConfirm: (date: Date) => Promise<boolean>;
  isSaving?: boolean;
}

export function EditReceivedDateModal({
  isOpen,
  onClose,
  documentLabel,
  currentDate,
  onConfirm,
  isSaving,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(currentDate ? new Date(currentDate) : undefined);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(currentDate ? new Date(currentDate) : undefined);
    }
  }, [isOpen, currentDate]);

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
            <Edit3 className="h-5 w-5 text-indigo-600" />
            Update Received Date
          </DialogTitle>
          <DialogDescription>
            {documentLabel ? `Document: ${documentLabel}` : 'Update document received date.'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-3">
          <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-700">
            <div className="font-semibold">Existing received date:</div>
            {currentDate ? (
              <div className="mt-1">{format(new Date(currentDate), "PPP 'at' p")}</div>
            ) : (
              <div className="text-rose-600 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Not set</div>
            )}
          </div>

          <div>
            <Label className="text-xs text-slate-600 mb-1 block">New received date</Label>
            <DatePicker value={selectedDate} onChange={setSelectedDate} compact />
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isSaving || !selectedDate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
