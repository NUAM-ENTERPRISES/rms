import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar, FileStack, Link2, MapPin, Truck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  useGetCourierHistoryPaginatedQuery,
  useGetDocumentCollectionHistoryPaginatedQuery,
} from "@/features/processing/data/processing.endpoints";
import { ShipmentStatusBadge } from "@/features/courier-shipments/components/ShipmentStatusBadge";
import { DELIVERY_MODE_LABELS, type DeliveryMode } from "@/features/courier-shipments/constants";
import { PDFViewer } from "@/components/molecules/PDFViewer";

interface OriginalDocumentCollectionSummary {
  id: string;
  status: string;
  lockerFileNumber?: string | null;
  mergedDocument?: {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string;
  } | null;
}

export interface OriginalDocumentCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processingId: string;
  fileNumber: string | null;
  originalDocumentCollection: OriginalDocumentCollectionSummary | null;
}

function formatDeliveryMode(mode: string): string {
  return DELIVERY_MODE_LABELS[mode as DeliveryMode] ?? mode;
}

function includesDelhi(label: string | null | undefined): boolean {
  if (!label) return false;
  return label.toLowerCase().includes("delhi");
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy h:mm a");
}

export function OriginalDocumentCollectionModal({
  open,
  onOpenChange,
  processingId,
  fileNumber,
  originalDocumentCollection,
}: OriginalDocumentCollectionModalProps) {
  const lockerFileNumber = originalDocumentCollection?.lockerFileNumber?.trim() || null;
  const mergedDocument = originalDocumentCollection?.mergedDocument ?? null;

  const [activeTab, setActiveTab] = useState<"overview" | "collection" | "courier">("overview");
  const [collectionPage, setCollectionPage] = useState(1);
  const [courierPage, setCourierPage] = useState(1);
  const [mergedScanViewerOpen, setMergedScanViewerOpen] = useState(false);
  const limit = 10;

  // Reset tab/pagination whenever the modal is opened
  useEffect(() => {
    if (!open) return;
    setActiveTab("overview");
    setCollectionPage(1);
    setCourierPage(1);
    setMergedScanViewerOpen(false);
  }, [open]);

  const handleOpenMergedScan = () => {
    if (!mergedDocument?.fileUrl) return;
    setMergedScanViewerOpen(true);
  };

  const {
    data: collectionRes,
    isLoading: isLoadingCollection,
    error: collectionError,
    refetch: refetchCollection,
  } = useGetDocumentCollectionHistoryPaginatedQuery(
    { processingId, page: collectionPage, limit },
    { skip: !processingId || !open },
  );

  const {
    data: courierRes,
    isLoading: isLoadingCourier,
    error: courierError,
    refetch: refetchCourier,
  } = useGetCourierHistoryPaginatedQuery(
    { processingId, page: courierPage, limit },
    { skip: !processingId || !open },
  );

  useEffect(() => {
    if (!open) return;
    refetchCollection?.();
    refetchCourier?.();
  }, [open, refetchCollection, refetchCourier]);

  const collectionItems = collectionRes?.data?.items ?? [];
  const courierItems = courierRes?.data?.items ?? [];

  const latestCollection = collectionItems[0] ?? null;
  const latestCourier = courierItems[0] ?? null;

  const locationSummary = useMemo(() => {
    if (lockerFileNumber) {
      return {
        label: `Locker Number ${lockerFileNumber}`,
        hint: "Locker location is set on the latest collection record.",
      };
    }

    if (latestCourier?.status && includesDelhi(latestCourier.toAddressLabel)) {
      return {
        label: `Courier to Delhi (${latestCourier.status})`,
        hint: "Derived from the latest courier leg destination.",
      };
    }

    if (latestCourier?.status) {
      return {
        label: `In courier (${latestCourier.status})`,
        hint: "Derived from the latest courier leg.",
      };
    }

    return {
      label: "In collection",
      hint: "No locker location / courier legs found yet.",
    };
  }, [lockerFileNumber, latestCourier]);

  const collectionTotal = collectionRes?.data?.pagination?.total ?? 0;
  const collectionPages =
    collectionRes?.data?.pagination?.totalPages ??
    collectionRes?.data?.pagination?.pages ??
    Math.max(1, Math.ceil(collectionTotal / limit));

  const courierTotal = courierRes?.data?.pagination?.total ?? 0;
  const courierPages =
    courierRes?.data?.pagination?.totalPages ??
    courierRes?.data?.pagination?.pages ??
    Math.max(1, Math.ceil(courierTotal / limit));

  const docCount = latestCollection?.documentCount ?? null;
  const delhiDocCount = latestCourier && includesDelhi(latestCourier.toAddressLabel) ? docCount : null;
  const affiniksDocCount = lockerFileNumber ? docCount : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex !h-[82vh] !max-h-[82vh] !w-[92vw] !max-w-[92vw] flex-col overflow-hidden border-border bg-card p-0 shadow-2xl lg:!w-[min(92vw,1100px)] lg:!max-w-[min(92vw,1100px)]">
        <DialogHeader className="border-b border-border bg-card px-6 pb-4 pt-5">
          <DialogTitle className="flex flex-wrap items-center gap-3 text-xl font-black text-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <FileStack className="h-5 w-5 text-white" />
            </div>
            Original Documents Collection
            {fileNumber ? (
              <Badge className="border border-border bg-card font-mono font-black text-foreground shadow-sm">
                File #{fileNumber}
              </Badge>
            ) : null}
            <Badge className="border border-emerald-200 bg-emerald-50 font-bold text-emerald-800 shadow-sm">
              {locationSummary.label}
            </Badge>
            <Badge className="border border-violet-200 bg-violet-50 font-bold text-violet-800 shadow-sm">
              <MapPin className="mr-1 h-3.5 w-3.5" />
              {mergedDocument?.fileUrl
                ? lockerFileNumber
                  ? `Merged Document location: Processing Step 2`
                  : "Doc location: Processing Step 2 · Digital"
                : "Doc location: Processing Step 2 · —"}
            </Badge>
          </DialogTitle>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{locationSummary.hint}</p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="flex h-full flex-col"
          >
            <div className="flex items-center justify-between gap-3">
              <TabsList className="w-fit border border-border bg-card shadow-sm">
                <TabsTrigger value="overview" className="gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="collection" className="gap-2">
                  Collection
                  <Badge className="border-0 bg-amber-100 text-[10px] font-black text-amber-800">
                    {collectionTotal}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="courier" className="gap-2">
                  Courier
                  <Badge className="border-0 bg-teal-100 text-[10px] font-black text-teal-800">
                    {courierTotal}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <div className="hidden items-center gap-2 md:flex">
                {mergedDocument?.fileUrl ? (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl font-black shadow-sm"
                    onClick={handleOpenMergedScan}
                  >
                    Open merged scan
                  </Button>
                ) : (
                  <Badge className="border border-border bg-card text-[10px] font-black text-muted-foreground">
                    No merged scan
                  </Badge>
                )}
              </div>
            </div>

            <TabsContent value="overview" className="flex-1 overflow-auto">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-card p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Documents in Affiniks
                  </p>
                  <p className="mt-2 text-3xl font-black text-foreground">
                    {affiniksDocCount ?? "—"}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">From latest collection event</p>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-card p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                    Documents in Delhi
                  </p>
                  <p className="mt-2 text-3xl font-black text-foreground">
                    {delhiDocCount ?? "—"}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    Based on latest courier destination
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-100 bg-card p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">
                    Merged Document
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {mergedDocument?.fileUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl font-black"
                        onClick={handleOpenMergedScan}
                      >
                        Open merged scan
                      </Button>
                    ) : (
                      <Badge className="border border-border bg-card font-bold text-muted-foreground">
                        Not available
                      </Badge>
                    )}
                  </div>
                  {mergedDocument?.fileName ? (
                    <p className="mt-2 truncate text-xs text-muted-foreground">{mergedDocument.fileName}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge className="border border-border bg-card font-bold text-foreground shadow-sm">
                      <MapPin className="mr-1 h-3 w-3" />
                      {lockerFileNumber ? `Locker ${lockerFileNumber}` : "Location pending"}
                    </Badge>
                    <Badge className="border border-border bg-card font-bold text-foreground shadow-sm">
                      <Link2 className="mr-1 h-3 w-3" />
                      {mergedDocument?.mimeType ?? "—"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-amber-100 bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                      Latest collection (Affiniks intake)
                    </p>
                    {latestCollection?.eventNumber ? (
                      <Badge className="border-0 bg-amber-100 text-[10px] font-black text-amber-800">
                        Event #{latestCollection.eventNumber}
                      </Badge>
                    ) : (
                      <Badge className="border-0 bg-muted text-[10px] font-black text-muted-foreground">—</Badge>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2">
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-amber-100">
                      <span className="text-xs font-bold text-muted-foreground">Intake type</span>
                      <span className="text-xs font-black text-foreground">
                        {latestCollection?.collectionTypeLabel ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-amber-100">
                      <span className="text-xs font-bold text-muted-foreground">Source</span>
                      <span className="max-w-[60%] truncate text-right text-xs font-medium text-foreground">
                        {latestCollection?.sourceDetail ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-amber-100">
                      <span className="text-xs font-bold text-muted-foreground">Docs collected</span>
                      <span className="text-xs font-black text-foreground">
                        {latestCollection?.documentCount ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-amber-100">
                      <span className="text-xs font-bold text-muted-foreground">Collected by</span>
                      <span className="text-xs font-black text-foreground">
                        {latestCollection?.collectedBy?.name ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-amber-100">
                      <span className="text-xs font-bold text-muted-foreground">Collection status</span>
                      <span className="text-xs font-black text-foreground">
                        {latestCollection?.collectionStatus ?? originalDocumentCollection?.status ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-amber-100">
                      <span className="text-xs font-bold text-muted-foreground">Collected at</span>
                      <span className="text-xs font-medium text-foreground">
                        {formatDateTime(latestCollection?.collectedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-amber-100">
                      <span className="text-xs font-bold text-muted-foreground">Merged scan from event</span>
                      <span className="text-xs font-black text-foreground">
                        {latestCollection?.hasMergedScan ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-amber-100">
                      <span className="text-xs font-bold text-muted-foreground">Merged file name (event)</span>
                      <span className="max-w-[60%] truncate text-right text-xs font-medium text-foreground">
                        {latestCollection?.mergedFileName ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-teal-100 bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-700">
                      Latest courier movement
                    </p>
                    {latestCourier?.legNumber ? (
                      <Badge className="border-0 bg-teal-100 text-[10px] font-black text-teal-800">
                        Leg #{latestCourier.legNumber}
                      </Badge>
                    ) : (
                      <Badge className="border-0 bg-muted text-[10px] font-black text-muted-foreground">—</Badge>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2">
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-teal-100">
                      <span className="text-xs font-bold text-muted-foreground">Route</span>
                      <span className="max-w-[60%] truncate text-right text-xs font-medium text-foreground">
                        {latestCourier ? `${latestCourier.fromAddressLabel} → ${latestCourier.toAddressLabel}` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-teal-100">
                      <span className="text-xs font-bold text-muted-foreground">Purpose</span>
                      <span className="text-xs font-black text-foreground">{latestCourier?.purposeType ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-teal-100">
                      <span className="text-xs font-bold text-muted-foreground">Delivery mode</span>
                      <span className="text-xs font-black text-foreground">
                        {latestCourier?.deliveryMode ? formatDeliveryMode(latestCourier.deliveryMode) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-teal-100">
                      <span className="text-xs font-bold text-muted-foreground">Status</span>
                      <span className="text-xs font-black text-foreground">{latestCourier?.status ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-teal-100">
                      <span className="text-xs font-bold text-muted-foreground">Tracking ID</span>
                      <span className="max-w-[60%] truncate text-right text-xs font-mono font-black text-foreground">
                        {latestCourier?.trackingId ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-teal-100">
                      <span className="text-xs font-bold text-muted-foreground">Courier partner</span>
                      <span className="max-w-[60%] truncate text-right text-xs font-medium text-foreground">
                        {latestCourier?.courierPartner ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-teal-100">
                      <span className="text-xs font-bold text-muted-foreground">Sent by</span>
                      <span className="text-xs font-black text-foreground">{latestCourier?.sentBy?.name ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-teal-100">
                      <span className="text-xs font-bold text-muted-foreground">Sent at</span>
                      <span className="text-xs font-medium text-foreground">
                        {formatDateTime(latestCourier?.sentAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-inset ring-teal-100">
                      <span className="text-xs font-bold text-muted-foreground">Received at</span>
                      <span className="text-xs font-medium text-foreground">
                        {formatDateTime(latestCourier?.receivedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="collection" className="flex-1 overflow-auto">
              {isLoadingCollection ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  Loading document collection history…
                </div>
              ) : collectionError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  Failed to load document collection history.
                </div>
              ) : collectionItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <MapPin className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-lg font-bold text-muted-foreground">No document collection history yet</p>
                  <p className="mt-1 text-sm">Intake events will appear here once documents are collected</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted hover:bg-muted">
                        <TableHead className="w-[50px] text-xs font-bold uppercase tracking-wider text-foreground">
                          #
                        </TableHead>
                        <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Event
                        </TableHead>
                        <TableHead className="w-[170px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Intake Type
                        </TableHead>
                        <TableHead className="min-w-[220px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Source
                        </TableHead>
                        <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Docs
                        </TableHead>
                        <TableHead className="w-[140px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Locker
                        </TableHead>
                        <TableHead className="w-[240px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Collected By
                        </TableHead>
                        <TableHead className="w-[240px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Date & Time
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collectionItems.map((item, index) => {
                        const collectedByName = item.collectedBy?.name ?? "—";
                        return (
                          <TableRow
                            key={item.id}
                            className={cn("bg-card hover:bg-muted", index === 0 ? "bg-amber-50" : "")}
                          >
                            <TableCell className="font-bold text-slate-400">
                              {(collectionPage - 1) * limit + index + 1}
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
                            <TableCell className="text-sm text-foreground">{item.sourceDetail || "—"}</TableCell>
                            <TableCell>
                              <Badge className="border-0 bg-muted text-xs font-bold text-foreground">
                                {item.documentCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-foreground">
                              {item.lockerFileNumber ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm font-bold text-foreground">{collectedByName}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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

                  <div className="flex items-center justify-between border-t p-4">
                    <div className="text-xs text-muted-foreground">
                      Showing {(collectionPage - 1) * limit + (collectionItems.length ? 1 : 0)} -{" "}
                      {(collectionPage - 1) * limit + collectionItems.length} of {collectionTotal}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={collectionPage <= 1}
                        onClick={() => setCollectionPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </Button>
                      <div className="text-sm">
                        {collectionPage} / {collectionPages}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={collectionPage >= collectionPages}
                        onClick={() => setCollectionPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="courier" className="flex-1 overflow-auto">
              {isLoadingCourier ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  Loading courier history…
                </div>
              ) : courierError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  Failed to load courier history.
                </div>
              ) : courierItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Truck className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-lg font-bold text-muted-foreground">No courier legs recorded yet</p>
                  <p className="mt-1 text-sm">Shipment legs will appear here once documents are dispatched</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted hover:bg-muted">
                        <TableHead className="w-[50px] text-xs font-bold uppercase tracking-wider text-foreground">
                          #
                        </TableHead>
                        <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Leg
                        </TableHead>
                        <TableHead className="min-w-[260px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Route
                        </TableHead>
                        <TableHead className="w-[140px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Mode
                        </TableHead>
                        <TableHead className="w-[160px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Status
                        </TableHead>
                        <TableHead className="w-[180px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Tracking
                        </TableHead>
                        <TableHead className="w-[220px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Sent By
                        </TableHead>
                        <TableHead className="w-[240px] text-xs font-bold uppercase tracking-wider text-foreground">
                          Date & Time
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courierItems.map((item, index) => {
                        const sentByName = item.sentBy?.name ?? "—";
                        const dateValue = item.sentAt ?? item.receivedAt;
                        return (
                          <TableRow
                            key={item.id}
                            className={cn("bg-card hover:bg-muted", index === 0 ? "bg-teal-50" : "")}
                          >
                            <TableCell className="font-bold text-slate-400">
                              {(courierPage - 1) * limit + index + 1}
                            </TableCell>
                            <TableCell>
                              <Badge className="border-0 bg-teal-100 text-[10px] font-black uppercase tracking-wider text-teal-800">
                                #{item.legNumber}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-foreground">
                              <span className="font-medium">{item.fromAddressLabel}</span>
                              <span className="mx-1.5 text-slate-400">→</span>
                              <span className="font-medium">{item.toAddressLabel}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className="border border-border bg-muted text-[10px] font-black uppercase tracking-wider text-foreground">
                                {formatDeliveryMode(item.deliveryMode)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <ShipmentStatusBadge status={item.status} />
                            </TableCell>
                            <TableCell className="text-sm text-foreground">{item.trackingId ?? "—"}</TableCell>
                            <TableCell className="text-sm font-bold text-foreground">{sentByName}</TableCell>
                            <TableCell>
                              {dateValue ? (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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

                  <div className="flex items-center justify-between border-t p-4">
                    <div className="text-xs text-muted-foreground">
                      Showing {(courierPage - 1) * limit + (courierItems.length ? 1 : 0)} -{" "}
                      {(courierPage - 1) * limit + courierItems.length} of {courierTotal}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={courierPage <= 1}
                        onClick={() => setCourierPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </Button>
                      <div className="text-sm">
                        {courierPage} / {courierPages}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={courierPage >= courierPages}
                        onClick={() => setCourierPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      {mergedDocument?.fileUrl ? (
        <PDFViewer
          fileUrl={mergedDocument.fileUrl}
          fileName={mergedDocument.fileName || "Merged document scan"}
          isOpen={mergedScanViewerOpen}
          onClose={() => setMergedScanViewerOpen(false)}
          cacheKey={mergedDocument.id}
        />
      ) : null}
    </Dialog>
  );
}

