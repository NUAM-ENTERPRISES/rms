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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, FileCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDocumentTypeConfig } from "@/constants/document-types";
import type { OriginalDocumentCollection } from "../types";

interface CompleteCollectionModalProps {
  collection: OriginalDocumentCollection;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function CompleteCollectionModal({
  collection,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: CompleteCollectionModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Get all received documents across all events
  const receivedDocuments = new Map<string, boolean>();
  collection.events.forEach((event) => {
    event.items.forEach((item) => {
      if (item.isReceived) {
        receivedDocuments.set(item.docType, true);
      }
    });
  });

  const receivedDocsList = Array.from(receivedDocuments.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  const candidateName = `${collection.candidate.firstName || ""} ${collection.candidate.lastName || ""}`.trim();

  const handleConfirm = async () => {
    try {
      await onConfirm();
      setIsConfirmed(false);
      onClose();
    } catch (error) {
      // Don't close modal on error - let user try again
      console.error("Failed to complete collection:", error);
    }
  };

  const handleClose = () => {
    setIsConfirmed(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Complete Collection
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Please verify all details before completing
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Candidate Info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-semibold text-blue-900">Candidate</p>
            </div>
            <p className="text-base font-bold text-blue-800">{candidateName}</p>
            {collection.candidate.candidateCode && (
              <p className="text-xs font-mono text-blue-600 mt-1">
                {collection.candidate.candidateCode}
              </p>
            )}
          </div>

          {/* Documents List */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-900">
                  Documents Received
                </p>
              </div>
              <Badge
                variant="outline"
                className="bg-emerald-100 text-emerald-700 border-emerald-300"
              >
                {receivedDocsList.length} docs
              </Badge>
            </div>

            {receivedDocsList.length === 0 ? (
              <p className="text-sm text-emerald-700 italic">
                No documents marked as received yet
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {receivedDocsList.map((docType) => {
                  const config = getDocumentTypeConfig(docType);
                  return (
                    <div
                      key={docType}
                      className="flex items-center gap-2 rounded-md bg-white border border-emerald-200 px-3 py-2"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-medium text-emerald-800">
                        {config?.displayName || docType}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Warning if no documents */}
          {receivedDocsList.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    No Documents Received
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    This collection has no documents marked as received. Are you
                    sure you want to complete it?
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Checkbox */}
          <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="confirm-completion"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor="confirm-completion"
                  className="text-sm font-medium text-slate-900 cursor-pointer"
                >
                  I confirm that all original documents for{" "}
                  <span className="font-bold">{candidateName}</span> have been
                  properly received, verified, and uploaded to the system.
                </Label>
                <p className="text-xs text-slate-600 mt-1">
                  This action will mark the collection as complete. No further
                  intake events can be logged after completion.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-slate-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Collection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
