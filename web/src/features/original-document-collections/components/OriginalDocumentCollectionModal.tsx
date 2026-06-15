import { FileStack } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CandidateCollectionHistoryPanel } from "./CandidateCollectionHistoryPanel";
import { COLLECTION_STATUS_LABELS } from "../constants";
import { useGetCandidateOriginalDocumentCollectionsQuery } from "../api";
import { cn } from "@/lib/utils";

export interface OriginalDocumentCollectionModalProps {
  candidateId: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
}

export function OriginalDocumentCollectionModal({
  candidateId,
  isOpen,
  onClose,
  title = "Original document collection",
  className,
}: OriginalDocumentCollectionModalProps) {
  const { data } = useGetCandidateOriginalDocumentCollectionsQuery(candidateId, {
    skip: !isOpen || !candidateId,
  });

  const collection = data?.data?.collection;
  const cumulativeCount = data?.data?.cumulativeReceived.length ?? 0;
  const eventsCount =
    data?.data?.events.length ?? collection?.events?.length ?? 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "!flex h-[min(65vh,600px)] max-h-[65vh] w-[min(96vw,1100px)] !max-w-[min(96vw,1100px)] flex-col gap-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-0 shadow-2xl",
          className,
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-slate-200/80 bg-gradient-to-r from-teal-50/60 via-white to-slate-50 px-5 py-4 text-left">
          <div className="flex flex-wrap items-center gap-3 pr-8">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm">
              <FileStack className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-slate-900">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-slate-500">
                Intake events and documents on file for this candidate
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {collection?.status ? (
                <Badge variant="outline" className="text-[10px]">
                  {COLLECTION_STATUS_LABELS[collection.status] ??
                    collection.status}
                </Badge>
              ) : null}
              {eventsCount > 0 ? (
                <Badge
                  variant="outline"
                  className="bg-slate-50 text-[10px] text-slate-700"
                >
                  {eventsCount} event{eventsCount !== 1 ? "s" : ""}
                </Badge>
              ) : null}
              {cumulativeCount > 0 ? (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-[10px] text-blue-800 border-blue-200"
                >
                  {cumulativeCount} doc{cumulativeCount !== 1 ? "s" : ""}
                </Badge>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <CandidateCollectionHistoryPanel
            candidateId={candidateId}
            variant="modal"
            showAddEventLink={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use OriginalDocumentCollectionModal */
export function ViewCollectionModal(
  props: OriginalDocumentCollectionModalProps,
) {
  return <OriginalDocumentCollectionModal {...props} />;
}
