import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileCheck2,
  Loader2,
  Upload,
  UserRound,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { getUploadErrorMessage } from "@/lib/document-upload";
import { FlagIcon, FlagWithName } from "@/shared/components/FlagIcon";
import { useCountryValidation } from "@/shared/hooks/useCountriesLookup";
import {
  DELIVERY_MODE,
  DELIVERY_MODE_LABELS,
  SHIPMENT_PURPOSE_LABELS,
} from "../constants";
import {
  useGetCourierAttestationEligibilityQuery,
  useGetCourierAttestationProjectsQuery,
  useGetCourierAttestationUploadsQuery,
  useUploadCourierAttestationMergedMutation,
  useUploadCourierAttestationMutation,
} from "../api";
import type {
  AttestationProjectOption,
  CourierAttestationUpload,
  CourierShipment,
} from "../types";
import { CourierRouteDisplay } from "./CourierRouteDisplay";
import { ShipmentStatusBadge } from "./ShipmentStatusBadge";

const PAGE_SIZE = 10;

type SlotDraft = {
  file: File | null;
  remarks: string;
};

export interface LegAttestationUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: CourierShipment;
}

export function LegAttestationUploadModal({
  open,
  onOpenChange,
  shipment,
}: LegAttestationUploadModalProps) {
  const { getCountryName } = useCountryValidation();
  const [projectId, setProjectId] = useState("");
  const [projectsPage, setProjectsPage] = useState(1);
  const [accumulatedProjects, setAccumulatedProjects] = useState<
    AttestationProjectOption[]
  >([]);
  const [uploadsPage, setUploadsPage] = useState(1);
  const [slotDrafts, setSlotDrafts] = useState<Record<string, SlotDraft>>({});
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(
    new Set(),
  );
  const [mergeFile, setMergeFile] = useState<File | null>(null);
  const [mergeRemarks, setMergeRemarks] = useState("");
  const [mergeUploading, setMergeUploading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{
    fileUrl: string;
    fileName: string;
  } | null>(null);

  const {
    data: projectsResponse,
    isLoading: loadingProjects,
    isFetching: fetchingProjects,
    isError: projectsError,
    isSuccess: projectsSuccess,
  } = useGetCourierAttestationProjectsQuery(
    { id: shipment.id, page: projectsPage, limit: PAGE_SIZE },
    { skip: !open },
  );

  // Reseed projects whenever the modal is open and query data is available.
  // Important on reopen: RTK may return the same cached reference, so we
  // must also depend on `open` / `projectsSuccess` or the list stays empty
  // after the close-reset clears `accumulatedProjects`.
  useEffect(() => {
    if (!open || !projectsSuccess) return;
    const pageData = projectsResponse?.data;
    if (!pageData) return;
    setAccumulatedProjects((prev) => {
      if (projectsPage === 1) return pageData.projects;
      const existingIds = new Set(prev.map((p) => p.projectId));
      const appended = pageData.projects.filter(
        (p) => !existingIds.has(p.projectId),
      );
      return [...prev, ...appended];
    });
  }, [open, projectsSuccess, projectsResponse?.data, projectsPage]);

  useEffect(() => {
    if (!open) return;
    const defaultId =
      projectsResponse?.data?.defaultProjectId ??
      accumulatedProjects.find((p) => p.isShipmentProject)?.projectId ??
      accumulatedProjects[0]?.projectId ??
      "";
    if (!defaultId) return;
    setProjectId((prev) => prev || defaultId);
  }, [
    open,
    accumulatedProjects,
    projectsResponse?.data?.defaultProjectId,
  ]);

  useEffect(() => {
    if (!open) {
      setProjectId("");
      setProjectsPage(1);
      setAccumulatedProjects([]);
      setUploadsPage(1);
      setSlotDrafts({});
      setUploadingDocType(null);
      setSelectedForMerge(new Set());
      setMergeFile(null);
      setMergeRemarks("");
      setMergeUploading(false);
      setPdfPreview(null);
    }
  }, [open]);

  useEffect(() => {
    if (!projectId) return;
    setUploadsPage(1);
    setSlotDrafts({});
    setUploadingDocType(null);
    setSelectedForMerge(new Set());
    setMergeFile(null);
    setMergeRemarks("");
  }, [projectId]);

  const {
    data: eligibilityResponse,
    isLoading: loadingEligibility,
    isFetching: fetchingEligibility,
  } = useGetCourierAttestationEligibilityQuery(
    { id: shipment.id, projectId },
    { skip: !open || !projectId },
  );

  const {
    data: uploadsResponse,
    isLoading: loadingUploads,
    isFetching: fetchingUploads,
  } = useGetCourierAttestationUploadsQuery(
    {
      id: shipment.id,
      projectId,
      page: uploadsPage,
      limit: PAGE_SIZE,
    },
    { skip: !open || !projectId },
  );

  const [upload] = useUploadCourierAttestationMutation();
  const [uploadMerged] = useUploadCourierAttestationMergedMutation();

  const projectsPagination = projectsResponse?.data?.pagination;
  const uploadsPagination = uploadsResponse?.data?.pagination;
  const eligible = eligibilityResponse?.data?.eligibleDocuments ?? [];
  const uploads = uploadsResponse?.data?.uploads ?? [];
  const activeUploads = useMemo(
    () => uploads.filter((u) => u.isActive),
    [uploads],
  );

  // Group history rows that share the same uploaded file (merged uploads
  // create one row per covered doc type, all pointing at the same document).
  const historyGroups = useMemo(() => {
    const groups: CourierAttestationUpload[][] = [];
    const indexByDocumentId = new Map<string, number>();
    for (const u of activeUploads) {
      const key = u.document?.id ?? u.id;
      const existingIndex = indexByDocumentId.get(key);
      if (existingIndex !== undefined) {
        groups[existingIndex].push(u);
      } else {
        indexByDocumentId.set(key, groups.length);
        groups.push([u]);
      }
    }
    return groups;
  }, [activeUploads]);

  const selectedMergeSlots = eligible.filter(
    (slot) =>
      selectedForMerge.has(slot.docType) && !slot.verifiedByProcessingTeam,
  );

  const selectedProject = accumulatedProjects.find(
    (p) => p.projectId === projectId,
  );
  const selectedCountryName =
    selectedProject?.countryName?.trim() ||
    getCountryName(selectedProject?.countryCode ?? undefined) ||
    null;
  const canLoadMoreProjects =
    Boolean(projectsPagination) &&
    projectsPage < (projectsPagination?.totalPages ?? 1);

  const getDraft = (docType: string): SlotDraft =>
    slotDrafts[docType] ?? { file: null, remarks: "" };

  const updateDraft = (docType: string, patch: Partial<SlotDraft>) => {
    setSlotDrafts((prev) => {
      const current = prev[docType] ?? { file: null, remarks: "" };
      return {
        ...prev,
        [docType]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const handleUploadSlot = async (docType: string) => {
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    const slot = eligible.find((s) => s.docType === docType);
    if (slot?.verifiedByProcessingTeam) {
      toast.error("This document was verified by the processing team and cannot be replaced");
      return;
    }
    const draft = getDraft(docType);
    if (!draft.file) {
      toast.error("Choose a PDF file");
      return;
    }
    if (draft.file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    setUploadingDocType(docType);
    try {
      await upload({
        id: shipment.id,
        projectId,
        docType,
        remarks: draft.remarks.trim() || undefined,
        file: draft.file,
      }).unwrap();
      toast.success("Attested document uploaded");
      updateDraft(docType, { file: null, remarks: "" });
      setUploadsPage(1);
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    } finally {
      setUploadingDocType(null);
    }
  };

  const toggleMergeSelection = (docType: string) => {
    const slot = eligible.find((s) => s.docType === docType);
    if (slot?.verifiedByProcessingTeam) return;
    setSelectedForMerge((prev) => {
      const next = new Set(prev);
      if (next.has(docType)) {
        next.delete(docType);
      } else {
        next.add(docType);
      }
      return next;
    });
  };

  const handleUploadMerged = async () => {
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    if (selectedMergeSlots.length < 2) {
      toast.error("Select at least 2 documents to merge");
      return;
    }
    if (!mergeFile) {
      toast.error("Choose a PDF file");
      return;
    }
    if (mergeFile.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    setMergeUploading(true);
    try {
      await uploadMerged({
        id: shipment.id,
        projectId,
        docTypes: selectedMergeSlots.map((slot) => slot.docType),
        remarks: mergeRemarks.trim() || undefined,
        file: mergeFile,
      }).unwrap();
      toast.success("Merged attested document uploaded");
      setSelectedForMerge(new Set());
      setMergeFile(null);
      setMergeRemarks("");
      setUploadsPage(1);
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    } finally {
      setMergeUploading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border-indigo-200/60 p-0 shadow-xl sm:max-w-7xl">
          <div className="shrink-0 border-b border-indigo-100/80 bg-gradient-to-br from-indigo-100 via-sky-50 to-violet-100/70 px-6 py-4">
            <DialogHeader className="space-y-0 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md ring-4 ring-indigo-100">
                  <FileCheck2 className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-indigo-950">
                    Upload attested documents — Leg {shipment.legNumber}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-indigo-800/70">
                    Select the project, then upload a PDF for each document
                    sent on this leg — individually or as a merged file.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-sky-50/40 via-background to-violet-50/30 px-6 py-4">
            <div className="space-y-2.5 rounded-xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50/90 via-card to-sky-50/70 p-3.5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-indigo-600 text-[10px] text-white hover:bg-indigo-600">
                  Leg {shipment.legNumber}
                </Badge>
                <ShipmentStatusBadge status={shipment.status} />
                <Badge variant="secondary" className="text-[10px]">
                  {SHIPMENT_PURPOSE_LABELS[shipment.purposeType]}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {DELIVERY_MODE_LABELS[shipment.deliveryMode]}
                  {shipment.deliveryMode === DELIVERY_MODE.COURIER &&
                  shipment.courierPartner
                    ? ` · ${shipment.courierPartner}`
                    : ""}
                </Badge>
                {shipment.trackingId ? (
                  <Badge variant="outline" className="text-[10px]">
                    Track: {shipment.trackingId}
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-indigo-950">
                    {[shipment.candidate.firstName, shipment.candidate.lastName]
                      .filter(Boolean)
                      .join(" ") || "Candidate"}
                    {shipment.candidate.candidateCode
                      ? ` · ${shipment.candidate.candidateCode}`
                      : ""}
                  </p>
                  <p className="text-xs text-indigo-800/65">
                    Attested uploads for this received leg
                    {shipment.receivedAt
                      ? ` · Received ${format(new Date(shipment.receivedAt), "dd MMM yyyy HH:mm")}`
                      : ""}
                  </p>
                </div>
                <CourierRouteDisplay
                  fromLabel={shipment.fromAddressLabel}
                  toLabel={shipment.toAddressLabel}
                  status={shipment.status}
                />
              </div>
              {shipment.documents.length > 0 ? (
                <p className="text-xs text-indigo-800/70">
                  Docs on this leg:{" "}
                  <span className="font-medium text-indigo-900">
                    {shipment.documents.length}
                  </span>
                  {shipment.lockerFileNumber ||
                  shipment.collection?.lockerFileNumber
                    ? ` · Locker: ${
                        shipment.lockerFileNumber ||
                        shipment.collection?.lockerFileNumber
                      }`
                    : ""}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50/80 via-card to-sky-50/60 p-3 shadow-sm sm:flex-row sm:items-center">
              <Label
                htmlFor="attestation-project"
                className="shrink-0 text-indigo-900 sm:w-20"
              >
                Project
              </Label>
              <div className="min-w-0 flex-1 space-y-1.5">
                {loadingProjects && projectsPage === 1 ? (
                  <div className="flex items-center gap-2 text-sm text-indigo-700/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading projects…
                  </div>
                ) : projectsError ? (
                  <p className="text-sm text-destructive" role="alert">
                    Could not load projects.
                  </p>
                ) : accumulatedProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active processing projects for this candidate.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger
                        id="attestation-project"
                        className="w-full border-indigo-200 bg-card sm:w-80"
                      >
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {accumulatedProjects.map((p) => {
                          const countryName =
                            p.countryName?.trim() ||
                            getCountryName(p.countryCode ?? undefined) ||
                            p.countryCode ||
                            null;
                          return (
                            <SelectItem
                              key={p.projectId}
                              value={p.projectId}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                {p.countryCode ? (
                                  <FlagIcon
                                    countryCode={p.countryCode}
                                    size="sm"
                                    showFallback={false}
                                    aria-label={
                                      countryName
                                        ? `Flag of ${countryName}`
                                        : `Flag of ${p.countryCode}`
                                    }
                                    className="shrink-0"
                                  />
                                ) : null}
                                <span className="truncate">
                                  {p.title}
                                  {countryName ? ` · ${countryName}` : ""}
                                </span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedProject?.countryCode ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-card px-2.5 py-1 shadow-sm">
                        <FlagWithName
                          countryCode={selectedProject.countryCode}
                          countryName={
                            selectedCountryName ||
                            selectedProject.countryCode
                          }
                          size="sm"
                          showCode
                          className="gap-1.5 [&_span]:text-xs [&_span]:font-medium [&_span]:text-indigo-950"
                        />
                      </div>
                    ) : null}
                    {canLoadMoreProjects ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900"
                        disabled={fetchingProjects}
                        onClick={() => setProjectsPage((p) => p + 1)}
                      >
                        {fetchingProjects ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Load more
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {!projectId &&
            !loadingProjects &&
            accumulatedProjects.length > 0 ? (
              <p className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50 px-3 py-4 text-center text-sm text-indigo-800/70">
                Select a project above to load attested upload slots and
                history for this leg.
              </p>
            ) : null}

            {projectId ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/70 via-card to-emerald-50/40 p-3.5 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-teal-900">
                      Documents on this leg
                    </p>
                    <p className="text-xs text-teal-800/65">
                      Upload each document individually, or check 2+ boxes to
                      merge them into a single attested PDF.
                    </p>
                  </div>
                  {loadingEligibility || fetchingEligibility ? (
                    <div className="flex items-center gap-2 text-sm text-teal-700/70">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : eligible.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No original documents were recorded on this leg, so
                      there is nothing to attest yet.
                    </p>
                  ) : (
                    <ul
                      className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1"
                      role="list"
                    >
                      {eligible.map((slot) => {
                        const draft = getDraft(slot.docType);
                        const isUploading = uploadingDocType === slot.docType;
                        const fileInputId = `attestation-file-${slot.docType}`;
                        const isVerified = !!slot.verifiedByProcessingTeam;
                        const selectedForThisMerge =
                          !isVerified && selectedForMerge.has(slot.docType);
                        return (
                          <li
                            key={slot.docType}
                            className={
                              isVerified
                                ? "space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 shadow-sm"
                                : selectedForThisMerge
                                ? "space-y-2 rounded-lg border border-violet-300 bg-gradient-to-br from-violet-50 to-fuchsia-50/60 p-2.5 shadow-sm"
                                : "space-y-2 rounded-lg border border-teal-200/70 bg-card/90 p-2.5 shadow-sm"
                            }
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                {eligible.filter((s) => !s.verifiedByProcessingTeam).length > 1 && !isVerified && (
                                  <Checkbox
                                    checked={selectedForThisMerge}
                                    onCheckedChange={() =>
                                      toggleMergeSelection(slot.docType)
                                    }
                                    aria-label={`Include ${slot.label} in a merged upload`}
                                  />
                                )}
                                <p className="truncate text-sm font-medium text-foreground">
                                  {slot.label}
                                </p>
                              </div>
                              <Badge
                                className={
                                  isVerified
                                    ? "shrink-0 border-0 bg-emerald-600 text-[10px] text-white hover:bg-emerald-600 gap-1"
                                    : slot.alreadyUploaded
                                    ? "shrink-0 border-0 bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100"
                                    : "shrink-0 border-0 bg-amber-100 text-[10px] text-amber-800 hover:bg-amber-100"
                                }
                              >
                                {isVerified ? (
                                  <>
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Verified by processing team
                                  </>
                                ) : slot.alreadyUploaded ? (
                                  "Uploaded"
                                ) : (
                                  "Needed"
                                )}
                              </Badge>
                            </div>
                            {isVerified ? (
                              <p className="text-xs text-emerald-800/80">
                                This attested document was verified in processing.
                                Further uploads are locked for courier management.
                              </p>
                            ) : (
                              <>
                            <div className="flex items-center gap-2">
                              <Input
                                id={fileInputId}
                                type="file"
                                accept="application/pdf,.pdf"
                                className="h-8 flex-1 border-teal-200/80 bg-card text-xs file:text-xs"
                                onChange={(e) =>
                                  updateDraft(slot.docType, {
                                    file: e.target.files?.[0] ?? null,
                                  })
                                }
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 shrink-0 bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm hover:from-teal-700 hover:to-emerald-700"
                                onClick={() => handleUploadSlot(slot.docType)}
                                disabled={isUploading || !draft.file}
                              >
                                {isUploading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Upload className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden sm:inline">
                                  {slot.alreadyUploaded ? "Replace" : "Upload"}
                                </span>
                              </Button>
                            </div>
                            <Input
                              value={draft.remarks}
                              onChange={(e) =>
                                updateDraft(slot.docType, {
                                  remarks: e.target.value,
                                })
                              }
                              placeholder="Remarks (optional)"
                              maxLength={2000}
                              className="h-8 border-teal-200/60 bg-card text-xs"
                            />
                            {draft.file ? (
                              <p className="truncate text-xs text-teal-700/80">
                                Selected: {draft.file.name}
                              </p>
                            ) : null}
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {selectedMergeSlots.length >= 2 && (
                    <div className="space-y-2 rounded-lg border border-dashed border-violet-400 bg-gradient-to-br from-violet-50 via-fuchsia-50/70 to-indigo-50 p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-violet-900">
                            Merge into one PDF
                          </p>
                          <p className="text-xs text-violet-800/70">
                            Merging:{" "}
                            {selectedMergeSlots
                              .map((slot) => slot.label)
                              .join(", ")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 shrink-0 px-1.5 text-xs text-violet-700 hover:bg-violet-100 hover:text-violet-900"
                          onClick={() => setSelectedForMerge(new Set())}
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="h-8 flex-1 border-violet-200 bg-card text-xs file:text-xs"
                          onChange={(e) =>
                            setMergeFile(e.target.files?.[0] ?? null)
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm hover:from-violet-700 hover:to-fuchsia-700"
                          onClick={handleUploadMerged}
                          disabled={mergeUploading || !mergeFile}
                        >
                          {mergeUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            Upload merged
                          </span>
                        </Button>
                      </div>
                      <Input
                        value={mergeRemarks}
                        onChange={(e) => setMergeRemarks(e.target.value)}
                        placeholder="Remarks (optional)"
                        maxLength={2000}
                        className="h-8 border-violet-200 bg-card text-xs"
                      />
                      {mergeFile ? (
                        <p className="truncate text-xs text-violet-700/80">
                          Selected: {mergeFile.name}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50/80 via-card to-indigo-50/40 p-3.5 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-sky-900">
                      History
                    </p>
                    <p className="text-xs text-sky-800/65">
                      Who uploaded, when, and which leg documents were
                      attested for this project.
                    </p>
                  </div>
                  {loadingUploads || fetchingUploads ? (
                    <div className="flex items-center gap-2 text-sm text-sky-700/70">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : activeUploads.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-sky-200 bg-sky-50/50 px-3 py-6 text-center text-sm text-sky-700/70">
                      No attested uploads yet for this project.
                    </p>
                  ) : (
                    <>
                      <ul
                        className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1"
                        role="list"
                      >
                        {historyGroups.map((group) => {
                          const first = group[0];
                          const isMerged = group.length > 1;
                          const isVerified = group.some(
                            (g) => g.verifiedByProcessingTeam,
                          );
                          const combinedLabel = group
                            .map((g) => g.label)
                            .join(" + ");
                          const uploaderName =
                            first.uploadedBy?.name?.trim() ||
                            first.uploadedBy?.email?.trim() ||
                            "Unknown user";
                          return (
                            <li
                              key={first.document?.id ?? first.id}
                              className={
                                isMerged
                                  ? "flex items-start justify-between gap-2 rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50/50 px-3 py-2.5 text-sm shadow-sm"
                                  : "flex items-start justify-between gap-2 rounded-lg border border-sky-200/80 bg-card/90 px-3 py-2.5 text-sm shadow-sm"
                              }
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="truncate font-medium text-foreground">
                                    {combinedLabel}
                                  </p>
                                  {isMerged && (
                                    <Badge className="shrink-0 border-0 bg-violet-600 text-[10px] text-white hover:bg-violet-600">
                                      Merged
                                    </Badge>
                                  )}
                                  {isVerified && (
                                    <Badge className="shrink-0 border-0 bg-emerald-600 text-[10px] text-white hover:bg-emerald-600 gap-1">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      Verified by processing team
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 border-indigo-200 text-[10px] text-indigo-800"
                                  >
                                    Leg {shipment.legNumber}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sky-800/75">
                                  <span className="inline-flex min-w-0 items-center gap-1">
                                    <UserRound
                                      className="h-3 w-3 shrink-0"
                                      aria-hidden
                                    />
                                    <span className="truncate">
                                      {uploaderName}
                                    </span>
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Clock3
                                      className="h-3 w-3 shrink-0"
                                      aria-hidden
                                    />
                                    <time dateTime={first.uploadedAt}>
                                      {format(
                                        new Date(first.uploadedAt),
                                        "dd MMM yyyy, HH:mm",
                                      )}
                                    </time>
                                  </span>
                                </div>
                                {first.remarks ? (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {first.remarks}
                                  </p>
                                ) : null}
                              </div>
                              {first.document?.fileUrl ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 shrink-0 border-sky-300 px-2 text-sky-700 hover:bg-sky-50"
                                  onClick={() =>
                                    setPdfPreview({
                                      fileUrl: first.document.fileUrl,
                                      fileName: first.document.fileName,
                                    })
                                  }
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                      {uploadsPagination && uploadsPagination.totalPages > 1 ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-sky-100 bg-sky-50/60 px-2 py-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 border-sky-200 px-2"
                            disabled={uploadsPage <= 1 || fetchingUploads}
                            onClick={() =>
                              setUploadsPage((p) => Math.max(1, p - 1))
                            }
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <p className="text-xs text-sky-800/70">
                            Page {uploadsPagination.page} of{" "}
                            {uploadsPagination.totalPages}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 border-sky-200 px-2"
                            disabled={
                              uploadsPage >= uploadsPagination.totalPages ||
                              fetchingUploads
                            }
                            onClick={() => setUploadsPage((p) => p + 1)}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {pdfPreview && (
        <PDFViewer
          fileUrl={pdfPreview.fileUrl}
          fileName={pdfPreview.fileName}
          isOpen={Boolean(pdfPreview)}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </>
  );
}
