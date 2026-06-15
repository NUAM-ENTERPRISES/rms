import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Download, ExternalLink, Eye, FileStack, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { useCan } from "@/hooks/useCan";
import { useGetCandidateOriginalDocumentCollectionsQuery, useGetOriginalDocumentCollectionEventMergesQuery } from "../api";
import { EventMergeUploadRow } from "./EventMergeUploadRow";
import {
  COLLECTION_STATUS_LABELS,
  COLLECTION_TYPE,
  COLLECTION_TYPE_LABELS,
  DIRECT_OFFICE_LABELS,
} from "../constants";
import type {
  CollectionMergedDocument,
  OriginalDocumentCollectionEvent,
} from "../types";
import { cn } from "@/lib/utils";

export type CandidateCollectionHistoryPanelProps = {
  candidateId: string;
  variant?: "compact" | "full";
  highlightEventId?: string;
  showAddEventLink?: boolean;
  onUpdated?: () => void;
  onEventMergeUploaded?: () => void;
  allowEventMergeUpload?: boolean;
  className?: string;
};

function docTypeLabel(docType: string): string {
  return getDocumentTypeConfig(docType)?.displayName ?? docType;
}

function isPdfDocument(doc: CollectionMergedDocument): boolean {
  return (
    !doc.mimeType ||
    doc.mimeType.includes("pdf") ||
    doc.fileName.toLowerCase().endsWith(".pdf")
  );
}

function formatSourceDetail(event: OriginalDocumentCollectionEvent): string {
  switch (event.collectionType) {
    case COLLECTION_TYPE.DIRECT:
      return event.directOffice === "other"
        ? (event.directOfficeOther ?? "Other")
        : (DIRECT_OFFICE_LABELS[event.directOffice ?? ""] ??
            event.directOffice ??
            "");
    case COLLECTION_TYPE.AGENT:
      return event.agent?.name ?? event.agentNameManual ?? "";
    case COLLECTION_TYPE.COURIER:
      return [event.courierPartner, event.trackingNumber]
        .filter(Boolean)
        .join(" / ");
    default:
      return event.interviewVenue ?? "";
  }
}

