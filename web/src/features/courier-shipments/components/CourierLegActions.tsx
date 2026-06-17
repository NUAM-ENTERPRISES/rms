import { useState } from "react";
import { format } from "date-fns";
import { Calendar, CheckCircle2, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSelect } from "@/features/candidates/components/UserSelect";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { useCan } from "@/hooks/useCan";
import {
  useDispatchCourierShipmentMutation,
  useHandoverCourierShipmentMutation,
} from "../api";
import {
  COURIER_PARTNERS,
  DELIVERY_MODE,
  SHIPMENT_STATUS,
} from "../constants";
import type { CourierShipment } from "../types";
import { MarkReceivedModal } from "./MarkReceivedModal";
import { ShipmentStatusBadge } from "./ShipmentStatusBadge";

interface CourierLegActionsProps {
  leg: CourierShipment;
}

export function CourierLegActions({ leg }: CourierLegActionsProps) {
  const canWrite = useCan("write:documents");
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showMarkReceived, setShowMarkReceived] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [courierPartner, setCourierPartner] = useState<string>(COURIER_PARTNERS[0]);
  const [sentAt, setSentAt] = useState(new Date().toISOString().slice(0, 16));
  const [sentByUserId, setSentByUserId] = useState("");
  const [approvedByUserId, setApprovedByUserId] = useState("");

  const [dispatch, { isLoading: dispatching }] =
    useDispatchCourierShipmentMutation();
  const [handover, { isLoading: handingOver }] =
    useHandoverCourierShipmentMutation();

  const isDraft = leg.status === SHIPMENT_STATUS.DRAFT;
  const isInTransit = leg.status === SHIPMENT_STATUS.IN_TRANSIT;
  const hasPdf = Boolean(leg.mergedDocument?.fileUrl);
  const canMarkReceived = canWrite && isInTransit;

  const handleDispatch = async () => {
    try {
      await dispatch({
        id: leg.id,
        body: {
          trackingId,
          courierPartner,
          sentAt: new Date(sentAt).toISOString(),
          sentByUserId,
          approvedByUserId,
        },
      }).unwrap();
      toast.success("Courier dispatched");
    } catch {
      toast.error("Dispatch failed");
    }
  };

  const handleHandover = async () => {
    try {
      await handover({
        id: leg.id,
        body: {
          sentAt: new Date(sentAt).toISOString(),
          sentByUserId,
          approvedByUserId,
        },
      }).unwrap();
      toast.success("Handover confirmed");
    } catch {
      toast.error("Handover failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Timeline
          </p>
          <div className="space-y-1 text-xs text-muted-foreground">
            {leg.sentAt && leg.status !== SHIPMENT_STATUS.DRAFT && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>
                  Sent {format(new Date(leg.sentAt), "dd MMM yyyy")}
                  {leg.sentBy?.name && ` · ${leg.sentBy.name}`}
                </span>
              </div>
            )}
            {leg.status === SHIPMENT_STATUS.RECEIVED && leg.receivedAt && (
              <div className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>
                  Received {format(new Date(leg.receivedAt), "dd MMM yyyy")}
                  {leg.receivedBy?.name && ` · ${leg.receivedBy.name}`}
                  {leg.receivedByName &&
                    !leg.receivedBy?.name &&
                    ` · ${leg.receivedByName}`}
                </span>
              </div>
            )}
            {!leg.sentAt && !leg.receivedAt && <span>—</span>}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <ShipmentStatusBadge status={leg.status} />
        </div>
      </div>

      {leg.lockerFileNumber && (
        <p className="text-xs text-muted-foreground">
          Locker file: <span className="font-medium">{leg.lockerFileNumber}</span>
        </p>
      )}

      {(hasPdf || canMarkReceived) && (
        <div className="flex flex-wrap items-center gap-1">
          {hasPdf && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setShowPdfViewer(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View merged PDF
            </Button>
          )}
          {canMarkReceived && (
            <Button
              size="sm"
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setShowMarkReceived(true)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as received
            </Button>
          )}
        </div>
      )}

      {canWrite && isDraft && (
        <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {leg.deliveryMode === DELIVERY_MODE.COURIER
              ? "Dispatch courier"
              : "Confirm handover"}
          </p>
          <div>
            <Label htmlFor={`leg-${leg.id}-sentAt`}>Date</Label>
            <Input
              id={`leg-${leg.id}-sentAt`}
              type="datetime-local"
              value={sentAt}
              onChange={(e) => setSentAt(e.target.value)}
            />
          </div>
          {leg.deliveryMode === DELIVERY_MODE.COURIER && (
            <>
              <div>
                <Label htmlFor={`leg-${leg.id}-tracking`}>Tracking ID</Label>
                <Input
                  id={`leg-${leg.id}-tracking`}
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                />
              </div>
              <div>
                <Label>Courier partner</Label>
                <Select value={courierPartner} onValueChange={setCourierPartner}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURIER_PARTNERS.map((partner) => (
                      <SelectItem key={partner} value={partner}>
                        {partner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div>
            <Label>Sent / handed over by</Label>
            <UserSelect value={sentByUserId} onChange={setSentByUserId} />
          </div>
          <div>
            <Label>Approved by</Label>
            <UserSelect value={approvedByUserId} onChange={setApprovedByUserId} />
          </div>
          <Button
            size="sm"
            onClick={
              leg.deliveryMode === DELIVERY_MODE.COURIER
                ? handleDispatch
                : handleHandover
            }
            disabled={dispatching || handingOver}
          >
            {(dispatching || handingOver) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {leg.deliveryMode === DELIVERY_MODE.COURIER
              ? "Dispatch"
              : "Confirm handover"}
          </Button>
        </div>
      )}

      {leg.mergedDocument?.fileUrl && (
        <PDFViewer
          fileUrl={leg.mergedDocument.fileUrl}
          fileName={leg.mergedDocument.fileName}
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
        />
      )}

      {canMarkReceived && (
        <MarkReceivedModal
          open={showMarkReceived}
          onOpenChange={setShowMarkReceived}
          shipment={leg}
        />
      )}
    </div>
  );
}
