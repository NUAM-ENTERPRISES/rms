import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Truck,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectCandidate } from "@/components/molecules";
import { UserSelect } from "@/features/candidates/components/UserSelect";
import { useGetCandidateByIdQuery } from "@/features/candidates/api";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import {
  useCreateCourierShipmentMutation,
  useDispatchCourierShipmentMutation,
  useGetCourierCollectionDocsQuery,
  useGetCourierOfficeAddressesQuery,
  useHandoverCourierShipmentMutation,
} from "../api";
import { CourierAddressFields } from "../components/CourierAddressFields";
import { CourierCollectionSummary } from "../components/CourierCollectionSummary";
import { DeliveryModeToggle } from "../components/DeliveryModeToggle";
import { DocumentSelectionChecklist } from "../components/DocumentSelectionChecklist";
import { SelectedCandidateSummary } from "@/features/original-document-collections/components/SelectedCandidateSummary";
import {
  ADDRESS_TYPE,
  COURIER_PARTNERS,
  DELIVERY_MODE,
  SHIPMENT_PURPOSE,
  WIZARD_STEPS,
} from "../constants";
import type { AddressSnapshot } from "../types";
import { buildCandidateAddressSnapshot } from "../utils/candidate-address";

export default function CreateShipmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canWrite = useCan("write:documents");
  const [step, setStep] = useState(0);

  const [candidateId, setCandidateId] = useState(
    searchParams.get("candidateId") ?? "",
  );
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [purposeType, setPurposeType] = useState<"internal" | "return">(
    SHIPMENT_PURPOSE.INTERNAL,
  );
  const [deliveryMode, setDeliveryMode] = useState<"courier" | "direct">(
    DELIVERY_MODE.COURIER,
  );
  const [fromAddressType, setFromAddressType] = useState(ADDRESS_TYPE.KOCHI);
  const [toAddressType, setToAddressType] = useState(ADDRESS_TYPE.DELHI);
  const [fromSnapshot, setFromSnapshot] = useState<AddressSnapshot>({});
  const [toSnapshot, setToSnapshot] = useState<AddressSnapshot>({});
  const [projectId, setProjectId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [courierPartner, setCourierPartner] = useState<string>(COURIER_PARTNERS[0]);
  const [sentAt, setSentAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [sentByUserId, setSentByUserId] = useState("");
  const [approvedByUserId, setApprovedByUserId] = useState("");

  const fromSnapshotEdited = useRef(false);
  const toSnapshotEdited = useRef(false);

  const { data: candidate } = useGetCandidateByIdQuery(candidateId, {
    skip: !candidateId,
  });

  const { data: docsData } = useGetCourierCollectionDocsQuery(candidateId, {
    skip: !candidateId,
  });
  const { data: officeData } = useGetCourierOfficeAddressesQuery();
  const officePresets = officeData?.data ?? {};

  const [createShipment, { isLoading: creating }] =
    useCreateCourierShipmentMutation();
  const [dispatchShipment, { isLoading: dispatching }] =
    useDispatchCourierShipmentMutation();
  const [handoverShipment, { isLoading: handingOver }] =
    useHandoverCourierShipmentMutation();

  const availableDocs =
    docsData?.data?.cumulativeReceived.map((d) => d.docType) ?? [];
  const isLoading = creating || dispatching || handingOver;

  useEffect(() => {
    setDocTypes([]);
    fromSnapshotEdited.current = false;
    toSnapshotEdited.current = false;
  }, [candidateId]);

  useEffect(() => {
    if (!candidate) return;
    const snapshot = buildCandidateAddressSnapshot(candidate);
    if (
      fromAddressType === ADDRESS_TYPE.CANDIDATE &&
      !fromSnapshotEdited.current
    ) {
      setFromSnapshot(snapshot);
    }
    if (toAddressType === ADDRESS_TYPE.CANDIDATE && !toSnapshotEdited.current) {
      setToSnapshot(snapshot);
    }
  }, [candidate, fromAddressType, toAddressType, candidateId]);

  const handleFromSnapshotChange = (snapshot: AddressSnapshot) => {
    fromSnapshotEdited.current = true;
    setFromSnapshot(snapshot);
  };

  const handleToSnapshotChange = (snapshot: AddressSnapshot) => {
    toSnapshotEdited.current = true;
    setToSnapshot(snapshot);
  };

  const handleFromAddressTypeChange = (type: typeof fromAddressType) => {
    fromSnapshotEdited.current = false;
    setFromAddressType(type);
    if (type === ADDRESS_TYPE.CANDIDATE && candidate) {
      setFromSnapshot(buildCandidateAddressSnapshot(candidate));
    }
  };

  const handleToAddressTypeChange = (type: typeof toAddressType) => {
    toSnapshotEdited.current = false;
    setToAddressType(type);
    if (type === ADDRESS_TYPE.CANDIDATE && candidate) {
      setToSnapshot(buildCandidateAddressSnapshot(candidate));
    }
  };

  if (!canWrite) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        You do not have permission to create courier legs.
      </p>
    );
  }

  const validateStep = (): boolean => {
    if (step === 0 && !candidateId) {
      toast.error("Select a candidate");
      return false;
    }
    if (step === 1 && docTypes.length === 0) {
      toast.error("Select at least one document");
      return false;
    }
    if (step === 3) {
      if (!sentByUserId || !approvedByUserId) {
        toast.error("Select sent-by and approved-by users");
        return false;
      }
      if (deliveryMode === DELIVERY_MODE.COURIER && !trackingId.trim()) {
        toast.error("Enter tracking ID");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    try {
      const created = await createShipment({
        candidateId,
        projectId: projectId || undefined,
        purposeType,
        deliveryMode,
        fromAddressType,
        toAddressType,
        fromAddressSnapshot: fromSnapshot,
        toAddressSnapshot: toSnapshot,
        docTypes,
        remarks: remarks || undefined,
      }).unwrap();

      const id = created.data.id;
      if (deliveryMode === DELIVERY_MODE.COURIER) {
        await dispatchShipment({
          id,
          body: {
            trackingId,
            courierPartner,
            sentAt: new Date(sentAt).toISOString(),
            sentByUserId,
            approvedByUserId,
          },
        }).unwrap();
      } else {
        await handoverShipment({
          id,
          body: {
            sentAt: new Date(sentAt).toISOString(),
            sentByUserId,
            approvedByUserId,
          },
        }).unwrap();
      }

      toast.success(`Leg ${created.data.legNumber} created successfully`);
      navigate(
        `/courier-management/candidates/${created.data.candidateId}?leg=${id}`,
      );
    } catch {
      toast.error("Failed to create courier leg");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/courier-management" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-teal-600" />
            New Courier Leg
          </h1>
          <p className="text-sm text-muted-foreground">
            Record a document movement between offices or client
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                i < step && "bg-emerald-500 text-white",
                i === step && "bg-teal-600 text-white",
                i > step && "bg-muted text-muted-foreground",
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="hidden sm:inline text-xs font-medium">{s.label}</span>
            {i < WIZARD_STEPS.length - 1 && (
              <div className="h-px flex-1 bg-border" />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{WIZARD_STEPS[step].label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 0 && (
            <div className="space-y-4">
              <SelectCandidate
                label="Search candidate"
                required
                value={candidateId}
                onValueChange={setCandidateId}
              />
              {candidateId ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <SelectedCandidateSummary
                    candidateId={candidateId}
                    subtitle="Selected for courier leg"
                    showMailingAddress
                  />
                  <CourierCollectionSummary candidateId={candidateId} />
                </motion.div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Search and select a candidate to view their details and
                  available original documents.
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <DocumentSelectionChecklist
              availableDocTypes={availableDocs}
              selected={docTypes}
              onChange={setDocTypes}
            />
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPurposeType(SHIPMENT_PURPOSE.INTERNAL)}
                  className={cn(
                    "rounded-xl border p-3 text-sm font-medium",
                    purposeType === SHIPMENT_PURPOSE.INTERNAL &&
                      "border-blue-300 bg-blue-50",
                  )}
                >
                  Internal
                </button>
                <button
                  type="button"
                  onClick={() => setPurposeType(SHIPMENT_PURPOSE.RETURN)}
                  className={cn(
                    "rounded-xl border p-3 text-sm font-medium",
                    purposeType === SHIPMENT_PURPOSE.RETURN &&
                      "border-violet-300 bg-violet-50",
                  )}
                >
                  Return
                </button>
              </div>

              <DeliveryModeToggle
                value={deliveryMode}
                onChange={setDeliveryMode}
              />

              <div className="flex items-center justify-center gap-3 py-2">
                <div className="flex-1 rounded-xl border p-4">
                  <CourierAddressFields
                    label="From"
                    addressType={fromAddressType}
                    snapshot={fromSnapshot}
                    officePresets={officePresets}
                    onAddressTypeChange={handleFromAddressTypeChange}
                    onSnapshotChange={handleFromSnapshotChange}
                  />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 rounded-xl border p-4">
                  <CourierAddressFields
                    label="To"
                    addressType={toAddressType}
                    snapshot={toSnapshot}
                    officePresets={officePresets}
                    onAddressTypeChange={handleToAddressTypeChange}
                    onSnapshotChange={handleToSnapshotChange}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="remarks">Remarks (optional)</Label>
                <Input
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-1">
                <p>
                  <strong>Documents:</strong> {docTypes.length} selected
                </p>
                <p>
                  <strong>Route:</strong> {fromAddressType} → {toAddressType}
                </p>
                <p>
                  <strong>Mode:</strong> {deliveryMode}
                </p>
              </div>

              <div>
                <Label htmlFor="sentAt">
                  {deliveryMode === DELIVERY_MODE.COURIER
                    ? "Dispatch date"
                    : "Handover date"}
                </Label>
                <Input
                  id="sentAt"
                  type="datetime-local"
                  value={sentAt}
                  onChange={(e) => setSentAt(e.target.value)}
                />
              </div>

              {deliveryMode === DELIVERY_MODE.COURIER && (
                <>
                  <div>
                    <Label htmlFor="trackingId">Tracking ID</Label>
                    <Input
                      id="trackingId"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Courier partner</Label>
                    <Select
                      value={courierPartner}
                      onValueChange={setCourierPartner}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COURIER_PARTNERS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div>
                <Label>
                  {deliveryMode === DELIVERY_MODE.COURIER
                    ? "Sent by"
                    : "Handed over by"}
                </Label>
                <UserSelect
                  value={sentByUserId}
                  onChange={setSentByUserId}
                />
              </div>
              <div>
                <Label>Approved by</Label>
                <UserSelect
                  value={approvedByUserId}
                  onChange={setApprovedByUserId}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          Back
        </Button>
        {step < WIZARD_STEPS.length - 1 ? (
          <Button onClick={handleNext}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {deliveryMode === DELIVERY_MODE.COURIER
              ? "Dispatch Courier"
              : "Confirm Handover"}
          </Button>
        )}
      </div>
    </div>
  );
}
