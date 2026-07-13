import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, MapPin, Save, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateCourierTrackingMutation } from "../api";
import { COURIER_PARTNERS } from "../constants";
import type { CourierShipment } from "../types";
import { buildCourierTrackingUpdatePayload } from "../utils/courierTrackingPayload";
import { CourierPartnerFields } from "./CourierPartnerFields";
import { CourierRouteDisplay } from "./CourierRouteDisplay";

interface UpdateCourierTrackingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leg: CourierShipment;
}

export function UpdateCourierTrackingModal({
  open,
  onOpenChange,
  leg,
}: UpdateCourierTrackingModalProps) {
  const [trackingId, setTrackingId] = useState(leg.trackingId ?? "");
  const [courierPartner, setCourierPartner] = useState(
    leg.courierPartner ?? COURIER_PARTNERS[0],
  );
  const [updateTracking, { isLoading }] = useUpdateCourierTrackingMutation();

  useEffect(() => {
    if (!open) return;
    setTrackingId(leg.trackingId ?? "");
    setCourierPartner(leg.courierPartner ?? COURIER_PARTNERS[0]);
  }, [open, leg.trackingId, leg.courierPartner]);

  const handleSave = async () => {
    const payload = buildCourierTrackingUpdatePayload({
      trackingId,
      courierPartner,
    });
    if (!payload.trackingId && !payload.courierPartner) {
      toast.error("Enter a tracking ID and/or select a courier partner");
      return;
    }

    try {
      await updateTracking({ id: leg.id, body: payload }).unwrap();
      toast.success("Courier tracking updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update courier tracking");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[520px]">
        <div className="relative border-b bg-gradient-to-br from-amber-50 via-background to-sky-50/70 px-6 py-5">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-300/25 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-sky-300/20 blur-2xl"
            aria-hidden
          />

          <DialogHeader className="relative space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md ring-4 ring-amber-100">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="text-xl font-semibold tracking-tight text-amber-950">
                  Update courier tracking
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Add or change tracking details for leg {leg.legNumber} while
                  it is in transit.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-3 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/50 via-background to-sky-50/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-xs font-medium text-amber-800"
              >
                Leg {leg.legNumber}
              </Badge>
              {leg.courierPartner && !leg.trackingId && (
                <Badge className="border-amber-200/60 bg-amber-100 text-[10px] text-amber-800 hover:bg-amber-100">
                  Tracking pending
                </Badge>
              )}
            </div>

            <CourierRouteDisplay
              fromLabel={leg.fromAddressLabel}
              toLabel={leg.toAddressLabel}
              status={leg.status}
            />

            {leg.sentAt && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                Sent {format(new Date(leg.sentAt), "PPp")}
                {leg.sentBy?.name ? ` · ${leg.sentBy.name}` : ""}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800/80">
              Tracking details
            </p>
            <CourierPartnerFields
              trackingId={trackingId}
              courierPartner={courierPartner}
              onTrackingIdChange={setTrackingId}
              onCourierPartnerChange={setCourierPartner}
              tone="accent"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-amber-100/80 bg-gradient-to-r from-amber-50/40 via-background to-sky-50/40 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-slate-200"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:from-amber-600 hover:to-orange-600"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save tracking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
