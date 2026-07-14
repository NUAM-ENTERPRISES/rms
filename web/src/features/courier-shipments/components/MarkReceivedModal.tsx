import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  Eye,
  Footprints,
  Loader2,
  PackageCheck,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CourierRouteDisplay } from "./CourierRouteDisplay";
import {
  ReceiveDocumentVerificationChecklist,
  getReceiveReviewBlockReason,
  getReceiveReviewCounts,
  isReceiveReviewComplete,
  toVerifiedDocumentsPayload,
  type ReceiveDocumentVerificationItem,
} from "./ReceiveDocumentVerificationChecklist";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { useAppSelector } from "@/app/hooks";
import { useReceiveCourierShipmentMutation } from "../api";
import {
  DELIVERY_MODE,
  DELIVERY_MODE_LABELS,
  SHIPMENT_PURPOSE_LABELS,
} from "../constants";
import {
  createMarkReceivedSchema,
  type MarkReceivedValues,
} from "../schemas/shipment-form.schema";
import type { CourierShipment } from "../types";

export interface MarkReceivedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: CourierShipment;
}

function buildDefaultVerificationItems(
  docTypes: string[],
): ReceiveDocumentVerificationItem[] {
  return docTypes.map((docType) => ({
    docType,
    isVerified: false,
    remarks: "",
  }));
}

export function MarkReceivedModal({
  open,
  onOpenChange,
  shipment,
}: MarkReceivedModalProps) {
  const { user } = useAppSelector((state) => state.auth);
  const [receive, { isLoading }] = useReceiveCourierShipmentMutation();
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [verificationItems, setVerificationItems] = useState<
    ReceiveDocumentVerificationItem[]
  >([]);

  const docTypes = useMemo(
    () =>
      shipment.docTypes ??
      shipment.documents?.map((doc) => doc.docType) ??
      [],
    [shipment.docTypes, shipment.documents],
  );

  const markReceivedSchema = useMemo(
    () => createMarkReceivedSchema(docTypes),
    [docTypes],
  );

  const form = useForm<MarkReceivedValues>({
    resolver: zodResolver(markReceivedSchema),
    defaultValues: {
      receivedAt: new Date().toISOString().slice(0, 16),
      verifiedDocuments: [],
    },
  });

  useEffect(() => {
    if (!open) return;
    const defaults = buildDefaultVerificationItems(docTypes);
    setVerificationItems(defaults);
    form.reset({
      receivedAt: new Date().toISOString().slice(0, 16),
      verifiedDocuments: [],
    });
  }, [open, docTypes, form]);

  const reviewComplete = isReceiveReviewComplete(docTypes, verificationItems);
  const { arrivedCount, notArrivedCount } = getReceiveReviewCounts(
    docTypes,
    verificationItems,
  );
  const confirmDisabled = isLoading || !reviewComplete;
  const confirmDisabledReason = getReceiveReviewBlockReason(
    docTypes,
    verificationItems,
  );

  const onSubmit = async (values: MarkReceivedValues) => {
    if (!user?.id) {
      toast.error("You must be logged in to confirm receipt");
      return;
    }

    if (!reviewComplete) {
      toast.error(
        confirmDisabledReason ??
          "Add remarks for documents that did not arrive",
      );
      return;
    }

    const verifiedDocuments = toVerifiedDocumentsPayload(verificationItems);

    try {
      await receive({
        id: shipment.id,
        body: {
          receivedAt: new Date(values.receivedAt).toISOString(),
          receivedByUserId: user.id,
          verifiedDocuments,
        },
      }).unwrap();
      toast.success(`Leg ${shipment.legNumber} marked as received`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to mark as received");
    }
  };

  const hasPdf = Boolean(shipment.mergedDocument?.fileUrl);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(88vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px]">
          <div className="shrink-0 border-b bg-gradient-to-br from-emerald-50 via-background to-teal-50/40 px-5 py-3.5">
            <DialogHeader className="space-y-0 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-2 ring-emerald-50">
                  <PackageCheck className="h-4 w-4 text-emerald-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    Mark as received
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Cross-check each document for leg {shipment.legNumber}.
                    Check arrived documents and add remarks for any that did
                    not arrive.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
              <Badge variant="outline" className="text-[10px] font-medium">
                Leg {shipment.legNumber}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {SHIPMENT_PURPOSE_LABELS[shipment.purposeType]}
              </Badge>
              <Badge variant="secondary" className="gap-1 text-[10px]">
                {shipment.deliveryMode === DELIVERY_MODE.COURIER ? (
                  <Truck className="h-3 w-3" />
                ) : (
                  <Footprints className="h-3 w-3" />
                )}
                {DELIVERY_MODE_LABELS[shipment.deliveryMode]}
              </Badge>
              <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                <CourierRouteDisplay
                  fromLabel={shipment.fromAddressLabel}
                  toLabel={shipment.toAddressLabel}
                  status={shipment.status}
                />
              </div>
              {shipment.sentAt && (
                <p className="basis-full text-[11px] text-muted-foreground sm:basis-auto sm:ml-auto">
                  Sent {format(new Date(shipment.sentAt), "dd MMM yyyy")}
                  {shipment.sentBy?.name ? ` · ${shipment.sentBy.name}` : ""}
                </p>
              )}
              {hasPdf && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowPdfViewer(true)}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  PDF
                </Button>
              )}
            </div>

            <ReceiveDocumentVerificationChecklist
              docTypes={docTypes}
              items={verificationItems}
              onChange={(items) => {
                setVerificationItems(items);
                form.setValue(
                  "verifiedDocuments",
                  toVerifiedDocumentsPayload(items),
                  { shouldValidate: true },
                );
              }}
              disabled={isLoading}
              error={
                form.formState.errors.verifiedDocuments?.message as
                  | string
                  | undefined
              }
            />

            <form
              id="mark-received-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="rounded-lg border bg-muted/10 px-3 py-2.5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Label
                  htmlFor="receivedAt"
                  className="flex shrink-0 items-center gap-1.5 text-xs font-medium"
                >
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                  Received date & time
                </Label>
                <Input
                  id="receivedAt"
                  type="datetime-local"
                  className="h-9 bg-background sm:max-w-xs"
                  {...form.register("receivedAt")}
                />
              </div>
              {form.formState.errors.receivedAt && (
                <p className="mt-1.5 text-xs text-destructive">
                  {form.formState.errors.receivedAt.message}
                </p>
              )}
            </form>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-muted/20 px-5 py-3 sm:justify-between">
            <p className="hidden text-xs text-muted-foreground sm:block">
              {reviewComplete
                ? `${arrivedCount} arrived · ${notArrivedCount} not arrived — ready to confirm`
                : `${arrivedCount} arrived · ${notArrivedCount} not arrived`}
            </p>
            <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      type="submit"
                      form="mark-received-form"
                      size="sm"
                      disabled={confirmDisabled}
                      aria-disabled={confirmDisabled}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:pointer-events-none"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      )}
                      Confirm receipt
                    </Button>
                  </span>
                </TooltipTrigger>
                {confirmDisabledReason ? (
                  <TooltipContent side="top" className="max-w-xs">
                    {confirmDisabledReason}
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {hasPdf && shipment.mergedDocument && (
        <PDFViewer
          fileUrl={shipment.mergedDocument.fileUrl}
          fileName={shipment.mergedDocument.fileName}
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
        />
      )}
    </>
  );
}
