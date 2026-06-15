import React, { type ComponentType, useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ExternalLink,
  FileStack,
  FileText,
  Loader2,
  Mail,
  Phone,
  Plus,
  Upload,
  Archive,
  User,
  UserCircle2,
  Users,
  X,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { ImageViewer } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCan } from "@/hooks/useCan";
import {
  useCompleteOriginalDocumentCollectionMutation,
  useGetOriginalDocumentCollectionQuery,
} from "../api";
import { CandidateCollectionHistoryPanel } from "../components/CandidateCollectionHistoryPanel";
import { MergeUploadSection } from "../components/MergeUploadSection";
import { SubmitToLockerSection } from "../components/SubmitToLockerSection";
import { CompleteCollectionModal } from "../components/CompleteCollectionModal";
import { buildDefaultChecklistItems } from "../components/OriginalDocumentChecklist";
import {
  COLLECTION_STATUS_STEPS,
  getCollectionDocumentProgress,
  getCollectionStatusStepIndex,
} from "../utils/collectionProgress";
import {
  COLLECTION_STATUS_LABELS,
  COLLECTION_TYPE_LABELS,
  DIRECT_OFFICE_LABELS,
} from "../constants";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { cn } from "@/lib/utils";
import { getCandidateStatusVisualConfig } from "@/features/candidates/utils/candidateStatusVisualConfig";
import { CandidateCourierPipeline } from "@/features/courier-shipments/components/CandidateCourierPipeline";
import { useGetCandidateCourierPipelineQuery } from "@/features/courier-shipments/api";

/* ---------- helpers ---------- */

const DEFAULT_PROFILE_IMAGE =
  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg";

