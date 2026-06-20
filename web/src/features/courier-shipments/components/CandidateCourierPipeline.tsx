import { Fragment } from "react";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Footprints,
  Package,
  Plus,
  Truck,
} from "lucide-react";
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
import { CourierTrackingDisplay } from "@/shared/components/CourierTrackingDisplay";
import { DocumentTypeTruncatedBadges } from "@/components/molecules";
import { CourierRouteDisplay } from "./CourierRouteDisplay";

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

function legCardAccentClass(status: string) {
  if (status === SHIPMENT_STATUS.RECEIVED) {
    return "border-l-emerald-500";
  }
  if (status === SHIPMENT_STATUS.IN_TRANSIT) {
    return "border-l-amber-500";
  }
  return "border-l-slate-300";
}

function legCardBorderClass(status: string, isHighlighted: boolean) {
  if (isHighlighted) {
    return "border-teal-300 ring-2 ring-teal-200/60";
  }
  if (status === SHIPMENT_STATUS.RECEIVED) {
    return "border-emerald-200/80";
  }
  if (status === SHIPMENT_STATUS.IN_TRANSIT) {
    return "border-amber-200/80";
  }
  return "border-border";
}

interface CourierLegCardProps {
  leg: CourierShipment;
  isHighlighted: boolean;
  showLegActions: boolean;
}

function CourierLegCard({
  leg,
  isHighlighted,
  showLegActions,
}: CourierLegCardProps) {
  const docTypes = leg.docTypes ?? leg.documents.map((d) => d.docType);

  return (
    <article
      id={`courier-leg-${leg.id}`}
      className={cn(
        "overflow-hidden rounded-xl border border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md",
        legCardAccentClass(leg.status),
        legCardBorderClass(leg.status, isHighlighted),
      )}
      aria-label={`Courier leg ${leg.legNumber}`}
    >
      {isHighlighted && (
        <div className="flex items-center gap-2 border-b border-teal-200 bg-teal-50 px-4 py-2 text-xs font-medium text-teal-800">
          Opened leg — details below
        </div>
      )}

      <header className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
              legNumberClass(leg.status),
            )}
            aria-hidden
          >
            {leg.legNumber}
          </span>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Leg {leg.legNumber}
            </p>
            <CourierRouteDisplay
              fromLabel={leg.fromAddressLabel}
              toLabel={leg.toAddressLabel}
              status={leg.status}
            />
          </div>
        </div>

        <ShipmentStatusBadge
          status={leg.status}
          className="w-fit shrink-0 self-start"
        />
      </header>

      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Purpose
          </p>
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
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mode
          </p>
          <Badge variant="secondary" className="gap-1 text-[10px]">
            {leg.deliveryMode === DELIVERY_MODE.COURIER ? (
              <Truck className="h-3 w-3" aria-hidden />
            ) : (
              <Footprints className="h-3 w-3" aria-hidden />
            )}
            {DELIVERY_MODE_LABELS[leg.deliveryMode]}
          </Badge>
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Documents
            {docTypes.length > 0 ? (
              <span className="ml-1 font-medium normal-case tracking-normal text-foreground/70">
                ({docTypes.length})
              </span>
            ) : null}
          </p>
          <DocumentTypeTruncatedBadges docTypes={docTypes} maxVisible={3} />
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tracking
          </p>
          {leg.deliveryMode === DELIVERY_MODE.COURIER && leg.trackingId ? (
            <CourierTrackingDisplay
              courierPartner={leg.courierPartner}
              trackingId={leg.trackingId}
            />
          ) : leg.deliveryMode === DELIVERY_MODE.DIRECT && leg.sentBy ? (
            <span className="text-xs text-muted-foreground">
              By {leg.sentBy.name}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {showLegActions && (
        <div className="border-t border-border/60 bg-muted/10 px-4 py-3.5">
          <CourierLegActions leg={leg} />
        </div>
      )}
    </article>
  );
}

