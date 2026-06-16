import { Fragment } from "react";
import { format } from "date-fns";
import {
  ArrowRight,
  Calendar,
  Copy,
  Footprints,
  MapPin,
  Package,
  Plus,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DELIVERY_MODE,
  DELIVERY_MODE_LABELS,
  SHIPMENT_PURPOSE_LABELS,
  SHIPMENT_STATUS,
} from "../constants";
import type { CourierShipment } from "../types";
import { ShipmentStatusBadge } from "./ShipmentStatusBadge";
import { CourierLegActions } from "./CourierLegActions";
import { getDocumentTypeConfig } from "@/constants/document-types";

interface CandidateCourierPipelineProps {
  legs: CourierShipment[];
  variant?: "full" | "compact";
  order?: "newest-first" | "oldest-first";
  showLegActions?: boolean;
  highlightLegId?: string | null;
  onAddLeg?: () => void;
}

function legNumberClass(status: string) {
  if (status === SHIPMENT_STATUS.RECEIVED) {
    return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }
  if (status === SHIPMENT_STATUS.IN_TRANSIT) {
    return "border-amber-300 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function CandidateCourierPipeline({
  legs,
  variant = "full",
  order = "oldest-first",
  showLegActions = false,
  highlightLegId = null,
  onAddLeg,
}: CandidateCourierPipelineProps) {
  const isCompact = variant === "compact";

  const sortedLegs = [...legs].sort((a, b) =>
    order === "newest-first"
      ? b.legNumber - a.legNumber
      : a.legNumber - b.legNumber,
  );

  const copyTracking = (tracking: string) => {
    void navigator.clipboard.writeText(tracking);
    toast.success("Tracking ID copied");
  };

  if (sortedLegs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Package className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            No courier legs recorded yet
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Document movements for this candidate will appear here.
          </p>
        </div>
        {onAddLeg && (
          <Button
            type="button"
            size="sm"
            className="mt-1 gap-2 rounded-xl bg-teal-600 hover:bg-teal-700"
            onClick={onAddLeg}
          >
            <Plus className="h-4 w-4" />
            Create first leg
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card",
          !isCompact && "shadow-sm",
        )}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Leg
                </TableHead>
                <TableHead className="h-10 min-w-[12rem] px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Route
                </TableHead>
                {!isCompact && (
                  <>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Purpose
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Mode
                    </TableHead>
                    <TableHead className="h-10 min-w-[10rem] px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Documents
                    </TableHead>
                    <TableHead className="h-10 min-w-[9rem] px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Tracking
                    </TableHead>
                  </>
                )}
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Timeline
                </TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Status
                </TableHead>
                {!isCompact && showLegActions && (
                  <TableHead className="h-10 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedLegs.map((leg) => {
                const docTypes =
                  leg.docTypes ?? leg.documents.map((d) => d.docType);
                const isHighlighted = highlightLegId === leg.id;
                const showActionsRow =
                  showLegActions &&
                  (leg.status === SHIPMENT_STATUS.DRAFT ||
                    leg.status === SHIPMENT_STATUS.IN_TRANSIT ||
                    Boolean(leg.mergedDocument?.fileUrl) ||
                    Boolean(leg.lockerFileNumber));

                const actionColSpan = isCompact ? 4 : showLegActions ? 9 : 8;

                return (
                  <Fragment key={leg.id}>
                    <TableRow
                      id={`courier-leg-${leg.id}`}
                      className={cn(
                        "border-b border-border/60 transition-colors last:border-b-0 hover:bg-teal-50/30",
                        isHighlighted && "bg-teal-50/50 ring-1 ring-inset ring-teal-300",
                      )}
                    >
                      <TableCell className="px-4 py-3 align-top">
                        <span
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold",
                            legNumberClass(leg.status),
                          )}
                        >
                          {leg.legNumber}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex min-w-0 items-start gap-1.5 text-sm font-medium">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
                          <div className="min-w-0 space-y-0.5">
                            <p className="truncate">{leg.fromAddressLabel}</p>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <ArrowRight className="h-3 w-3 shrink-0" />
                              <span className="truncate">{leg.toAddressLabel}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {!isCompact && (
                        <>
                          <TableCell className="px-4 py-3 align-top">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                leg.purposeType === "return"
                                  ? "border-violet-200 bg-violet-50 text-violet-700"
                                  : "border-blue-200 bg-blue-50 text-blue-700",
                              )}
                            >
                              {SHIPMENT_PURPOSE_LABELS[leg.purposeType]}
                            </Badge>
                          </TableCell>

                          <TableCell className="px-4 py-3 align-top">
                            <Badge
                              variant="secondary"
                              className="gap-1 text-[10px]"
                            >
                              {leg.deliveryMode === DELIVERY_MODE.COURIER ? (
                                <Truck className="h-3 w-3" />
                              ) : (
                                <Footprints className="h-3 w-3" />
                              )}
                              {DELIVERY_MODE_LABELS[leg.deliveryMode]}
                            </Badge>
                          </TableCell>

                          <TableCell className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-1">
                              {docTypes.slice(0, isCompact ? 2 : 3).map((docType) => (
                                <Badge
                                  key={docType}
                                  variant="secondary"
                                  className="max-w-[140px] truncate text-[10px] font-normal"
                                >
                                  {getDocumentTypeConfig(docType)?.displayName ??
                                    docType}
                                </Badge>
                              ))}
                              {docTypes.length > 3 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{docTypes.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3 align-top">
                            {leg.deliveryMode === DELIVERY_MODE.COURIER &&
                            leg.trackingId ? (
                              <div className="flex items-center gap-1">
                                <code className="max-w-[160px] truncate rounded bg-muted px-2 py-1 text-[10px] font-mono">
                                  {leg.courierPartner} · {leg.trackingId}
                                </code>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  aria-label="Copy tracking ID"
                                  onClick={() => copyTracking(leg.trackingId!)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : leg.deliveryMode === DELIVERY_MODE.DIRECT &&
                              leg.sentBy ? (
                              <span className="text-xs text-muted-foreground">
                                By {leg.sentBy.name}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </>
                      )}

                      <TableCell className="px-4 py-3 align-top">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {leg.sentAt && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span>
                                Sent {format(new Date(leg.sentAt), "dd MMM yyyy")}
                              </span>
                            </div>
                          )}
                          {leg.status === SHIPMENT_STATUS.RECEIVED &&
                            leg.receivedAt && (
                              <div className="flex items-center gap-1.5 text-emerald-700">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                <span>
                                  Received{" "}
                                  {format(new Date(leg.receivedAt), "dd MMM yyyy")}
                                  {leg.receivedBy?.name &&
                                    ` · ${leg.receivedBy.name}`}
                                  {leg.receivedByName &&
                                    !leg.receivedBy?.name &&
                                    ` · ${leg.receivedByName}`}
                                </span>
                              </div>
                            )}
                          {!leg.sentAt && !leg.receivedAt && (
                            <span>—</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 align-top">
                        <ShipmentStatusBadge status={leg.status} />
                      </TableCell>

                      {!isCompact && showLegActions && (
                        <TableCell className="px-4 py-3 text-right align-top">
                          {leg.mergedDocument?.fileUrl ? (
                            <Badge variant="outline" className="text-[10px]">
                              PDF
                            </Badge>
                          ) : leg.status === SHIPMENT_STATUS.DRAFT ? (
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                            >
                              Pending dispatch
                            </Badge>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>

                    {showActionsRow && (
                      <TableRow className="border-b border-border/60 bg-muted/10 hover:bg-muted/10">
                        <TableCell colSpan={actionColSpan} className="px-4 py-3">
                          <CourierLegActions leg={leg} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
