import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, FileCheck, FileText, Loader2 } from "lucide-react";
import type { PendingVerificationDocument } from "../utils/processingDocumentVerifyAll";

interface VerifyAllProcessingDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: PendingVerificationDocument[];
  onConfirm: (notes: string) => Promise<void>;
  isVerifying: boolean;
}

export default function VerifyAllProcessingDocumentsModal({
  isOpen,
  onClose,
  documents,
  onConfirm,
  isVerifying,
}: VerifyAllProcessingDocumentsModalProps) {
  const [notes, setNotes] = useState("");

  const handleConfirm = async () => {
    await onConfirm(notes);
    setNotes("");
  };

  const handleClose = () => {
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-600" />
            Verify All Documents
          </DialogTitle>
          <DialogDescription>
            Review the uploaded documents below, then confirm to verify them for
            this processing step.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <div className="text-sm font-medium text-emerald-900">
              {documents.length} document{documents.length === 1 ? "" : "s"} ready
              to verify
            </div>
          </div>

          <div className="max-h-56 overflow-auto rounded-lg border divide-y">
            {documents.map((doc, index) => (
              <div
                key={doc.documentId}
                className="flex items-start gap-3 px-3 py-3 bg-white"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-900">
                      {doc.label}
                    </span>
                  </div>
                  {doc.fileName && (
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {doc.fileName}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="verify-all-notes">Notes (Optional)</Label>
            <Textarea
              id="verify-all-notes"
              placeholder="Add verification notes for all selected documents..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-xs text-amber-800">
              Confirming will verify every document listed above for this step.
              This action is recorded and visible to other users.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isVerifying}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleConfirm}
            disabled={isVerifying || documents.length === 0}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              `Confirm Verification (${documents.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
