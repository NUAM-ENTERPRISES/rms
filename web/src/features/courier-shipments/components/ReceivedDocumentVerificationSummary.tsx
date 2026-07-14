import { AlertCircle, CheckCircle2 } from "lucide-react";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { Badge } from "@/components/ui/badge";
import type { CourierShipmentDocument } from "../types";

interface ReceivedDocumentVerificationSummaryProps {
  documents: CourierShipmentDocument[];
}

export function ReceivedDocumentVerificationSummary({
  documents,
}: ReceivedDocumentVerificationSummaryProps) {
  const reviewedDocuments = documents.filter(
    (doc) => doc.receiveVerifiedAt || doc.receiveRemarks?.trim(),
  );

  if (reviewedDocuments.length === 0) {
    return null;
  }

  return (
    <div
      className="space-y-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
      role="note"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Receipt cross-check
      </p>

      <ul className="space-y-2">
        {reviewedDocuments.map((doc) => {
          const label =
            getDocumentTypeConfig(doc.docType)?.displayName ?? doc.docType;
          const remarks = doc.receiveRemarks?.trim();
          const arrived = Boolean(doc.receiveVerifiedAt);

          return (
            <li key={doc.id} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    arrived
                      ? "border-emerald-200 bg-emerald-50 text-[10px] text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-[10px] text-amber-800"
                  }
                >
                  {label}
                </Badge>
                <Badge
                  variant="secondary"
                  className="gap-1 text-[10px]"
                >
                  {arrived ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                      Arrived
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" aria-hidden />
                      Not arrived
                    </>
                  )}
                </Badge>
              </div>
              {remarks ? (
                <p
                  className={
                    arrived
                      ? "whitespace-pre-wrap text-xs leading-relaxed text-emerald-900/80"
                      : "whitespace-pre-wrap text-xs leading-relaxed text-amber-900/80"
                  }
                >
                  {remarks}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
