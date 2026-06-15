import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { cn } from "@/lib/utils";
import type { CumulativeReceivedItem } from "../types";
import { getCollectionDocumentProgress } from "../utils/collectionProgress";

export interface CollectionProgressCellProps {
  cumulativeReceived?: CumulativeReceivedItem[] | null;
}

function getDocumentLabel(docType: string) {
  return getDocumentTypeConfig(docType)?.displayName ?? docType;
}

export function CollectionProgressCell({
  cumulativeReceived,
}: CollectionProgressCellProps) {
  const documents = getCollectionDocumentProgress(cumulativeReceived);
  const receivedDocs = documents.allDocuments.filter((item) => item.isReceived);
  const missingDocs = documents.allDocuments.filter((item) => !item.isReceived);
  const remainingCount = documents.totalCount - documents.receivedCount;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="min-w-[8rem] cursor-help space-y-1 rounded-md text-left outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-label={`${documents.receivedCount} of ${documents.totalCount} documents on file`}
        >
          <div className="flex items-center justify-between gap-2 px-0.5 text-[10px]">
            <span className="font-medium tabular-nums text-slate-700">
              {documents.receivedCount}/{documents.totalCount}
            </span>
            <span className="text-muted-foreground">{documents.percent}%</span>
          </div>
          <Progress
            value={documents.percent}
            className="h-1.5 bg-slate-100"
            indicatorClassName={cn(
              documents.isComplete ? "bg-emerald-500" : "bg-blue-500",
            )}
          />
          <p className="px-0.5 text-[10px] text-muted-foreground">on file</p>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="w-64 border border-slate-200 bg-white p-0 text-slate-900 shadow-lg"
      >
        <div className="border-b border-slate-100 px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-900">
            Document progress
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {documents.receivedCount} of {documents.totalCount} on file ·{" "}
            {documents.percent}% complete
          </p>
        </div>

        <div className="max-h-48 space-y-2 overflow-y-auto px-3 py-2.5">
          {receivedDocs.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Received ({receivedDocs.length})
              </p>
              <ul className="space-y-0.5">
                {receivedDocs.map((item) => (
                  <li
                    key={item.docType}
                    className="flex items-start gap-1.5 text-[11px] text-slate-700"
                  >
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                    <span>{getDocumentLabel(item.docType)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {missingDocs.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Pending ({missingDocs.length})
              </p>
              <ul className="space-y-0.5">
                {missingDocs.map((item) => (
                  <li
                    key={item.docType}
                    className="flex items-start gap-1.5 text-[11px] text-slate-600"
                  >
                    <X className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                    <span>{getDocumentLabel(item.docType)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {remainingCount > 0 ? (
          <div className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
            {remainingCount} document{remainingCount !== 1 ? "s" : ""} still
            needed
          </div>
        ) : (
          <div className="border-t border-slate-100 px-3 py-2 text-[10px] font-medium text-emerald-700">
            All required documents received
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
