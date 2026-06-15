import { useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Copy,
  Footprints,
  MapPin,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DELIVERY_MODE,
  DELIVERY_MODE_LABELS,
  SHIPMENT_PURPOSE_LABELS,
  SHIPMENT_STATUS,
} from "../constants";
import type { CourierShipment } from "../types";
import { ShipmentStatusBadge } from "./ShipmentStatusBadge";
import { MarkReceivedModal } from "./MarkReceivedModal";
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

function getLineColor(status: string) {
  if (status === SHIPMENT_STATUS.RECEIVED) return "from-emerald-400 to-emerald-200";
  if (status === SHIPMENT_STATUS.IN_TRANSIT) return "from-amber-400 to-amber-200";
  return "from-slate-300 to-slate-200";
}

export function CandidateCourierPipeline({
  legs,
  variant = "full",
  order = "oldest-first",
  showLegActions = false,
  highlightLegId = null,
  onAddLeg,
}: CandidateCourierPipelineProps) {
  const [receiveLegId, setReceiveLegId] = useState<string | null>(null);
  const receiveLeg = legs.find((l) => l.id === receiveLegId);

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
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No courier legs recorded yet.
        {onAddLeg && (
          <Button type="button" variant="link" onClick={onAddLeg} className="mt-2">
            Create first leg
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-0", variant === "compact" && "text-sm")}>
        {sortedLegs.map((leg, index) => {
          const isLast = index === sortedLegs.length - 1;
          const isLatest = order === "newest-first" ? index === 0 : isLast;
          const purposeStrip =
            leg.purposeType === "return"
              ? "from-violet-500/10 to-violet-50"
              : "from-blue-500/10 to-blue-50";
          const pulse =
            isLatest && leg.status === SHIPMENT_STATUS.IN_TRANSIT;

          return (
            <motion.div
              key={leg.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
              className="flex gap-4"
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background text-xs font-bold shadow-sm",
                    leg.status === SHIPMENT_STATUS.RECEIVED &&
                      "border-emerald-400 text-emerald-700",
                    leg.status === SHIPMENT_STATUS.IN_TRANSIT &&
                      "border-amber-400 text-amber-700",
                    leg.status === SHIPMENT_STATUS.DRAFT &&
                      "border-slate-300 text-slate-600",
                    pulse && "animate-pulse",
                  )}
                >
                  {leg.legNumber}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-8 bg-gradient-to-b my-1",
                      getLineColor(leg.status),
                    )}
                  />
                )}
              </div>

              <div
                id={`courier-leg-${leg.id}`}
                className={cn(
                  "flex-1 rounded-2xl border shadow-sm mb-4 overflow-hidden",
                  variant === "compact" && "mb-3",
                  highlightLegId === leg.id && "ring-2 ring-teal-400",
                )}
              >
                <div
                  className={cn(
                    "px-4 py-2 bg-gradient-to-r border-b",
                    purposeStrip,
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold">
                      Leg {leg.legNumber}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {SHIPMENT_PURPOSE_LABELS[leg.purposeType]}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      {leg.deliveryMode === DELIVERY_MODE.COURIER ? (
                        <Truck className="h-3 w-3" />
                      ) : (
                        <Footprints className="h-3 w-3" />
                      )}
                      {DELIVERY_MODE_LABELS[leg.deliveryMode]}
                    </Badge>
                    {leg.sentAt && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {format(new Date(leg.sentAt), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>{leg.fromAddressLabel}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span>{leg.toAddressLabel}</span>
                  </div>

                  {leg.deliveryMode === DELIVERY_MODE.COURIER &&
                    leg.trackingId && (
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                          {leg.courierPartner} · {leg.trackingId}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Copy tracking ID"
                          onClick={() => copyTracking(leg.trackingId!)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                  {leg.deliveryMode === DELIVERY_MODE.DIRECT && leg.sentBy && (
                    <p className="text-xs text-muted-foreground">
                      Handed over by {leg.sentBy.name}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {(leg.docTypes ?? leg.documents.map((d) => d.docType)).map(
                      (docType) => (
                        <Badge
                          key={docType}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {getDocumentTypeConfig(docType)?.label ?? docType}
                        </Badge>
                      ),
                    )}
                  </div>

                  {leg.status === SHIPMENT_STATUS.RECEIVED && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Received
                      {leg.receivedAt &&
                        ` · ${format(new Date(leg.receivedAt), "MMM d, yyyy")}`}
                      {leg.receivedBy?.name && ` by ${leg.receivedBy.name}`}
                      {leg.receivedByName && ` by ${leg.receivedByName}`}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <ShipmentStatusBadge status={leg.status} />
                    {leg.status === SHIPMENT_STATUS.IN_TRANSIT && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setReceiveLegId(leg.id)}
                      >
                        Mark received
                      </Button>
                    )}
                  </div>

                  {showLegActions && <CourierLegActions leg={leg} />}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {receiveLeg && (
        <MarkReceivedModal
          open={Boolean(receiveLegId)}
          onOpenChange={(open) => !open && setReceiveLegId(null)}
          shipment={receiveLeg}
        />
      )}
    </>
  );
}
