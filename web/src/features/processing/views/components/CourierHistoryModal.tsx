import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Truck } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useGetCourierHistoryPaginatedQuery } from "@/features/processing/data/processing.endpoints";
import { ShipmentStatusBadge } from "@/features/courier-shipments/components/ShipmentStatusBadge";
import { DELIVERY_MODE_LABELS, type DeliveryMode } from "@/features/courier-shipments/constants";
import { CandidateHistoryModalShell } from "./CandidateHistoryModalShell";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDocumentTypeConfig } from "@/constants/document-types";

interface CourierHistoryModalProps {
  processingId: string;
  refreshKey?: number;
}

function formatDeliveryMode(mode: string): string {
  return DELIVERY_MODE_LABELS[mode as DeliveryMode] ?? mode;
}

export function CourierHistoryModal({ processingId, refreshKey }: CourierHistoryModalProps) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const limit = 10;

  const { data, isLoading, error, refetch } = useGetCourierHistoryPaginatedQuery(
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

  return (
    <CandidateHistoryModalShell
      triggerLabel="View Courier History"
      triggerIcon={Truck}
      triggerHoverClass="hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
      triggerBadgeClass="bg-teal-100 text-teal-700"
      title="Courier History"
      headerIcon={Truck}
      headerIconGradient="from-teal-500 to-emerald-600"
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
      emptyIcon={Truck}
      emptyTitle="No courier legs recorded yet"
      emptyDescription="Shipment legs will appear here once documents are dispatched"
      countBadge={total}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="w-[50px] text-xs font-bold uppercase tracking-wider text-slate-700">
              #
            </TableHead>
            <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Leg
            </TableHead>
            <TableHead className="min-w-[220px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Route
            </TableHead>
            <TableHead className="w-[140px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Mode
            </TableHead>
            <TableHead className="w-[140px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Status
            </TableHead>
            <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Docs
            </TableHead>
            <TableHead className="w-[160px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Tracking
            </TableHead>
            <TableHead className="w-[200px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Sent By
            </TableHead>
            <TableHead className="w-[220px] text-xs font-bold uppercase tracking-wider text-slate-700">
              Date & Time
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const sentByName = item.sentBy?.name ?? "—";
            const dateValue = item.sentAt ?? item.receivedAt;

            return (
              <TableRow
                key={item.id}
                className={`hover:bg-slate-50 ${index === 0 ? "bg-teal-50/50" : ""}`}
              >
                <TableCell className="font-bold text-slate-400">
                  {(page - 1) * limit + index + 1}
                </TableCell>
                <TableCell>
                  <Badge className="border-0 bg-teal-100 text-[10px] font-black uppercase tracking-wider text-teal-800">
                    #{item.legNumber}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-700">
                  <span className="font-medium">{item.fromAddressLabel}</span>
                  <span className="mx-1.5 text-slate-400">→</span>
                  <span className="font-medium">{item.toAddressLabel}</span>
                </TableCell>
                <TableCell>
                  <Badge className="border border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-700">
                    {formatDeliveryMode(item.deliveryMode)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ShipmentStatusBadge status={item.status} />
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Badge className="cursor-help border-0 bg-slate-100 text-xs font-bold text-slate-700">
                            {item.documentCount ?? 0}
                          </Badge>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-sm border-slate-700 bg-slate-900 text-white">
                        <div className="space-y-2">
                          <div className="text-xs font-black uppercase tracking-widest text-slate-300">
                            Leg {item.legNumber} documents
                          </div>
                          {Array.isArray(item.documentTypes) && item.documentTypes.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {item.documentTypes.slice(0, 14).map((dt) => {
                                const label = getDocumentTypeConfig(dt)?.displayName ?? dt;
                                return (
                                  <Badge
                                    key={dt}
                                    className="border border-slate-700 bg-slate-800 text-[10px] font-bold text-slate-100"
                                  >
                                    {label}
                                  </Badge>
                                );
                              })}
                              {item.documentTypes.length > 14 ? (
                                <Badge className="border border-slate-700 bg-slate-800 text-[10px] font-bold text-slate-200">
                                  +{item.documentTypes.length - 14} more
                                </Badge>
                              ) : null}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-300">No documents recorded for this leg.</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-sm text-slate-700">
                  {item.trackingId ?? "—"}
                </TableCell>
                <TableCell>
                  {item.sentBy ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-xs font-bold text-teal-700">
                        {sentByName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{sentByName}</p>
                        <p className="text-[10px] font-medium uppercase tracking-tighter text-slate-400">
                          Sender
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {dateValue ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(dateValue), "MMM d, yyyy")}
                      <span className="text-slate-300">•</span>
                      {format(new Date(dateValue), "h:mm a")}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </CandidateHistoryModalShell>
  );
}