function getStatusColor(status: string) {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "merged_uploaded":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "locker_submitted":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function formatPhone(candidate: {
  countryCode?: string | null;
  mobileNumber?: string | null;
  contact?: string | null;
}): string {
  const code = candidate.countryCode?.trim();
  const mobile =
    candidate.mobileNumber?.trim() || candidate.contact?.trim() || "";
  if (!mobile) return "—";
  return `${code ? `${code} ` : ""}${mobile}`;
}

function formatGender(g?: string | null): string {
  if (!g?.trim()) return "—";
  const n = g.trim().toLowerCase();
  if (n === "male" || n === "m") return "Male";
  if (n === "female" || n === "f") return "Female";
  if (n === "other") return "Other";
  return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
}

function formatDob(d?: string | null): string {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

/* ---------- small components ---------- */

function StatusStep({
  icon: Icon,
  label,
  isActive,
  isCompleted,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-0.5">
      <div className="relative">
        {isCompleted ? (
          <span
            className="absolute inset-0 rounded-full bg-emerald-400/40 blur-md animate-ping"
            aria-hidden
          />
        ) : null}
        {isActive && !isCompleted ? (
          <span
            className="absolute inset-0 rounded-full bg-blue-400/25 blur-md animate-pulse"
            aria-hidden
          />
        ) : null}
        <div
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 backdrop-blur-md",
            isCompleted
              ? "border-emerald-300/90 bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.55)]"
              : isActive
                ? "border-blue-300/80 bg-blue-50/70 text-blue-600 shadow-[0_0_16px_rgba(59,130,246,0.35)]"
                : "border-white/50 bg-white/35 text-muted-foreground",
          )}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
      </div>
      <p
        className={cn(
          "text-[11px] font-semibold tracking-wide",
          isCompleted
            ? "text-emerald-700"
            : isActive
              ? "text-blue-700"
              : "text-muted-foreground",
        )}
      >
        {label}
      </p>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  sub,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/60 p-3 transition-all hover:border-slate-200 hover:shadow-sm",
        className,
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
          {value}
        </p>
        {sub ? (
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- main ---------- */

export default function CollectionDetailPage() {
  const { id = "" } = useParams();
  const canWrite = useCan("write:documents");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [highlightCombinedMerge, setHighlightCombinedMerge] = useState(false);
  const combinedMergeSectionRef = useRef<HTMLDivElement>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data, isLoading, isError, refetch } =
    useGetOriginalDocumentCollectionQuery(id, { skip: !id });
  const [completeCollection, { isLoading: isCompleting }] =
    useCompleteOriginalDocumentCollectionMutation();

  const collection = data?.data;
  const { data: courierPipelineData } = useGetCandidateCourierPipelineQuery(
    collection?.candidateId ?? "",
    { skip: !collection?.candidateId },
  );

  const allDocuments = React.useMemo(() => {
    const receivedMap = new Map(
      (collection?.cumulativeReceived ?? []).map((item) => [
        item.docType,
        item.isReceived,
      ]),
    );

    return buildDefaultChecklistItems().map((item) => ({
      docType: item.docType,
      isReceived: receivedMap.get(item.docType) ?? false,
    }));
  }, [collection?.cumulativeReceived]);

  const missingDocuments = allDocuments.filter((item) => !item.isReceived);
  const allDocumentsReceived = missingDocuments.length === 0;

  const eventsMissingMerge = React.useMemo(() => {
    if (!collection?.events) return [];
    return collection.events.filter(
      (event) =>
        event.items.some((item) => item.isReceived) && !event.mergedDocumentId,
    );
  }, [collection?.events]);

  const completeDisabledReason = React.useMemo(() => {
    if (!allDocumentsReceived) {
      const count = missingDocuments.length;
      return `${count} document${count === 1 ? "" : "s"} still not uploaded. Log all original documents before completing.`;
    }
    if (eventsMissingMerge.length > 0) {
      return `${eventsMissingMerge.length} intake event${eventsMissingMerge.length === 1 ? "" : "s"} still need a merged scan uploaded.`;
    }
    if (!collection?.mergedDocumentId) {
      return "Upload merged scans for each event to build the combined document.";
    }
    if (!collection?.lockerSubmittedAt) {
      return "Submit the collection to locker first.";
    }
    return null;
  }, [
    allDocumentsReceived,
    missingDocuments.length,
    eventsMissingMerge.length,
    collection?.mergedDocumentId,
    collection?.lockerSubmittedAt,
  ]);

  const canComplete = completeDisabledReason === null;

  const handleEventMergeUploaded = useCallback(async () => {
    await refetch();
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    setHighlightCombinedMerge(true);
    window.requestAnimationFrame(() => {
      combinedMergeSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightCombinedMerge(false);
      highlightTimeoutRef.current = null;
    }, 4000);
  }, [refetch]);

  const handleComplete = async () => {
    try {
      await completeCollection(id).unwrap();
      toast.success("Collection completed");
      await refetch();
    } catch (error) {
      toast.error(
        "Complete failed — ensure merge upload and locker submission are done",
      );
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Loading collection...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !collection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-white px-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <FileStack className="mx-auto mb-4 h-10 w-10 text-slate-300" />
          <h1 className="text-lg font-semibold text-slate-900">
            Collection not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This collection may have been removed or the link is outdated. Open
            the register to find the candidate&apos;s current collection.
          </p>
          <Button asChild className="mt-6">
            <Link to="/original-documents">Back to register</Link>
          </Button>
        </div>
      </div>
    );
  }

  const cand = collection.candidate;
  const fullName = `${cand.firstName || ""} ${cand.lastName || ""}`.trim();
  const recruiter =
    cand.recruiterAssignments?.[0]?.recruiter ?? null;

  const latest =
    collection.latestEvent ??
    collection.events[collection.events.length - 1] ??
    null;
  const sourceDetail =
    latest?.collectionType === "direct"
      ? latest.directOffice === "other"
        ? latest.directOfficeOther
        : DIRECT_OFFICE_LABELS[latest.directOffice ?? ""]
      : latest?.collectionType === "agent"
        ? latest.agent?.name ?? latest.agentNameManual
        : latest?.collectionType === "interview_coordinator"
          ? latest.interviewVenue
          : latest?.collectionType === "courier"
            ? [latest.courierPartner, latest.trackingNumber]
                .filter(Boolean)
                .join(" / ")
            : "";

  const documentProgress = getCollectionDocumentProgress(
    collection.cumulativeReceived,
  );
  const docsOnFile = documentProgress.receivedCount;

  const statusSteps = [
    { key: COLLECTION_STATUS_STEPS[0].key, label: COLLECTION_STATUS_STEPS[0].label, icon: FileText },
    { key: COLLECTION_STATUS_STEPS[1].key, label: COLLECTION_STATUS_STEPS[1].label, icon: Upload },
    { key: COLLECTION_STATUS_STEPS[2].key, label: COLLECTION_STATUS_STEPS[2].label, icon: Archive },
    { key: COLLECTION_STATUS_STEPS[3].key, label: COLLECTION_STATUS_STEPS[3].label, icon: CheckCircle2 },
  ];
  const currentIdx = getCollectionStatusStepIndex(collection.status);
  const isCollectionComplete = collection.status === "completed";

  return (
    <div className="-mx-4 space-y-4 px-4 md:-mx-6 md:px-6">
      {/* Header */}
      <div className="sticky top-0 z-10">
        <div className="relative overflow-hidden rounded-xl border border-white/50 bg-gradient-to-r from-white/90 via-slate-50/80 to-blue-50/50 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -left-12 top-0 h-36 w-36 rounded-full bg-blue-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-indigo-400/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-20 w-40 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="shrink-0 rounded-xl border border-white/60 bg-white/55 shadow-sm backdrop-blur-sm hover:bg-white/80"
              >
                <Link to="/original-documents" aria-label="Back">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>

              <div className="flex min-w-0 items-start gap-3">
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)] sm:flex">
                  <FileStack className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                      Collection details
                    </h1>
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm",
                        getStatusColor(collection.status),
                      )}
                    >
                      {COLLECTION_STATUS_LABELS[collection.status] ??
                        collection.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                    {fullName}
                    {cand.candidateCode ? (
                      <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                        {cand.candidateCode}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-white/60 bg-white/55 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                      {collection.eventCount} intake event
                      {collection.eventCount !== 1 ? "s" : ""}
                    </span>
                    {latest ? (
                      <span className="inline-flex items-center rounded-full border border-white/60 bg-white/55 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
                        Latest: {COLLECTION_TYPE_LABELS[latest.collectionType]}
                        {sourceDetail ? ` · ${sourceDetail}` : ""}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-800 shadow-sm backdrop-blur-sm md:hidden">
                      Step {currentIdx + 1} of {statusSteps.length} ·{" "}
                      {statusSteps[currentIdx]?.label ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="hidden items-center gap-1 md:flex">
                {statusSteps.map((step, i) => {
                  const isStepCompleted =
                    i < currentIdx ||
                    (isCollectionComplete && i === currentIdx);
                  const isStepActive =
                    i === currentIdx && !isCollectionComplete;

                  return (
                    <div key={step.key} className="flex items-center">
                      <StatusStep
                        icon={step.icon}
                        label={step.label}
                        isActive={isStepActive}
                        isCompleted={isStepCompleted}
                      />
                      {i < statusSteps.length - 1 ? (
                        <div
                          className={cn(
                            "mx-1.5 h-1 w-9 rounded-full transition-all duration-500",
                            isStepCompleted
                              ? "bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]"
                              : "bg-border/50",
                          )}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {canWrite && collection.status !== "completed" ? (
                <Button
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 shadow-[0_8px_24px_rgba(59,130,246,0.28)] hover:from-indigo-700 hover:to-blue-700"
                  asChild
                >
                  <Link
                    to={`/original-documents/new?candidateId=${collection.candidateId}&collectionId=${collection.id}`}
                  >
                    <Plus className="h-4 w-4" />
                    Add more documents
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 px-4 py-4 sm:px-5">
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-300/20 blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-8 left-1/4 h-20 w-20 rounded-full bg-blue-200/15 blur-2xl"
                aria-hidden
              />

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="relative shrink-0">
                    <div
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/25 to-blue-400/15 blur-md"
                      aria-hidden
                    />
                    <ImageViewer
                      title={fullName}
                      src={cand.profileImage || null}
                      fallbackSrc={DEFAULT_PROFILE_IMAGE}
                      className="relative h-16 w-16 shrink-0 rounded-full border-[3px] border-white shadow-md ring-2 ring-slate-100 sm:h-[4.5rem] sm:w-[4.5rem]"
                      ariaLabel={`View full image for ${fullName}`}
                      enableHoverPreview
                    />
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600/80">
                      Candidate profile
                    </p>
                    <h2 className="mt-0.5 truncate text-lg font-bold text-slate-900 sm:text-xl">
                      {fullName}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {cand.candidateCode ? (
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-white/80 font-mono text-[11px] text-slate-600"
                        >
                          {cand.candidateCode}
                        </Badge>
                      ) : null}
                      {cand.professionType?.label || cand.professionType?.name ? (
                        <Badge
                          variant="outline"
                          className="border-indigo-200/80 bg-indigo-50/80 text-[11px] font-medium text-indigo-700"
                        >
                          {cand.professionType?.label || cand.professionType?.name}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  {cand.currentStatus?.statusName
                    ? (() => {
                        const statusConfig = getCandidateStatusVisualConfig(
                          cand.currentStatus.statusName,
                        );
                        const StatusIcon = statusConfig.icon;
                        return (
                          <div className="flex items-center gap-2 sm:justify-end">
                            <div
                              className={cn(
                                "rounded-full p-1.5 shadow-sm",
                                statusConfig.bgColor,
                              )}
                            >
                              <StatusIcon
                                className={cn("h-3.5 w-3.5", statusConfig.iconColor)}
                              />
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "px-2.5 py-1 text-xs font-semibold",
                                statusConfig.badgeClass,
                              )}
                            >
                              {cand.currentStatus.statusName}
                            </Badge>
                          </div>
                        );
                      })()
                    : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-slate-200 bg-white/80 text-xs shadow-sm hover:bg-white"
                    asChild
                  >
                    <Link to={`/candidates/${cand.id}`}>
                      View candidate
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <CardContent className="p-4 sm:p-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoTile
                  icon={Mail}
                  label="Email"
                  value={cand.email?.trim() || "—"}
                />
                <InfoTile icon={Phone} label="Phone" value={formatPhone(cand)} />
                <InfoTile
                  icon={Users}
                  label="Gender"
                  value={formatGender(cand.gender)}
                />
                <InfoTile
                  icon={Calendar}
                  label="Date of Birth"
                  value={formatDob(cand.dateOfBirth)}
                />
                <InfoTile
                  icon={Briefcase}
                  label="Profession"
                  value={
                    cand.professionType?.label || cand.professionType?.name || "—"
                  }
                />
                <InfoTile
                  icon={UserCircle2}
                  label="Recruiter"
                  value={recruiter?.name?.trim() || "Not assigned"}
                  sub={recruiter?.email}
                />
              </dl>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="relative border-b border-slate-100 bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/40 px-4 py-4 sm:px-5">
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-300/20 blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-6 left-1/3 h-16 w-24 rounded-full bg-amber-200/20 blur-2xl"
                aria-hidden
              />

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700/90">
                    Collection overview
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold text-slate-900 sm:text-xl">
                    Intake record
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-2.5 py-1 text-xs font-semibold",
                        getStatusColor(collection.status),
                      )}
                    >
                      {COLLECTION_STATUS_LABELS[collection.status] ??
                        collection.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-white/80 text-[11px] text-slate-600"
                    >
                      {collection.events.length} intake event
                      {collection.events.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-slate-200 bg-white/80 text-[11px] font-medium",
                        collection.lockerFileNumber
                          ? "text-slate-700"
                          : "text-slate-400",
                      )}
                    >
                      Locker: {collection.lockerFileNumber?.trim() || "N/A"}
                    </Badge>
                  </div>
                </div>

                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] sm:flex">
                  <FileStack className="h-5 w-5" />
                </div>
              </div>

              <div className="relative mt-4 rounded-xl border border-emerald-100/80 bg-white/70 p-3 backdrop-blur-sm">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700">
                    Documents on file
                  </span>
                  <span className="font-medium text-emerald-700">
                    {docsOnFile} of {documentProgress.totalCount} ·{" "}
                    {documentProgress.percent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500"
                    style={{ width: `${documentProgress.percent}%` }}
                  />
                </div>
              </div>
            </div>

            <CardContent className="space-y-4 p-4 sm:p-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoTile
                  icon={User}
                  label="Created By"
                  value={collection.createdBy.name}
                  sub={collection.createdBy.email}
                />
                <InfoTile
                  icon={Calendar}
                  label="Latest Intake"
                  value={
                    latest
                      ? format(
                          new Date(latest.collectedAt),
                          "dd MMM yyyy, h:mm a",
                        )
                      : "—"
                  }
                  sub={
                    latest
                      ? [
                          COLLECTION_TYPE_LABELS[latest.collectionType],
                          sourceDetail,
                          latest.collectedBy.name,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : undefined
                  }
                />
                <InfoTile
                  icon={FileStack}
                  label="Documents On File"
                  value={`${docsOnFile} of ${documentProgress.totalCount} received`}
                  sub={
                    documentProgress.isComplete
                      ? "All checklist documents received"
                      : `${documentProgress.totalCount - docsOnFile} still pending`
                  }
                />
                {collection.completedBy ? (
                  <InfoTile
                    icon={CheckCircle2}
                    label="Completed By"
                    value={collection.completedBy.name}
                    sub={collection.completedBy.email}
                  />
                ) : null}
              </dl>

              {canWrite && collection.status !== "completed" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-full gap-2 border-slate-200 bg-white text-sm shadow-sm hover:bg-slate-50"
                  asChild
                >
                  <Link
                    to={`/original-documents/new?candidateId=${collection.candidateId}&collectionId=${collection.id}`}
                  >
                    <Plus className="h-4 w-4" />
                    Add more documents
                  </Link>
                </Button>
              ) : null}

              {collection.status === "completed" ? (
                <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        Collection completed
                      </p>
                      <p className="text-xs text-emerald-700/80">
                        All documents received and processed
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <CandidateCollectionHistoryPanel
          candidateId={collection.candidateId}
          variant="full"
          highlightEventId={latest?.id}
          showAddEventLink={false}
          allowEventMergeUpload
          onUpdated={refetch}
          onEventMergeUploaded={handleEventMergeUploaded}
        />

        <Card>
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" />
              Document checklist
            </CardTitle>
            <CardDescription>
              {docsOnFile} of {allDocuments.length} documents on file across all
              events (
              {getCollectionDocumentProgress(collection.cumulativeReceived).percent}
              %)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <div className="max-h-[360px] space-y-1.5 overflow-y-auto">
              {allDocuments.map((item) => {
                const label =
                  getDocumentTypeConfig(item.docType)?.displayName ??
                  item.docType;
                return (
                  <div
                    key={item.docType}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                      item.isReceived
                        ? "border-border bg-muted/40"
                        : "border-border bg-background",
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 text-sm",
                        item.isReceived
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                    {item.isReceived ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        <Check className="h-3 w-3" />
                        Received
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 border-destructive/30 bg-destructive/10 text-destructive"
                      >
                        <X className="h-3 w-3" />
                        Not uploaded
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <MergeUploadSection
            collection={collection}
            onUpdated={refetch}
            highlightReady={highlightCombinedMerge}
            sectionRef={combinedMergeSectionRef}
          />
          <SubmitToLockerSection collection={collection} onUpdated={refetch} />
        </div>

        {canWrite && collection.status !== "completed" && (
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Ready to complete?
              </p>
              <p className="text-sm text-muted-foreground">
                {completeDisabledReason ??
                  "All requirements met — you can finalize now."}
              </p>
            </div>
            {canComplete ? (
              <Button
                onClick={() => setShowCompleteModal(true)}
                className="gap-2 shrink-0"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete collection
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex shrink-0">
                    <Button disabled className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Complete collection
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {completeDisabledReason}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* ── Courier History ── */}
        {collection.candidateId && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-teal-600" />
                  <CardTitle className="text-sm font-semibold">
                    Courier History
                  </CardTitle>
                </div>
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link
                    to={`/courier-management/candidates/${collection.candidateId}`}
                  >
                    View courier details
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <CandidateCourierPipeline
                legs={courierPipelineData?.data?.legs ?? []}
                variant="compact"
              />
            </CardContent>
          </Card>
        )}

        {/* ── Completed Status ── */}
        {collection.status === "completed" && (
          <div className="sticky bottom-4 z-20 -mx-1 px-1 pt-2">
            <div
              className={cn(
                "animate-collection-completed-banner relative overflow-hidden rounded-xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50/95 via-white/95 to-green-50/95 p-4 backdrop-blur-xl sm:p-5",
                "ring-2 ring-emerald-200/70",
              )}
              role="status"
              aria-live="polite"
            >
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-300/25 blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-8 left-1/4 h-20 w-32 rounded-full bg-green-300/15 blur-2xl"
                aria-hidden
              />

              <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_8px_20px_rgba(16,185,129,0.35)]">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-emerald-950 sm:text-lg">
                        Collection completed
                      </p>
                      <Badge className="border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        All done
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-emerald-800/90">
                      All original documents have been received, verified, and
                      processed.
                      {collection.completedBy && collection.completedAt ? (
                        <>
                          {" "}
                          Completed by{" "}
                          <span className="font-semibold text-emerald-950">
                            {collection.completedBy.name}
                          </span>{" "}
                          on{" "}
                          {format(
                            new Date(collection.completedAt),
                            "dd MMM yyyy",
                          )}
                          .
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="w-fit shrink-0 self-start border-emerald-300 bg-white/80 px-3 py-1.5 text-sm font-semibold text-emerald-700 sm:self-center"
                >
                  {COLLECTION_STATUS_LABELS.completed}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Complete Collection Modal */}
      {collection && (
        <CompleteCollectionModal
          collection={collection}
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          onConfirm={handleComplete}
          isLoading={isCompleting}
        />
      )}
    </div>
  );
}
