import { Link } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OriginalDocumentCollectionSummary } from "@/features/original-document-collections/components/OriginalDocumentCollectionSummary";
import { useGetCourierCollectionDocsQuery } from "../api";
import { useGetCandidateOriginalDocumentCollectionsQuery } from "@/features/original-document-collections/api";

interface CourierCollectionSummaryProps {
  candidateId: string;
}

export function CourierCollectionSummary({
  candidateId,
}: CourierCollectionSummaryProps) {
  const {
    data: docsResponse,
    isLoading: docsLoading,
    isError: docsError,
  } = useGetCourierCollectionDocsQuery(candidateId, { skip: !candidateId });

  const { isLoading: historyLoading } =
    useGetCandidateOriginalDocumentCollectionsQuery(candidateId, {
      skip: !candidateId,
    });

  const docsData = docsResponse?.data;
  const availableCount = docsData?.cumulativeReceived.length ?? 0;

  if (docsLoading || historyLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading collection details...
      </div>
    );
  }

  if (docsError || !docsData) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-medium text-amber-900">
              No original document collection found
            </p>
            <p className="text-amber-800 text-xs">
              Log document intake for this candidate before creating a courier
              leg.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/original-documents/new?candidateId=${candidateId}`}>
                Log intake event
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OriginalDocumentCollectionSummary
      candidateId={candidateId}
      extraStats={[
        {
          label: "Docs available to courier",
          value: availableCount,
        },
      ]}
    />
  );
}
