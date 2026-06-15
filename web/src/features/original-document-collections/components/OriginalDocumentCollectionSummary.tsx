import { useState } from "react";
import { Eye, FileStack, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { useGetCandidateOriginalDocumentCollectionsQuery } from "../api";
import { COLLECTION_STATUS_LABELS } from "../constants";
import { OriginalDocumentCollectionModal } from "./OriginalDocumentCollectionModal";
import { cn } from "@/lib/utils";

export type OriginalDocumentCollectionStat = {
  label: string;
  value: string | number;
};

export interface OriginalDocumentCollectionSummaryProps {
  candidateId: string;
  className?: string;
  extraStats?: OriginalDocumentCollectionStat[];
  showMergedPdf?: boolean;
}

export function OriginalDocumentCollectionSummary({
  candidateId,
  className,
  extraStats = [],
  showMergedPdf = true,
}: OriginalDocumentCollectionSummaryProps) {
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  const { data, isLoading } = useGetCandidateOriginalDocumentCollectionsQuery(
    candidateId,
    { skip: !candidateId },
  );

  const collection = data?.data?.collection;
  const cumulative = data?.data?.cumulativeReceived ?? [];
  const lockerFileNumber =
    data?.data?.candidate?.lockerFileNumber ?? collection?.lockerFileNumber;
  const mergedDocument = collection?.mergedDocument;

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading collection details...
      </div>
    );
  }

  if (!collection) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/50 to-white p-4 space-y-3",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileStack className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-semibold text-slate-900">
              Original document collection
            </span>
          </div>
          {collection.status && (
            <Badge variant="outline" className="text-[10px]">
              {COLLECTION_STATUS_LABELS[collection.status] ?? collection.status}
            </Badge>
          )}
        </div>

        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Locker file #</dt>
            <dd className="font-mono font-medium">{lockerFileNumber ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Docs on file</dt>
            <dd className="font-medium">{cumulative.length}</dd>
          </div>
          {extraStats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="font-medium">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setShowCollectionModal(true)}
          >
            View collection
          </Button>
          {showMergedPdf && mergedDocument?.fileUrl && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setShowPdfViewer(true)}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Merged PDF
            </Button>
          )}
        </div>
      </div>

      <OriginalDocumentCollectionModal
        candidateId={candidateId}
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
      />

      {showMergedPdf && mergedDocument?.fileUrl && (
        <PDFViewer
          fileUrl={mergedDocument.fileUrl}
          fileName={mergedDocument.fileName}
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
        />
      )}
    </>
  );
}
