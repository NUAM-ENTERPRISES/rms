import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  ClipboardCheck,
  Hash,
  Check,
  FileText,
  Footprints,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  Send,
  Truck,
  ShieldCheck,
  User,
  UserSearch,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useUsersLookup } from "@/shared/hooks/useUsersLookup";
import { cn } from "@/lib/utils";
import { getDocumentTypeConfig } from "@/constants/document-types";
import {
  useCreateCourierShipmentMutation,
  useDispatchCourierShipmentMutation,
  useGetCourierCollectionDocsQuery,
  useGetCourierOfficeAddressesQuery,
  useHandoverCourierShipmentMutation,
} from "../api";
import { CourierAddressFields } from "../components/CourierAddressFields";
import { CourierCollectionSummary } from "../components/CourierCollectionSummary";
import { DispatchSuccessAnimation } from "../components/DispatchSuccessAnimation";
import { DeliveryModeToggle } from "../components/DeliveryModeToggle";
import { DocumentSelectionChecklist } from "../components/DocumentSelectionChecklist";
import { SelectedCandidateSummary } from "@/features/original-document-collections/components/SelectedCandidateSummary";
import {
  ADDRESS_TYPE,
  ADDRESS_TYPE_LABELS,
  COURIER_PARTNERS,
  DELIVERY_MODE,
  DELIVERY_MODE_LABELS,
  SHIPMENT_PURPOSE,
  SHIPMENT_PURPOSE_LABELS,
  WIZARD_STEPS,
} from "../constants";
import type { AddressType } from "../constants";
import type { AddressSnapshot } from "../types";
import { buildCandidateAddressSnapshot } from "../utils/candidate-address";