function LegConnector() {
  return (
    <div
      className="flex items-center justify-center py-1"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center">
        <div className="h-4 w-px bg-border" />
        <span className="my-0.5 rounded-full border border-border/80 bg-muted/40 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          earlier
        </span>
        <div className="h-4 w-px bg-border" />
      </div>
    </div>
  );
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
  const showTimelineStatusInTable = !showLegActions;
  const useLegCards = !isCompact && showLegActions;

  const sortedLegs = [...legs].sort((a, b) =>
    order === "newest-first"
      ? b.legNumber - a.legNumber
      : a.legNumber - b.legNumber,
  );

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

  if (useLegCards) {
    return (
      <div className="space-y-1">
        {sortedLegs.map((leg, index) => (
          <Fragment key={leg.id}>
            <CourierLegCard
              leg={leg}
              isHighlighted={highlightLegId === leg.id}
              showLegActions={showLegActions}
            />
            {index < sortedLegs.length - 1 && <LegConnector />}
          </Fragment>
        ))}
      </div>
    );
  }

  return (
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
                  <TableHead className="h-10 min-w-[14rem] px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Documents
                  </TableHead>
                  <TableHead className="h-10 min-w-[12rem] px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Tracking
                  </TableHead>
                </>
              )}
              {showTimelineStatusInTable && (
                <>
                  <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Timeline
                  </TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Status
                  </TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedLegs.map((leg) => {
              const docTypes =
                leg.docTypes ?? leg.documents.map((d) => d.docType);
              const isHighlighted = highlightLegId === leg.id;
              const actionColSpan = isCompact
                ? showTimelineStatusInTable
                  ? 4
                  : 2
                : showTimelineStatusInTable
                  ? 8
                  : 6;

              return (
                <Fragment key={leg.id}>
                  <TableRow
                    id={`courier-leg-${leg.id}`}
                    className={cn(
                      "border-b border-border/60 transition-colors last:border-b-0 hover:bg-teal-50/30",
                      isHighlighted &&
                        "bg-teal-50/50 ring-1 ring-inset ring-teal-300",
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

                    <TableCell className="min-w-[14rem] px-4 py-3 align-top">
                      <CourierRouteDisplay
                        fromLabel={leg.fromAddressLabel}
                        toLabel={leg.toAddressLabel}
                        status={leg.status}
                        variant="inline"
                      />
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

                        <TableCell className="min-w-[14rem] max-w-[16rem] px-4 py-3 align-top">
                          <DocumentTypeTruncatedBadges
                            docTypes={docTypes}
                            maxVisible={3}
                          />
                        </TableCell>

                        <TableCell className="px-4 py-3 align-top">
                          {leg.deliveryMode === DELIVERY_MODE.COURIER &&
                          leg.trackingId ? (
                            <CourierTrackingDisplay
                              courierPartner={leg.courierPartner}
                              trackingId={leg.trackingId}
                            />
                          ) : leg.deliveryMode === DELIVERY_MODE.DIRECT &&
                            leg.sentBy ? (
                            <span className="text-xs text-muted-foreground">
                              By {leg.sentBy.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </>
                    )}

                    {showTimelineStatusInTable && (
                      <>
                        <TableCell className="px-4 py-3 align-top">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {leg.sentAt && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 shrink-0" />
                                <span>
                                  Sent{" "}
                                  {format(new Date(leg.sentAt), "dd MMM yyyy")}
                                </span>
                              </div>
                            )}
                            {leg.status === SHIPMENT_STATUS.RECEIVED &&
                              leg.receivedAt && (
                                <div className="flex items-center gap-1.5 text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  <span>
                                    Received{" "}
                                    {format(
                                      new Date(leg.receivedAt),
                                      "dd MMM yyyy",
                                    )}
                                    {leg.receivedBy?.name &&
                                      ` · ${leg.receivedBy.name}`}
                                    {leg.receivedByName &&
                                      !leg.receivedBy?.name &&
                                      ` · ${leg.receivedByName}`}
                                  </span>
                                </div>
                              )}
                            {!leg.sentAt && !leg.receivedAt && <span>—</span>}
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3 align-top">
                          <ShipmentStatusBadge status={leg.status} />
                        </TableCell>
                      </>
                    )}
                  </TableRow>

                  {showLegActions && (
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
  );
}
