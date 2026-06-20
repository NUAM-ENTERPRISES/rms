import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Download, Eye, FileStack, History, Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
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
  COLLECTION_TYPE_LABELS,
} from "../constants";
import { CollectionSourceDetail } from "./CollectionSourceDetail";
import type {
  CollectionMergedDocument,
  OriginalDocumentCollectionEvent,
} from "../types";
import { cn } from "@/lib/utils";

export type CandidateCollectionHistoryPanelProps = {
  candidateId: string;
  variant?: "compact" | "full" | "modal";
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
    <div className="group flex items-center gap-3 rounded-xl border border-emerald-100 bg-white/90 p-2.5 transition-all hover:border-emerald-200 hover:shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
        <FileStack className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {dateLabel ? (
        <span className="hidden shrink-0 text-[11px] font-medium text-slate-500 sm:inline">
          {dateLabel}
        </span>
      ) : null}
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
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
          className="h-8 w-8 p-0"
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
  const canRead = useCan("read:original_document_intake");
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
  const isModal = variant === "modal";

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
          "flex items-center gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 text-sm text-muted-foreground shadow-sm",
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading intake history...
      </div>
    );
  }

  if (events.length === 0) {
    if (isCompact) return null;
    return (
      <Card className={cn("overflow-hidden border-slate-200 shadow-sm", className)}>
        <div className="border-b bg-gradient-to-r from-slate-50 to-indigo-50/40 px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <FileStack className="h-5 w-5 text-indigo-600" />
            Intake event history
          </CardTitle>
        </div>
        <CardContent className="p-5 text-sm text-muted-foreground">
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
    <div className="space-y-4">
      {cumulative.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/50 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-800">
                All documents on file
              </p>
              <p className="mt-0.5 text-sm text-blue-700/80">
                Cumulative across all intake events
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-blue-200 bg-white/80 px-2.5 py-1 text-xs font-semibold text-blue-800"
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
                  badgeColors[index % badgeColors.length],
                )}
              >
                {docTypeLabel(item.docType)}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {collection?.mergedDocument ? (
        <div className="overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Combined merged scan
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-800">
                All events merged into one PDF
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-indigo-200 bg-white/80 text-xs font-medium text-indigo-700"
            >
              Ready
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-white/80 bg-white/70 p-3 backdrop-blur-sm">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FileStack className="h-4 w-4" />
              </div>
              <span className="truncate text-sm text-slate-700">
                {collection.mergedDocument.fileName}
              </span>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewDocument(collection.mergedDocument!)}
                className="h-8 gap-1.5 px-2.5"
                title="Preview PDF"
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 w-8 p-0"
                title="Download PDF"
              >
                <a
                  href={collection.mergedDocument.fileUrl}
                  download={collection.mergedDocument.fileName}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Intake timeline
          </p>
          <span className="text-xs text-muted-foreground">Newest first</span>
        </div>
        <div className="space-y-3">
        {timeline.map((event) => {
          const received = event.items.filter((item) => item.isReceived);
          const isHighlighted = event.id === highlightEventId;
          const eventNumber = eventNumberById.get(event.id) ?? 0;

          return (
            <div
              key={event.id}
              className={cn(
                "relative overflow-hidden rounded-xl border p-4 transition-all",
                isHighlighted
                  ? "border-indigo-300 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/50 shadow-md ring-2 ring-indigo-100"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
              )}
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  isHighlighted
                    ? "bg-gradient-to-b from-indigo-500 to-blue-500"
                    : "bg-gradient-to-b from-slate-200 to-slate-300",
                )}
                aria-hidden
              />

              <div className="flex flex-wrap items-start gap-3 pl-2">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm",
                    isHighlighted
                      ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white"
                      : "bg-slate-100 text-slate-700",
                  )}
                >
                  {eventNumber}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      Event {eventNumber}
                    </span>
                    {isHighlighted ? (
                      <Badge className="bg-gradient-to-r from-indigo-600 to-blue-600 px-2 py-0.5 text-[10px] text-white shadow-sm">
                        Latest logged
                      </Badge>
                    ) : null}
                    {event.mergedDocument ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700"
                      >
                        Merge uploaded
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-sm font-medium text-slate-700">
                    <span>{COLLECTION_TYPE_LABELS[event.collectionType]}</span>
                    <span aria-hidden="true">·</span>
                    <CollectionSourceDetail collection={event} />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(new Date(event.collectedAt), "dd MMM yyyy, h:mm a")}{" "}
                    · Collected by {event.collectedBy.name}
                  </p>
                </div>
              </div>

              {received.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5 pl-2 sm:pl-12">
                  {received.map((item, docIndex) => (
                    <Badge
                      key={item.docType}
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold shadow-sm",
                        badgeColors[docIndex % badgeColors.length],
                      )}
                    >
                      {docTypeLabel(item.docType)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-3 pl-2 text-xs italic text-slate-400 sm:pl-12">
                  No documents marked received in this event.
                </p>
              )}

              {collection && received.length > 0 ? (
                <div className="mt-3 pl-2 sm:pl-12">
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
                </div>
              ) : null}
            </div>
          );
        })}
        </div>
      </div>

      {eventMergedScans.length > 0 || (eventMergesPagination?.total ?? 0) > 0 ? (
        <div className="overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-green-50/40 p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                Event merged scans
              </p>
              <p className="mt-0.5 text-xs text-emerald-800/80">
                Each intake event&apos;s uploaded merge PDF, newest first.
              </p>
            </div>
            {eventMergesPagination ? (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-white/80 text-xs font-semibold text-emerald-800"
              >
                {eventMergesPagination.total} total
              </Badge>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
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
            "overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40 shadow-sm",
            className,
          )}
        >
          <div className="border-b border-amber-100/80 bg-amber-50/50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-950">
                    Prior intake events
                  </p>
                  <p className="text-xs text-amber-800/70">
                    {events.length} event{events.length !== 1 ? "s" : ""}
                    {cumulative.length > 0
                      ? ` · ${cumulative.length} doc${cumulative.length !== 1 ? "s" : ""} on file`
                      : ""}
                  </p>
                </div>
              </div>
              {collection ? (
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-white/80 text-xs text-amber-900"
                >
                  {COLLECTION_STATUS_LABELS[collection.status] ?? collection.status}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="p-4">{content}</div>
        </div>
        {documentPreviewModal}
      </>
    );
  }

  if (isModal) {
    return (
      <>
        <div className={cn("space-y-4", className)}>
          {payload?.candidate?.lockerFileNumber ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-600">
                Locker file number
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                {payload.candidate.lockerFileNumber}
              </p>
            </div>
          ) : null}
          {content}
        </div>
        {documentPreviewModal}
      </>
    );
  }

  return (
    <>
      <Card className={cn("overflow-hidden border-slate-200 shadow-sm", className)}>
        <div className="relative border-b border-slate-100 bg-gradient-to-br from-indigo-50/60 via-white to-amber-50/30 px-4 py-4 sm:px-5">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-300/15 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 left-1/4 h-20 w-24 rounded-full bg-amber-200/15 blur-2xl"
            aria-hidden
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700/90">
                Document intake
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900 sm:text-xl">
                Intake event history
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-indigo-200 bg-white/80 text-xs font-semibold text-indigo-800"
                >
                  {events.length} event{events.length !== 1 ? "s" : ""}
                </Badge>
                {cumulative.length > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-blue-200 bg-white/80 text-xs font-medium text-blue-800"
                  >
                    {cumulative.length} doc{cumulative.length !== 1 ? "s" : ""} on file
                  </Badge>
                ) : null}
                {collection ? (
                  <>
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-white/80 text-xs text-slate-700"
                    >
                      {COLLECTION_STATUS_LABELS[collection.status] ??
                        collection.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-slate-200 bg-white/80 text-xs font-medium",
                        collection.lockerFileNumber?.trim()
                          ? "text-slate-700"
                          : "text-slate-400",
                      )}
                    >
                      Locker: {collection.lockerFileNumber?.trim() || "N/A"}
                    </Badge>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_8px_20px_rgba(99,102,241,0.28)] sm:flex">
                <History className="h-5 w-5" />
              </div>
              {showAddEventLink && collection ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-slate-200 bg-white/80 text-xs shadow-sm hover:bg-white"
                  asChild
                >
                  <Link
                    to={`/original-documents/new?candidateId=${candidateId}&collectionId=${collection.id}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Log intake event
                  </Link>
                </Button>
              ) : showAddEventLink ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-slate-200 bg-white/80 text-xs shadow-sm hover:bg-white"
                  asChild
                >
                  <Link to={`/original-documents/new?candidateId=${candidateId}`}>
                    <Plus className="h-3.5 w-3.5" />
                    Start collection
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <CardContent className="p-4 sm:p-5">{content}</CardContent>
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
  const canRead = useCan("read:original_document_intake");
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