export default function CreateShipmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canWrite = useCan("write:documents");
  const [step, setStep] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dispatchAnimating, setDispatchAnimating] = useState(false);
  const [dispatchUiPhase, setDispatchUiPhase] = useState<
    "idle" | "processing" | "success"
  >("idle");
  const createdShipmentRef = useRef<{
    candidateId: string;
    legId: string;
  } | null>(null);

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
  const [fromAddressType, setFromAddressType] = useState<AddressType>(
    ADDRESS_TYPE.KOCHI,
  );
  const [toAddressType, setToAddressType] = useState<AddressType>(
    ADDRESS_TYPE.DELHI,
  );
  const [fromSnapshot, setFromSnapshot] = useState<AddressSnapshot>({});
  const [toSnapshot, setToSnapshot] = useState<AddressSnapshot>({});
  const projectId = "";
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
  const { getUserById } = useUsersLookup();
  const sentByName = getUserById(sentByUserId)?.name ?? "—";
  const approvedByName = getUserById(approvedByUserId)?.name ?? "—";

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

  const handleFromAddressTypeChange = (type: AddressType) => {
    fromSnapshotEdited.current = false;
    setFromAddressType(type);
    if (type === ADDRESS_TYPE.CANDIDATE && candidate) {
      setFromSnapshot(buildCandidateAddressSnapshot(candidate));
    }
  };

  const handleToAddressTypeChange = (type: AddressType) => {
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

  const formatSnapshotLine = (snapshot: AddressSnapshot): string => {
    const parts = [
      snapshot.label,
      snapshot.address,
      snapshot.pincode ? `PIN ${snapshot.pincode}` : undefined,
      snapshot.phone ? `Ph ${snapshot.phone}` : undefined,
    ].filter(Boolean);
    return parts.join(" · ") || "—";
  };

  const openConfirm = () => {
    if (!validateStep()) return;
    setConfirmOpen(true);
  };

  const getDocChipClasses = (index: number) => {
    const palette = [
      "border-emerald-200 bg-emerald-50 text-emerald-800",
      "border-blue-200 bg-blue-50 text-blue-800",
      "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
      "border-orange-200 bg-orange-50 text-orange-800",
      "border-indigo-200 bg-indigo-50 text-indigo-800",
      "border-rose-200 bg-rose-50 text-rose-800",
      "border-cyan-200 bg-cyan-50 text-cyan-800",
      "border-violet-200 bg-violet-50 text-violet-800",
    ];
    return palette[index % palette.length];
  };

  const handleSubmit = async (): Promise<boolean> => {
    if (!validateStep()) return false;
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
      createdShipmentRef.current = {
        candidateId: created.data.candidateId,
        legId: id,
      };
      return true;
    } catch {
      toast.error("Failed to create courier leg");
      return false;
    }
  };

  const stepIcons = [UserSearch, FileText, MapPin, Send] as const;
  const StepIcon = stepIcons[step];
  const candidateFullName =
    candidate?.name?.trim() ||
    [candidate?.firstName, candidate?.lastName].filter(Boolean).join(" ") ||
    "Loading...";
  const candidateInitials =
    `${candidate?.firstName?.charAt(0) ?? ""}${candidate?.lastName?.charAt(0) ?? ""}`.toUpperCase() ||
    "?";

  return (
    <div className="w-full space-y-5 pb-4">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 px-0">
          <Link to="/courier-management" aria-label="Back to courier register">
            <ArrowLeft className="h-4 w-4" />
            Back to register
          </Link>
        </Button>

        <div className="overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-background to-background p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
                  <Truck className="h-5 w-5 text-teal-600" />
                </span>
                New Courier Leg
              </h1>
              <p className="text-sm text-muted-foreground">
                Record a document movement between offices or client
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2 text-sm">
              <Package className="h-4 w-4 text-teal-600" />
              <span className="text-muted-foreground">Step</span>
              <span className="font-semibold text-foreground">
                {step + 1} / {WIZARD_STEPS.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="animate-courier-wizard-bar-glow relative sticky top-0 z-10 overflow-hidden rounded-2xl border border-teal-200/70 bg-gradient-to-r from-teal-50/40 via-background/95 to-teal-50/30 shadow-sm backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/80 to-transparent" />
        <div className="grid grid-cols-4 gap-1 p-3 sm:gap-2 sm:p-4">
          {WIZARD_STEPS.map((s, i) => {
            const Icon = stepIcons[i];
            const isComplete = i < step;
            const isCurrent = i === step;
            return (
              <div key={s.id} className="relative flex flex-col items-center gap-2">
                {i < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-[calc(50%+1.25rem)] top-5 hidden h-0.5 w-[calc(100%-2.5rem)] sm:block",
                      isComplete
                        ? "animate-courier-wizard-line-glow bg-gradient-to-r from-emerald-400 to-teal-400"
                        : "bg-border",
                    )}
                    aria-hidden
                  />
                )}
                <div className="relative flex h-10 w-10 items-center justify-center">
                  {isCurrent && (
                    <>
                      <span
                        className="absolute -inset-2 rounded-full bg-teal-400/25 blur-md"
                        aria-hidden
                      />
                      <span
                        className="absolute inset-0 animate-ping rounded-full bg-teal-400/30"
                        aria-hidden
                      />
                    </>
                  )}
                  {isComplete && (
                    <span
                      className="absolute -inset-1 rounded-full bg-emerald-400/20 blur-sm"
                      aria-hidden
                    />
                  )}
                  <div
                    className={cn(
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isComplete &&
                        "animate-courier-wizard-step-complete-glow border-emerald-500 bg-emerald-500 text-white",
                      isCurrent &&
                        "animate-courier-wizard-step-glow border-teal-500 bg-teal-600 text-white",
                      !isComplete &&
                        !isCurrent &&
                        "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs",
                    isCurrent && "font-semibold text-teal-700 drop-shadow-[0_0_8px_rgb(20_184_166/0.35)]",
                    isComplete && "text-emerald-700",
                    !isComplete && !isCurrent && "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden border-border border-l-4 border-l-teal-500 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-gradient-to-r from-teal-50/70 via-background to-background px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100">
                    <StepIcon className="h-4 w-4 text-teal-600" />
                  </span>
                  {WIZARD_STEPS[step].label}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {step === 0 &&
                    "Search and select the candidate whose documents are moving."}
                  {step === 1 &&
                    "Choose which received original documents are included in this leg."}
                  {step === 2 &&
                    "Set purpose, delivery mode, and the from/to route."}
                  {step === 3 &&
                    "Confirm details and record dispatch or handover."}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 border-teal-200 bg-teal-50 text-[11px] text-teal-700"
              >
                {step + 1} / {WIZARD_STEPS.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-4">
            {step === 0 && (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Candidate search
                  </p>
                  <SelectCandidate
                    label="Search candidate"
                    required
                    value={candidateId}
                    onValueChange={setCandidateId}
                  />
                  {!candidateId && (
                    <div className="rounded-lg border border-dashed border-teal-200 bg-teal-50/40 px-4 py-5 text-center">
                      <UserSearch className="mx-auto mb-2 h-7 w-7 text-teal-400" />
                      <p className="text-sm font-medium text-foreground">
                        No candidate selected
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Search and select a candidate to view details and
                        available documents.
                      </p>
                    </div>
                  )}
                </div>

                {candidateId ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="xl:hidden">
                      <SelectedCandidateSummary
                        candidateId={candidateId}
                        subtitle="Selected for courier leg"
                        showMailingAddress
                      />
                    </div>
                    <CourierCollectionSummary candidateId={candidateId} />
                  </motion.div>
                ) : (
                  <div className="hidden rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 lg:flex lg:flex-col lg:items-center lg:justify-center lg:text-center xl:hidden">
                    <Package className="mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">
                      Candidate summary and document history will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50/60 to-background px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                      <FileText className="h-5 w-5 text-teal-600" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {docTypes.length} of {availableDocs.length} documents
                        selected
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Only received originals can be included in this leg
                      </p>
                    </div>
                  </div>
                  {docTypes.length > 0 && (
                    <Badge className="bg-teal-600 text-white hover:bg-teal-600">
                      Ready to continue
                    </Badge>
                  )}
                </div>
                <DocumentSelectionChecklist
                  availableDocTypes={availableDocs}
                  selected={docTypes}
                  onChange={setDocTypes}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Shipment purpose
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPurposeType(SHIPMENT_PURPOSE.INTERNAL)
                          }
                          className={cn(
                            "rounded-lg border p-3 text-left transition-all",
                            purposeType === SHIPMENT_PURPOSE.INTERNAL
                              ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                              : "border-border bg-card hover:border-blue-200",
                          )}
                          aria-pressed={
                            purposeType === SHIPMENT_PURPOSE.INTERNAL
                          }
                        >
                          <Building2 className="mb-1.5 h-4 w-4 text-blue-600" />
                          <p className="text-sm font-semibold leading-none">
                            {SHIPMENT_PURPOSE_LABELS.internal}
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                            Between offices or internal locations
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPurposeType(SHIPMENT_PURPOSE.RETURN)}
                          className={cn(
                            "rounded-lg border p-3 text-left transition-all",
                            purposeType === SHIPMENT_PURPOSE.RETURN
                              ? "border-violet-300 bg-violet-50 ring-1 ring-violet-200"
                              : "border-border bg-card hover:border-violet-200",
                          )}
                          aria-pressed={purposeType === SHIPMENT_PURPOSE.RETURN}
                        >
                          <RotateCcw className="mb-1.5 h-4 w-4 text-violet-600" />
                          <p className="text-sm font-semibold leading-none">
                            {SHIPMENT_PURPOSE_LABELS.return}
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                            Return to candidate or external party
                          </p>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Delivery mode
                      </p>
                      <DeliveryModeToggle
                        value={deliveryMode}
                        onChange={setDeliveryMode}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Route
                  </p>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start">
                    <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-3">
                      <CourierAddressFields
                        label="From"
                        addressType={fromAddressType}
                        snapshot={fromSnapshot}
                        officePresets={officePresets}
                        onAddressTypeChange={handleFromAddressTypeChange}
                        onSnapshotChange={handleFromSnapshotChange}
                      />
                    </div>
                    <div className="hidden items-center justify-center lg:flex lg:pt-10">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-200 bg-teal-50 shadow-sm">
                        <ArrowRight className="h-4 w-4 text-teal-600" />
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 lg:hidden">
                      <div className="h-px flex-1 bg-border" />
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="rounded-lg border border-violet-100 bg-violet-50/30 p-3">
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
                </div>

                <div className="rounded-xl border border-border/70 bg-background p-3">
                  <Label htmlFor="remarks" className="text-xs">
                    Remarks (optional)
                  </Label>
                  <Input
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any notes for this leg..."
                    className="mt-1.5 h-9 rounded-lg"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-3 xl:grid-cols-[minmax(0,300px)_1fr]">
                <div className="space-y-3 rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/80 via-background to-background p-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-teal-600" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Leg summary
                    </p>
                  </div>

                  <div className="flex items-stretch gap-1.5 rounded-lg border border-border/60 bg-background/90 p-2">
                    <div className="flex-1 rounded-md bg-blue-50/70 px-2 py-1.5 text-center">
                      <p className="text-[10px] font-medium text-blue-600">From</p>
                      <p className="mt-0.5 text-xs font-semibold text-blue-900">
                        {ADDRESS_TYPE_LABELS[fromAddressType]}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <ArrowRight className="h-3.5 w-3.5 text-teal-600" />
                    </div>
                    <div className="flex-1 rounded-md bg-violet-50/70 px-2 py-1.5 text-center">
                      <p className="text-[10px] font-medium text-violet-600">To</p>
                      <p className="mt-0.5 text-xs font-semibold text-violet-900">
                        {ADDRESS_TYPE_LABELS[toAddressType]}
                      </p>
                    </div>
                  </div>

                  <dl className="space-y-1.5">
                    {[
                      {
                        label: "Documents",
                        value: `${docTypes.length} selected`,
                        icon: FileText,
                      },
                      {
                        label: "Purpose",
                        value: SHIPMENT_PURPOSE_LABELS[purposeType],
                        icon: Building2,
                      },
                      {
                        label: "Mode",
                        value: DELIVERY_MODE_LABELS[deliveryMode],
                        icon:
                          deliveryMode === DELIVERY_MODE.COURIER
                            ? Truck
                            : Footprints,
                      },
                    ].map(({ label, value, icon: Icon }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/80 px-2.5 py-1.5"
                      >
                        <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </dt>
                        <dd className="text-xs font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {docTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 border-t border-border/60 pt-2">
                      {docTypes.slice(0, 3).map((docType) => (
                        <Badge
                          key={docType}
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          {getDocumentTypeConfig(docType)?.displayName ?? docType}
                        </Badge>
                      ))}
                      {docTypes.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{docTypes.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <Send className="h-4 w-4 text-teal-600" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {deliveryMode === DELIVERY_MODE.COURIER
                        ? "Dispatch details"
                        : "Handover details"}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label
                        htmlFor="sentAt"
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {deliveryMode === DELIVERY_MODE.COURIER
                          ? "Dispatch date"
                          : "Handover date"}
                      </Label>
                      <Input
                        id="sentAt"
                        type="datetime-local"
                        value={sentAt}
                        onChange={(e) => setSentAt(e.target.value)}
                        className="mt-1.5 h-9 rounded-lg"
                      />
                    </div>

                    {deliveryMode === DELIVERY_MODE.COURIER && (
                      <>
                        <div>
                          <Label
                            htmlFor="trackingId"
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                            Tracking ID
                          </Label>
                          <Input
                            id="trackingId"
                            value={trackingId}
                            onChange={(e) => setTrackingId(e.target.value)}
                            placeholder="Courier tracking number"
                            className="mt-1.5 h-9 rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1.5 text-xs">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                            Courier partner
                          </Label>
                          <Select
                            value={courierPartner}
                            onValueChange={setCourierPartner}
                          >
                            <SelectTrigger className="mt-1.5 h-9 rounded-lg">
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
                      <Label className="text-xs">
                        {deliveryMode === DELIVERY_MODE.COURIER
                          ? "Sent by"
                          : "Handed over by"}
                      </Label>
                      <div className="mt-1.5">
                        <UserSelect
                          value={sentByUserId}
                          onChange={setSentByUserId}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Approved by</Label>
                      <div className="mt-1.5">
                        <UserSelect
                          value={approvedByUserId}
                          onChange={setApprovedByUserId}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {candidateId && (
          <aside className="hidden xl:block">
            <Card className="sticky top-20 overflow-hidden border-teal-100 shadow-md">
              <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-teal-50">
                    <Package className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Live preview
                    </span>
                  </div>
                  <Badge className="border-teal-400/40 bg-teal-500/30 text-[10px] text-white hover:bg-teal-500/30">
                    Step {step + 1}/{WIZARD_STEPS.length}
                  </Badge>
                </div>
                <div className="mt-2.5 grid grid-cols-4 gap-1">
                  {WIZARD_STEPS.map((wizardStep, index) => (
                    <div
                      key={wizardStep.id}
                      className={cn(
                        "h-1 rounded-full transition-colors",
                        index <= step ? "bg-white/90" : "bg-teal-900/30",
                      )}
                      aria-hidden
                    />
                  ))}
                </div>
              </div>

              <CardContent className="space-y-2.5 p-3">
                <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-gradient-to-br from-muted/30 to-background p-2.5">
                  <Avatar className="h-11 w-11 shrink-0 border border-border shadow-sm">
                    <AvatarImage
                      src={candidate?.profileImage || undefined}
                      alt={candidateFullName}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-700 text-xs font-semibold text-white">
                      {candidateInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {candidateFullName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {candidate?.passportNumber ||
                        candidate?.candidateCode ||
                        "Candidate selected"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-2 text-center">
                    <FileText className="mx-auto h-4 w-4 text-teal-600" />
                    <p className="mt-1 text-lg font-bold leading-none text-teal-700">
                      {docTypes.length}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Docs
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2 text-center">
                    {deliveryMode === DELIVERY_MODE.COURIER ? (
                      <Truck className="mx-auto h-4 w-4 text-teal-600" />
                    ) : (
                      <Footprints className="mx-auto h-4 w-4 text-indigo-600" />
                    )}
                    <p className="mt-1 truncate text-[11px] font-semibold leading-none text-foreground">
                      {step >= 2
                        ? DELIVERY_MODE_LABELS[deliveryMode]
                        : "Pending"}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Mode
                    </p>
                  </div>
                </div>

                {step >= 2 ? (
                  <div className="space-y-2 rounded-xl border border-border/70 bg-muted/10 p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Route
                    </p>
                    <div className="flex items-stretch gap-1.5">
                      <div className="flex-1 rounded-lg border border-blue-100 bg-blue-50/70 px-2 py-1.5 text-center">
                        <p className="text-[10px] font-medium text-blue-600">From</p>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-blue-900">
                          {ADDRESS_TYPE_LABELS[fromAddressType]}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                      </div>
                      <div className="flex-1 rounded-lg border border-violet-100 bg-violet-50/70 px-2 py-1.5 text-center">
                        <p className="text-[10px] font-medium text-violet-600">To</p>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-violet-900">
                          {ADDRESS_TYPE_LABELS[toAddressType]}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        purposeType === SHIPMENT_PURPOSE.INTERNAL
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-violet-200 bg-violet-50 text-violet-700",
                      )}
                    >
                      {purposeType === SHIPMENT_PURPOSE.INTERNAL ? (
                        <Building2 className="mr-1 h-3 w-3" />
                      ) : (
                        <RotateCcw className="mr-1 h-3 w-3" />
                      )}
                      {SHIPMENT_PURPOSE_LABELS[purposeType]}
                    </Badge>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-3 py-3 text-center">
                    <MapPin className="mx-auto mb-1 h-4 w-4 text-muted-foreground/50" />
                    <p className="text-[11px] text-muted-foreground">
                      Route unlocks on step 3
                    </p>
                  </div>
                )}

                {docTypes.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Selected docs
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {docTypes.slice(0, 5).map((docType) => (
                        <Badge
                          key={docType}
                          variant="secondary"
                          className="max-w-full truncate text-[10px] font-normal"
                        >
                          {getDocumentTypeConfig(docType)?.displayName ?? docType}
                        </Badge>
                      ))}
                      {docTypes.length > 5 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{docTypes.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
        <Button
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="rounded-xl"
        >
          Back
        </Button>
        {step < WIZARD_STEPS.length - 1 ? (
          <Button onClick={handleNext} className="rounded-xl gap-2">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={openConfirm}
            disabled={isLoading}
            className="rounded-xl gap-2 bg-teal-600 hover:bg-teal-700"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {deliveryMode === DELIVERY_MODE.COURIER
              ? "Dispatch Courier"
              : "Confirm Handover"}
          </Button>
        )}
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (dispatchAnimating) return;
          setConfirmOpen(open);
        }}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="space-y-0 border-b border-border bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-5 py-3 text-left text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 shadow-sm",
                      deliveryMode === DELIVERY_MODE.COURIER
                        ? "bg-teal-500/20 text-teal-200"
                        : "bg-indigo-500/20 text-indigo-200",
                    )}
                  >
                    {deliveryMode === DELIVERY_MODE.COURIER ? (
                      <Truck className="h-4 w-4" />
                    ) : (
                      <Footprints className="h-4 w-4" />
                    )}
                  </span>
                  {deliveryMode === DELIVERY_MODE.COURIER
                    ? "Confirm courier dispatch"
                    : "Confirm direct handover"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/70">
                  Review the details below before saving this leg.
                </DialogDescription>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <Badge className="border-white/15 bg-white/10 text-[11px] text-white hover:bg-white/10">
                  {SHIPMENT_PURPOSE_LABELS[purposeType]}
                </Badge>
                <Badge
                  className={cn(
                    "text-[11px] text-white hover:bg-white/10",
                    deliveryMode === DELIVERY_MODE.COURIER
                      ? "border-teal-300/30 bg-teal-500/15"
                      : "border-indigo-300/30 bg-indigo-500/15",
                  )}
                >
                  {DELIVERY_MODE_LABELS[deliveryMode]}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[62vh] overflow-y-auto bg-gradient-to-b from-white to-slate-50/70 px-4 py-3 text-sm">
            {dispatchAnimating ? (
              <DispatchSuccessAnimation
                deliveryMode={deliveryMode}
                courierPartner={courierPartner}
                trackingId={trackingId}
                phase={dispatchUiPhase === "success" ? "success" : "processing"}
                onComplete={() => {
                  const created = createdShipmentRef.current;
                  if (created) {
                    navigate(
                      `/courier-management/candidates/${created.candidateId}?leg=${created.legId}`,
                    );
                    createdShipmentRef.current = null;
                  }
                  window.setTimeout(() => {
                    setConfirmOpen(false);
                    setDispatchAnimating(false);
                    setDispatchUiPhase("idle");
                  }, 300);
                }}
              />
            ) : null}

            {!dispatchAnimating ? (
              <div className="grid gap-2.5 lg:grid-cols-2">
                <div className="space-y-2.5">
                  <div className="relative overflow-hidden rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 p-3">
                    <span className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-emerald-200/40 blur-2xl" />
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-9 w-9 shrink-0 border border-emerald-200 shadow-sm">
                        <AvatarImage
                          src={candidate?.profileImage || undefined}
                          alt={candidateFullName}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-semibold text-white">
                          {candidateInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80">
                          Candidate
                        </p>
                        <p className="truncate text-sm font-semibold text-emerald-950">
                          {candidateFullName}
                        </p>
                        <p className="text-[11px] text-emerald-800/70">
                          {candidate?.candidateCode || candidateId || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="relative overflow-hidden rounded-xl border border-blue-200/70 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-3">
                      <div className="flex items-start gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                          <Building2 className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700/80">
                            Purpose
                          </p>
                          <p className="mt-0.5 truncate text-xs font-semibold text-blue-950">
                            {SHIPMENT_PURPOSE_LABELS[purposeType]}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "relative overflow-hidden rounded-xl border p-3",
                        deliveryMode === DELIVERY_MODE.COURIER
                          ? "border-teal-200/70 bg-gradient-to-br from-teal-50 via-white to-emerald-50/40"
                          : "border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-violet-50/40",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                            deliveryMode === DELIVERY_MODE.COURIER
                              ? "bg-teal-100 text-teal-700"
                              : "bg-indigo-100 text-indigo-700",
                          )}
                        >
                          {deliveryMode === DELIVERY_MODE.COURIER ? (
                            <Truck className="h-3.5 w-3.5" />
                          ) : (
                            <Footprints className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-[10px] font-semibold uppercase tracking-wider",
                              deliveryMode === DELIVERY_MODE.COURIER
                                ? "text-teal-700/80"
                                : "text-indigo-700/80",
                            )}
                          >
                            Mode
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 truncate text-xs font-semibold",
                              deliveryMode === DELIVERY_MODE.COURIER
                                ? "text-teal-950"
                                : "text-indigo-950",
                            )}
                          >
                            {DELIVERY_MODE_LABELS[deliveryMode]}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-3">
                      <div className="flex items-start gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                          <Calendar className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-700/80">
                            {deliveryMode === DELIVERY_MODE.COURIER ? "Dispatch" : "Handover"}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold leading-tight text-sky-950">
                            {sentAt
                              ? format(new Date(sentAt), "MMM d, yyyy · p")
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {deliveryMode === DELIVERY_MODE.COURIER ? (
                      <div className="relative overflow-hidden rounded-xl border border-teal-200/70 bg-gradient-to-br from-teal-50 via-white to-emerald-50/40 p-3">
                        <div className="flex items-start gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-100 text-teal-700">
                            <Hash className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-700/80">
                              Courier
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge className="border-teal-200 bg-teal-50 px-1.5 py-0 text-[10px] text-teal-800 hover:bg-teal-50">
                                {courierPartner}
                              </Badge>
                              <code className="max-w-full truncate rounded border border-teal-200/70 bg-white/70 px-1.5 py-0 text-[10px] text-teal-900">
                                {trackingId || "—"}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative overflow-hidden rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-violet-50/40 p-3">
                        <div className="flex items-start gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                            <Footprints className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700/80">
                              Handover
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-indigo-950">
                              Direct · no tracking
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-rose-200/70 bg-gradient-to-br from-rose-50 via-white to-pink-50/40 p-3">
                    <div className="flex items-start gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </span>
                      <div className="grid flex-1 grid-cols-2 gap-2">
                        <div className="rounded-lg border border-rose-200/60 bg-white/70 px-2.5 py-1.5">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-rose-700/80">
                            {deliveryMode === DELIVERY_MODE.COURIER ? "Sent by" : "Handed by"}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-semibold text-rose-950">
                            <User className="h-3 w-3 shrink-0" />
                            {sentByName}
                          </p>
                        </div>
                        <div className="rounded-lg border border-rose-200/60 bg-white/70 px-2.5 py-1.5">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-rose-700/80">
                            Approved by
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-semibold text-rose-950">
                            <Users className="h-3 w-3 shrink-0" />
                            {approvedByName}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="relative overflow-hidden rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-3">
                    <div className="flex items-start gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                        <MapPin className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700/80">
                            Route
                          </p>
                          <Badge className="border-blue-200 bg-blue-50 px-1.5 py-0 text-[10px] text-blue-800 hover:bg-blue-50">
                            {ADDRESS_TYPE_LABELS[fromAddressType]}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge className="border-violet-200 bg-violet-50 px-1.5 py-0 text-[10px] text-violet-800 hover:bg-violet-50">
                            {ADDRESS_TYPE_LABELS[toAddressType]}
                          </Badge>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-lg border border-blue-200/70 bg-white/70 p-2">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-700/80">
                              From
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-foreground">
                              {formatSnapshotLine(fromSnapshot)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-violet-200/70 bg-white/70 p-2">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-violet-700/80">
                              To
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-foreground">
                              {formatSnapshotLine(toSnapshot)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {docTypes.length > 0 ? (
                    <div className="relative overflow-hidden rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 p-3">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                            <FileText className="h-3.5 w-3.5" />
                          </span>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/80">
                            Documents ({docTypes.length})
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {docTypes.map((docType, index) => (
                          <Badge
                            key={docType}
                            variant="outline"
                            className={cn(
                              "max-w-full truncate border px-2 py-0.5 text-[10px] font-semibold",
                              getDocChipClasses(index),
                            )}
                          >
                            {getDocumentTypeConfig(docType)?.displayName ?? docType}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {remarks.trim() ? (
                    <div className="rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-slate-50/40 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                        Remarks
                      </p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-foreground">
                        {remarks}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-muted/10 px-4 py-3 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isLoading || dispatchAnimating}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                createdShipmentRef.current = null;
                setDispatchAnimating(true);
                setDispatchUiPhase("processing");
                try {
                  const ok = await handleSubmit();
                  if (ok) {
                    setDispatchUiPhase("success");
                  } else {
                    setDispatchAnimating(false);
                    setDispatchUiPhase("idle");
                    setConfirmOpen(true);
                  }
                } catch {
                  setDispatchAnimating(false);
                  setDispatchUiPhase("idle");
                  setConfirmOpen(true);
                }
              }}
              disabled={isLoading || dispatchAnimating}
              className={cn(
                "gap-2 rounded-xl text-white",
                deliveryMode === DELIVERY_MODE.COURIER
                  ? "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                  : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700",
              )}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {deliveryMode === DELIVERY_MODE.COURIER ? "Dispatch" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
