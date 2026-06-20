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
import { cn } from "@/lib/utils";

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

  const receivedDocuments = new Map<string, boolean>();
  collection.events.forEach((event) => {
    event.items.forEach((item) => {
      if (item.isReceived) {
        receivedDocuments.set(item.docType, true);
      }
    });
  });

  const receivedDocsList = Array.from(receivedDocuments.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  const candidateName = `${collection.candidate.firstName || ""} ${collection.candidate.lastName || ""}`.trim();
  const hasNoDocuments = receivedDocsList.length === 0;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      setIsConfirmed(false);
      onClose();
    } catch (error) {
      console.error("Failed to complete collection:", error);
    }
  };

  const handleClose = () => {
    setIsConfirmed(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[88vh] w-[min(96vw,56rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="shrink-0 border-b border-border bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-base font-semibold text-foreground">
                Complete collection
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Verify details before marking this collection complete.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,14rem)_1fr]">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Candidate
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">{candidateName}</p>
              {collection.candidate.candidateCode ? (
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {collection.candidate.candidateCode}
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Documents received
                  </p>
                </div>
                <Badge variant="outline" className="h-6 px-2 text-xs">
                  {receivedDocsList.length}
                </Badge>
              </div>

              {hasNoDocuments ? (
                <p className="text-xs italic text-muted-foreground">
                  No documents marked as received yet.
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
                    {receivedDocsList.map((docType) => {
                      const config = getDocumentTypeConfig(docType);
                      return (
                        <div
                          key={docType}
                          className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5"
                        >
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" />
                          <span className="truncate text-xs font-medium text-foreground">
                            {config?.displayName || docType}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {hasNoDocuments ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-900">
                <span className="font-semibold">No documents received.</span>{" "}
                Completing now will close the collection without any received
                documents on file.
              </p>
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="confirm-completion"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <Label
                  htmlFor="confirm-completion"
                  className="cursor-pointer text-sm font-medium leading-snug text-foreground"
                >
                  I confirm all original documents for{" "}
                  <span className="font-semibold">{candidateName}</span> have been
                  received, verified, and uploaded.
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  No further intake events can be logged after completion.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter
          className={cn(
            "shrink-0 gap-2 border-t border-border bg-muted/20 px-5 py-3",
            "sm:justify-end",
          )}
        >
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
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
                Complete collection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