function MergedScanFileRow({
  title,
  subtitle,
  document,
  dateLabel,
  onPreview,
}: {
  title: string;
  subtitle?: string;
  document: CollectionMergedDocument;
  dateLabel?: string;
  onPreview: (document: CollectionMergedDocument) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2 transition-colors hover:border-slate-300">
      <FileStack className="h-3 w-3 shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-800">{title}</p>
        {subtitle ? (
          <p className="truncate text-[10px] text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {dateLabel ? (
        <span className="shrink-0 text-[10px] text-slate-500">{dateLabel}</span>
      ) : null}
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          title="View"
          onClick={() => onPreview(document)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          asChild
          className="h-7 w-7 p-0"
          title="Download"
        >
          <a
            href={document.fileUrl}
            download={document.fileName}
            target="_blank"
            rel="noreferrer"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}

export function CandidateCollectionHistoryPanel({
  candidateId,
  variant = "full",
  highlightEventId,
  showAddEventLink = true,
  onUpdated,
  onEventMergeUploaded,
  allowEventMergeUpload = false,
  className,
}: CandidateCollectionHistoryPanelProps) {
  const canRead = useCan("read:documents");
  const [previewDocument, setPreviewDocument] =
    useState<CollectionMergedDocument | null>(null);
  const [eventMergesPage, setEventMergesPage] = useState(1);
  const eventMergesLimit = 5;
  const { data, isLoading } = useGetCandidateOriginalDocumentCollectionsQuery(
    candidateId,
    { skip: !canRead || !candidateId },
  );
  const collection = data?.data?.collection;
  const { data: eventMergesResponse } =
    useGetOriginalDocumentCollectionEventMergesQuery(
      {
        id: collection?.id ?? "",
        page: eventMergesPage,
        limit: eventMergesLimit,
      },
      { skip: !canRead || !collection?.id },
    );
  const eventMergedScans = eventMergesResponse?.data?.items ?? [];
  const eventMergesPagination = eventMergesResponse?.data?.pagination;

  useEffect(() => {
    setEventMergesPage(1);
  }, [collection?.id]);

  if (!canRead || !candidateId) return null;

  const payload = data?.data;
  const events = payload?.events ?? collection?.events ?? [];
  const cumulative = payload?.cumulativeReceived ?? [];
  const isCompact = variant === "compact";

  // Color schemes for document badges
  const badgeColors = [
    "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-300",
    "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-300",
    "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-300",
    "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-300",
    "bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-800 border-indigo-300",
    "bg-gradient-to-r from-rose-100 to-red-100 text-rose-800 border-rose-300",
    "bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-800 border-teal-300",
    "bg-gradient-to-r from-violet-100 to-purple-100 text-violet-800 border-violet-300",
  ];

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm text-muted-foreground",
          className,
        )}
      >
        Loading intake history...
      </div>
    );
  }

  if (events.length === 0) {
    if (isCompact) return null;
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileStack className="h-5 w-5" />
            Original Documents (Physical)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No intake events logged yet.
        </CardContent>
      </Card>
    );
  }

  const chronologicalEvents = [...events].sort(
    (a, b) =>
      new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime(),
  );
  const eventNumberById = new Map(
    chronologicalEvents.map((event, index) => [event.id, index + 1]),
  );
  const timeline = [...chronologicalEvents].reverse();

  const content = (
    <div className="space-y-3">
      {cumulative.length > 0 && (
        <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-900">
              All documents on file
            </p>
            <Badge
              variant="outline"
              className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] px-2 py-0.5"
            >
              {cumulative.length} docs
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cumulative.map((item, index) => (
              <Badge
                key={item.docType}
                variant="outline"
                className={cn(
                  "text-xs font-semibold shadow-sm",
                  badgeColors[index % badgeColors.length]
                )}
              >
                {docTypeLabel(item.docType)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {collection?.mergedDocument ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-foreground">
            Combined merged scan (all events)
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <FileStack className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs text-muted-foreground">
                {collection.mergedDocument.fileName}
              </span>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewDocument(collection.mergedDocument!)}
                className="h-7 w-7 p-0"
                title="Preview PDF"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-7 w-7 p-0"
                title="Download PDF"
              >
                <a
                  href={collection.mergedDocument.fileUrl}
                  download={collection.mergedDocument.fileName}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {timeline.map((event) => {
          const received = event.items.filter((item) => item.isReceived);
          const isHighlighted = event.id === highlightEventId;
          const source = formatSourceDetail(event);
          const eventNumber = eventNumberById.get(event.id) ?? 0;

          return (
            <div
              key={event.id}
              className={cn(
                "rounded-lg border-2 p-3.5 text-sm transition-all",
                isHighlighted
                  ? "border-indigo-300 bg-gradient-to-r from-indigo-50 to-blue-50 shadow-sm ring-2 ring-indigo-200"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">
                      Event {eventNumber}
                    </span>
                    {isHighlighted ? (
                      <Badge className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[10px] px-2 py-0.5 shadow-sm">
                        Latest logged
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-700">
                    {COLLECTION_TYPE_LABELS[event.collectionType]}
                    {source ? ` · ${source}` : ""} ·{" "}
                    {format(new Date(event.collectedAt), "dd MMM yyyy")}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Collected by {event.collectedBy.name}
                  </p>
                </div>
              </div>

              {received.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {received.map((item, docIndex) => (
                    <Badge
                      key={item.docType}
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold shadow-sm",
                        badgeColors[docIndex % badgeColors.length]
                      )}
                    >
                      {docTypeLabel(item.docType)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs italic text-slate-400">
                  No documents marked received in this event.
                </p>
              )}

              {collection && received.length > 0 ? (
                <EventMergeUploadRow
                  collectionId={collection.id}
                  eventId={event.id}
                  eventLabel={`Event ${eventNumber}`}
                  mergedDocument={event.mergedDocument}
                  disabled={
                    collection.status === "completed" || !allowEventMergeUpload
                  }
                  onUpdated={onUpdated}
                  onMergedReady={onEventMergeUploaded}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {eventMergedScans.length > 0 || (eventMergesPagination?.total ?? 0) > 0 ? (
        <div className="rounded-lg border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-3.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">
              Event merged scans
            </p>
            {eventMergesPagination ? (
              <span className="text-[10px] text-emerald-700">
                {eventMergesPagination.total} total
              </span>
            ) : null}
          </div>
          <p className="mb-2 text-[10px] text-emerald-800">
            Each intake event&apos;s uploaded merge PDF, newest first.
          </p>
          <div className="space-y-1.5">
            {eventMergedScans.map((entry) => (
              <MergedScanFileRow
                key={entry.eventId}
                title={`Event ${entry.eventNumber}`}
                subtitle={entry.document.fileName}
                document={entry.document}
                dateLabel={format(new Date(entry.collectedAt), "dd MMM yyyy")}
                onPreview={setPreviewDocument}
              />
            ))}
          </div>
          {eventMergesPagination && eventMergesPagination.totalPages > 1 ? (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-emerald-200 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={eventMergesPage <= 1}
                onClick={() => setEventMergesPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span className="text-[10px] text-emerald-700">
                Page {eventMergesPagination.page} of{" "}
                {eventMergesPagination.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={
                  eventMergesPage >= eventMergesPagination.totalPages
                }
                onClick={() =>
                  setEventMergesPage((p) =>
                    Math.min(eventMergesPagination.totalPages, p + 1),
                  )
                }
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const documentPreviewModal = previewDocument ? (
    isPdfDocument(previewDocument) ? (
      <PDFViewer
        key={previewDocument.id}
        fileUrl={previewDocument.fileUrl}
        fileName={previewDocument.fileName}
        cacheKey={previewDocument.id}
        isOpen
        onClose={() => setPreviewDocument(null)}
      />
    ) : (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) setPreviewDocument(null);
        }}
      >
        <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="truncate pr-8 text-base">
              {previewDocument.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
            <img
              src={`${previewDocument.fileUrl}${previewDocument.fileUrl.includes("?") ? "&" : "?"}_cb=${previewDocument.id}`}
              alt={previewDocument.fileName}
              className="mx-auto max-h-[calc(92vh-6rem)] w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    )
  ) : null;

  if (isCompact) {
    return (
      <>
        <div
          className={cn(
            "rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm",
            className,
          )}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-amber-700" />
              <p className="text-sm font-bold text-amber-900">
                Prior intake events
              </p>
              <Badge
                variant="outline"
                className="bg-amber-100 border-amber-300 text-amber-800 text-[10px] px-2 py-0.5"
              >
                {events.length} event{events.length !== 1 ? "s" : ""}
                {cumulative.length > 0
                  ? ` · ${cumulative.length} doc${cumulative.length !== 1 ? "s" : ""} on file`
                  : ""}
              </Badge>
            </div>
            {collection && (
              <Badge
                variant="outline"
                className="bg-white border-slate-300 text-slate-700 text-[10px] px-2 py-0.5"
              >
                {COLLECTION_STATUS_LABELS[collection.status] ?? collection.status}
              </Badge>
            )}
          </div>
          {content}
        </div>
        {documentPreviewModal}
      </>
    );
  }

  return (
    <>
      <Card className={cn("border-slate-200 shadow-sm", className)}>
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <FileStack className="h-5 w-5 text-slate-700" />
            Intake Event History
          </CardTitle>
          {showAddEventLink && collection ? (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-slate-300 hover:bg-slate-50"
            >
              <Link
                to={`/original-documents/new?candidateId=${candidateId}&collectionId=${collection.id}`}
              >
                Log Intake Event
              </Link>
            </Button>
          ) : showAddEventLink ? (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-slate-300 hover:bg-slate-50"
            >
              <Link to={`/original-documents/new?candidateId=${candidateId}`}>
                Start Collection
              </Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {collection ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-600">
                Locker File Number
              </p>
              <p
                className={cn(
                  "mt-0.5 text-sm font-bold font-mono",
                  collection.lockerFileNumber?.trim()
                    ? "text-slate-900"
                    : "text-slate-400",
                )}
              >
                {collection.lockerFileNumber?.trim() || "N/A"}
              </p>
            </div>
          ) : null}
          {content}
        </CardContent>
      </Card>
      {documentPreviewModal}
    </>
  );
}

/** Summary badges for create flow when candidate already has a collection */
export function CandidateCollectionHistoryBadges({
  candidateId,
}: {
  candidateId: string;
}) {
  const canRead = useCan("read:documents");
  const { data } = useGetCandidateOriginalDocumentCollectionsQuery(candidateId, {
    skip: !canRead || !candidateId,
  });

  const events = data?.data?.events ?? [];
  const cumulative = data?.data?.cumulativeReceived ?? [];

  if (!canRead || events.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-50 text-amber-800"
      >
        {events.length} prior intake event{events.length !== 1 ? "s" : ""}
      </Badge>
      {cumulative.length > 0 ? (
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-800"
        >
          {cumulative.length} document{cumulative.length !== 1 ? "s" : ""}{" "}
          already on file
        </Badge>
      ) : null}
    </div>
  );
}
