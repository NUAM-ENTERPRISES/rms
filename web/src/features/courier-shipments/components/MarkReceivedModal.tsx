import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Footprints,
  Loader2,
  MapPin,
  PackageCheck,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DocumentTypeTruncatedBadges } from "@/components/molecules";
import { useAppSelector } from "@/app/hooks";
import { useReceiveCourierShipmentMutation } from "../api";
import {
  DELIVERY_MODE,
  DELIVERY_MODE_LABELS,
  SHIPMENT_PURPOSE_LABELS,
} from "../constants";
import {
  markReceivedSchema,
  type MarkReceivedValues,
} from "../schemas/shipment-form.schema";
import type { CourierShipment } from "../types";

export interface MarkReceivedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: CourierShipment;
}

export function MarkReceivedModal({
  open,
  onOpenChange,
  shipment,
}: MarkReceivedModalProps) {
  const { user } = useAppSelector((state) => state.auth);
  const [receive, { isLoading }] = useReceiveCourierShipmentMutation();

  const form = useForm<MarkReceivedValues>({
    resolver: zodResolver(markReceivedSchema),
    defaultValues: {
      receivedAt: new Date().toISOString().slice(0, 16),
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      receivedAt: new Date().toISOString().slice(0, 16),
    });
  }, [open, form]);

  const onSubmit = async (values: MarkReceivedValues) => {
    if (!user?.id) {
      toast.error("You must be logged in to confirm receipt");
      return;
    }

    try {
      await receive({
        id: shipment.id,
        body: {
          receivedAt: new Date(values.receivedAt).toISOString(),
          receivedByUserId: user.id,
        },
      }).unwrap();
      toast.success(`Leg ${shipment.legNumber} marked as received`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to mark as received");
    }
  };

  const docTypes =
    shipment.docTypes ?? shipment.documents?.map((doc) => doc.docType) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[520px]">
        <div className="border-b bg-gradient-to-br from-emerald-50 via-background to-teal-50/40 px-6 py-5">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50">
                <PackageCheck className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  Mark as received
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Confirm delivery for leg {shipment.legNumber}. You will be
                  recorded as the recipient.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-medium">
                Leg {shipment.legNumber}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {SHIPMENT_PURPOSE_LABELS[shipment.purposeType]}
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs">
                {shipment.deliveryMode === DELIVERY_MODE.COURIER ? (
                  <Truck className="h-3 w-3" />
                ) : (
                  <Footprints className="h-3 w-3" />
                )}
                {DELIVERY_MODE_LABELS[shipment.deliveryMode]}
              </Badge>
            </div>

            <div className="flex items-start gap-2 text-sm font-medium">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
              <div className="min-w-0">
                <p className="truncate">{shipment.fromAddressLabel}</p>
                <div className="my-1 flex items-center gap-1 text-muted-foreground">
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span className="text-xs uppercase tracking-wide">
                    Delivered to
                  </span>
                </div>
                <p className="truncate">{shipment.toAddressLabel}</p>
              </div>
            </div>

            {shipment.sentAt && (
              <p className="text-xs text-muted-foreground">
                Sent {format(new Date(shipment.sentAt), "PPp")}
                {shipment.sentBy?.name ? ` · ${shipment.sentBy.name}` : ""}
              </p>
            )}

            {docTypes.length > 0 && (
              <div className="pt-1">
                <DocumentTypeTruncatedBadges
                  docTypes={docTypes}
                  maxVisible={3}
                  badgeVariant="outline"
                />
              </div>
            )}
          </div>

          <form
            id="mark-received-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label
                htmlFor="receivedAt"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                Received date & time
              </Label>
              <Input
                id="receivedAt"
                type="datetime-local"
                className="h-11 bg-background"
                {...form.register("receivedAt")}
              />
              {form.formState.errors.receivedAt && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.receivedAt.message}
                </p>
              )}
            </div>
          </form>
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/20 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            form="mark-received-form"
            disabled={isLoading}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Confirm receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
