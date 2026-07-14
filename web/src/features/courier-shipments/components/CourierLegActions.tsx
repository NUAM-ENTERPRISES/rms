import { useState } from "react";
import { format } from "date-fns";
import { Calendar, CheckCircle2, Eye, Loader2, Truck } from "lucide-react";
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
import { cn } from "@/lib/utils";
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
import { buildDispatchPayload } from "../utils/courierTrackingPayload";
import {
  firstShipmentUserFieldError,
  validateShipmentUserFields,
  type ShipmentUserFieldErrors,
} from "../utils/validateShipmentUserFields";
import { MarkReceivedModal } from "./MarkReceivedModal";
import { ShipmentStatusBadge } from "./ShipmentStatusBadge";
import { UpdateCourierTrackingModal } from "./UpdateCourierTrackingModal";

interface CourierLegActionsProps {
  leg: CourierShipment;
}

export function CourierLegActions({ leg }: CourierLegActionsProps) {
  const canWrite = useCan("write:courier_management");
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showMarkReceived, setShowMarkReceived] = useState(false);
  const [showUpdateTracking, setShowUpdateTracking] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [courierPartner, setCourierPartner] = useState<string>(COURIER_PARTNERS[0]);
  const [sentAt, setSentAt] = useState(new Date().toISOString().slice(0, 16));
  const [sentByUserId, setSentByUserId] = useState("");
  const [approvedByUserId, setApprovedByUserId] = useState("");
  const [userFieldErrors, setUserFieldErrors] = useState<ShipmentUserFieldErrors>(
    {},
  );

  const [dispatch, { isLoading: dispatching }] =
    useDispatchCourierShipmentMutation();
  const [handover, { isLoading: handingOver }] =
    useHandoverCourierShipmentMutation();

  const isDraft = leg.status === SHIPMENT_STATUS.DRAFT;
  const isInTransit = leg.status === SHIPMENT_STATUS.IN_TRANSIT;
  const isCourier = leg.deliveryMode === DELIVERY_MODE.COURIER;
  const hasPdf = Boolean(leg.mergedDocument?.fileUrl);
  const canMarkReceived = canWrite && isInTransit;
  const canUpdateTracking = canWrite && isInTransit && isCourier;

  const validateUsers = (): boolean => {
    const { errors, valid } = validateShipmentUserFields(
      sentByUserId,
      approvedByUserId,
      leg.deliveryMode,
    );
    setUserFieldErrors(errors);
    if (!valid) {
      toast.error(
        firstShipmentUserFieldError(errors) ??
          "Complete required dispatch fields",
      );
    }
    return valid;
  };

  const handleDispatch = async () => {
    if (!validateUsers()) return;

    try {
      await dispatch({
        id: leg.id,
        body: buildDispatchPayload({
          trackingId,
          courierPartner,
          sentAt: new Date(sentAt).toISOString(),
          sentByUserId,
          approvedByUserId,
        }),
      }).unwrap();
      toast.success("Courier dispatched");
    } catch {
      toast.error("Dispatch failed");
    }
  };

  const handleHandover = async () => {
    if (!validateUsers()) return;

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

      {(hasPdf || canMarkReceived || canUpdateTracking) && (
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
          {canUpdateTracking && (
            <Button
              size="sm"
              type="button"
              onClick={() => setShowUpdateTracking(true)}
              className="border-amber-200/80 bg-gradient-to-r from-amber-50 to-sky-50 text-amber-900 shadow-sm hover:border-amber-300 hover:from-amber-100 hover:to-sky-100"
            >
              <Truck className="mr-2 h-4 w-4 text-amber-600" />
              Update tracking
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
                <Label htmlFor={`leg-${leg.id}-tracking`}>
                  Tracking ID{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id={`leg-${leg.id}-tracking`}
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="Add later if not available yet"
                />
              </div>
              <div>
                <Label>
                  Courier partner{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
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
            <Label>
              Sent / handed over by{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div
              className={cn(
                "mt-1.5",
                userFieldErrors.sentByUserId && "[&_button]:border-destructive",
              )}
            >
              <UserSelect
                value={sentByUserId}
                onChange={(value) => {
                  setSentByUserId(value);
                  if (value.trim()) {
                    setUserFieldErrors((prev) => ({
                      ...prev,
                      sentByUserId: undefined,
                    }));
                  }
                }}
              />
            </div>
            {userFieldErrors.sentByUserId ? (
              <p className="mt-1.5 text-xs text-destructive" role="alert">
                {userFieldErrors.sentByUserId}
              </p>
            ) : null}
          </div>
          <div>
            <Label>
              Approved by <span className="text-destructive">*</span>
            </Label>
            <div
              className={cn(
                "mt-1.5",
                userFieldErrors.approvedByUserId &&
                  "[&_button]:border-destructive",
              )}
            >
              <UserSelect
                value={approvedByUserId}
                onChange={(value) => {
                  setApprovedByUserId(value);
                  if (value.trim()) {
                    setUserFieldErrors((prev) => ({
                      ...prev,
                      approvedByUserId: undefined,
                    }));
                  }
                }}
              />
            </div>
            {userFieldErrors.approvedByUserId ? (
              <p className="mt-1.5 text-xs text-destructive" role="alert">
                {userFieldErrors.approvedByUserId}
              </p>
            ) : null}
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

      {canUpdateTracking && (
        <UpdateCourierTrackingModal
          open={showUpdateTracking}
          onOpenChange={setShowUpdateTracking}
          leg={leg}
        />
      )}
    </div>
  );
}
