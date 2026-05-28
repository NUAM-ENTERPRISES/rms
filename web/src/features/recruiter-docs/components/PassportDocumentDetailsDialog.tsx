import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface PassportDocumentDetailsDialogProps {
  isOpen: boolean;
  documentId: string;
  initialDocumentNumber?: string | null;
  initialExpiryDate?: string | null;
  onClose: () => void;
  onSave: (values: { documentNumber: string; expiryDate: string }) => Promise<void>;
  isSaving?: boolean;
}

function formatExpiryForInput(value?: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function PassportDocumentDetailsDialog({
  isOpen,
  documentId,
  initialDocumentNumber,
  initialExpiryDate,
  onClose,
  onSave,
  isSaving = false,
}: PassportDocumentDetailsDialogProps) {
  const [documentNumber, setDocumentNumber] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) {
      setDocumentNumber("");
      setExpiryDate("");
      return;
    }
    setDocumentNumber(initialDocumentNumber?.trim() || "");
    setExpiryDate(formatExpiryForInput(initialExpiryDate));
  }, [isOpen, documentId, initialDocumentNumber, initialExpiryDate]);

  const handleSave = async () => {
    if (!documentNumber.trim()) {
      toast.error("Passport number is required");
      return;
    }
    if (!expiryDate) {
      toast.error("Passport expiry date is required");
      return;
    }
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(expiry.getTime()) || expiry < today) {
      toast.error("Passport expiry date must be in the future");
      return;
    }

    try {
      await onSave({ documentNumber: documentNumber.trim(), expiryDate });
      onClose();
    } catch {
      toast.error("Failed to update passport details");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Passport Details</DialogTitle>
          <DialogDescription>
            Update the passport number and expiry without re-uploading the file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Passport Number *</Label>
            <Input
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="e.g., A1234567"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Passport Expiry Date *</Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
