import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, FileStack } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import {
  useGetCandidateProcessingDetailsQuery,
  useGetDocumentCollectionHistoryPaginatedQuery,
} from "@/features/processing/data/processing.endpoints";
import { CandidateHistoryModalShell } from "./CandidateHistoryModalShell";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGetOriginalDocumentCollectionQuery } from "@/features/original-document-collections/api";
import { getDocumentTypeConfig } from "@/constants/document-types";

interface DocumentCollectionHistoryModalProps {
  processingId: string;
  refreshKey?: number;
}

export function DocumentCollectionHistoryModal({
  processingId,
  refreshKey,
}: DocumentCollectionHistoryModalProps) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const limit = 10;

  const { data: processingDetailsRes } = useGetCandidateProcessingDetailsQuery(processingId, {
    skip: !processingId || !open,
  });
  const collectionId = processingDetailsRes?.data?.originalDocumentCollection?.id ?? "";

  const { data: collectionRes } = useGetOriginalDocumentCollectionQuery(collectionId, {
    skip: !collectionId || !open,
  });
  const collectionEvents = collectionRes?.data?.events ?? [];

  const { data, isLoading, error, refetch } = useGetDocumentCollectionHistoryPaginatedQuery(
    { processingId, page, limit },
    { skip: !processingId || !open },
  );

  useEffect(() => {
    if (open) {
      refetch?.();
    }
  }, [refreshKey, open, refetch]);

  const items = data?.data?.items ?? [];
  const pagination = data?.data?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages =
    pagination?.totalPages ??
    pagination?.pages ??
    Math.max(1, Math.ceil(total / limit));

  const chronologicalEvents = [...collectionEvents].sort(
    (a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime(),
  );

  const eventByNumber = new Map<number, (typeof chronologicalEvents)[number]>();
  chronologicalEvents.forEach((ev, idx) => {
    eventByNumber.set(idx + 1, ev);
  });

  return (
    <CandidateHistoryModalShell
      triggerLabel="View Document Collection History"
      triggerIcon={FileStack}
      triggerHoverClass="hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
      triggerBadgeClass="bg-amber-100 text-amber-700"
      title="Document Collection History"
      headerIcon={FileStack}
      headerIconGradient="from-amber-500 to-orange-600"
      total={total}
      page={page}
      limit={limit}
      itemCount={items.length}
      totalPages={totalPages}
      isLoading={isLoading}
      error={error}
      open={open}
      onOpenChange={setOpen}
      onPageChange={setPage}
      emptyIcon={FileStack}
      emptyTitle="No document collection history yet"
      emptyDescription="Intake events will appear here once documents are collected"
      countBadge={total}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="w-[50px] text-xs font-bold uppercase tracking-wider text-slate-700">
              #
            </TableHead>
            <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Event
            </TableHead>
            <TableHead className="w-[160px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Intake Type
            </TableHead>
            <TableHead className="min-w-[180px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Source
            </TableHead>
            <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Docs
            </TableHead>
            <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Locker
            </TableHead>
            <TableHead className="w-[140px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Status
            </TableHead>
            <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Merged
            </TableHead>
            <TableHead className="min-w-[220px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Merged File
            </TableHead>
            <TableHead className="w-[200px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Collected By
            </TableHead>
            <TableHead className="w-[220px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Date & Time
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const collectedByName = item.collectedBy?.name ?? "—";

            return (
              <TableRow
                key={item.id}
                className={`hover:bg-slate-50 ${index === 0 ? "bg-amber-50/50" : ""}`}
              >
                <TableCell className="font-bold text-slate-400">
                  {(page - 1) * limit + index + 1}
                </TableCell>
                <TableCell>
                  <Badge className="border-0 bg-amber-100 text-[10px] font-black uppercase tracking-wider text-amber-800">
                    #{item.eventNumber}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="border border-indigo-200 bg-indigo-50 text-[10px] font-black uppercase tracking-wider text-indigo-700">
                    {item.collectionTypeLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-700">
                  {item.sourceDetail || "—"}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Badge className="cursor-help border-0 bg-slate-100 text-xs font-bold text-slate-700">
                            {item.documentCount}
                          </Badge>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-sm border-slate-700 bg-slate-900 text-white"
                      >
                        <div className="space-y-2">
                          <div className="text-xs font-black uppercase tracking-widest text-slate-300">
                            Event {item.eventNumber} documents
                          </div>
                          {(() => {
                            const event = eventByNumber.get(item.eventNumber);
                            const receivedItems = (event?.items ?? []).filter((it) => it.isReceived);
                            if (!collectionId) {
                              return (
                                <div className="text-xs text-slate-300">
                                  Document list not available (missing collection id).
                                </div>
                              );
                            }
                            if (!event) {
                              return (
                                <div className="text-xs text-slate-300">
                                  Document list not available for this event.
                                </div>
                              );
                            }
                            if (receivedItems.length === 0) {
                              return (
                                <div className="text-xs text-slate-300">
                                  No documents marked as received for this event.
                                </div>
                              );
                            }
                            return (
                              <div className="flex flex-wrap gap-1.5">
                                {receivedItems.slice(0, 14).map((doc) => {
                                  const label =
                                    getDocumentTypeConfig(doc.docType)?.displayName ?? doc.docType;
                                  return (
                                    <Badge
                                      key={doc.docType}
                                      className="border border-slate-700 bg-slate-800 text-[10px] font-bold text-slate-100"
                                    >
                                      {label}
                                    </Badge>
                                  );
                                })}
                                {receivedItems.length > 14 ? (
                                  <Badge className="border border-slate-700 bg-slate-800 text-[10px] font-bold text-slate-200">
                                    +{receivedItems.length - 14} more
                                  </Badge>
                                ) : null}
                              </div>
                            );
                          })()}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-sm font-medium text-slate-700">
                  {item.lockerFileNumber ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      item.collectionStatus === "completed"
                        ? "border-0 bg-emerald-100 text-[10px] font-black uppercase tracking-wider text-emerald-800"
                        : item.collectionStatus === "cancelled"
                          ? "border-0 bg-rose-100 text-[10px] font-black uppercase tracking-wider text-rose-800"
                          : "border-0 bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-700"
                    }
                  >
                    {item.collectionStatus ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      item.hasMergedScan
                        ? "border-0 bg-violet-100 text-[10px] font-black uppercase tracking-wider text-violet-800"
                        : "border-0 bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600"
                    }
                  >
                    {item.hasMergedScan ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-sm text-slate-700">
                  {item.mergedFileName ?? "—"}
                </TableCell>
                <TableCell>
                  {item.collectedBy ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-xs font-bold text-amber-700">
                        {collectedByName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{collectedByName}</p>
                        <p className="text-[10px] font-medium uppercase tracking-tighter text-slate-400">
                          Collector
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(item.collectedAt), "MMM d, yyyy")}
                    <span className="text-slate-300">•</span>
                    {format(new Date(item.collectedAt), "h:mm a")}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </CandidateHistoryModalShell>
  );
}
