import React, { type ComponentType, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  FileStack,
  FileText,
  Loader2,
  Mail,
  Phone,
  Upload,
  Archive,
  User,
  UserCircle2,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCan } from "@/hooks/useCan";
import {
  useCompleteOriginalDocumentCollectionMutation,
  useGetOriginalDocumentCollectionQuery,
  useUpdateOriginalDocumentCollectionEventMutation,
} from "../api";
import { CandidateCollectionHistoryPanel } from "../components/CandidateCollectionHistoryPanel";
import { MergeUploadSection } from "../components/MergeUploadSection";
import { SubmitToLockerSection } from "../components/SubmitToLockerSection";
import { CompleteCollectionModal } from "../components/CompleteCollectionModal";
import {
  COLLECTION_STATUS_LABELS,
  COLLECTION_TYPE_LABELS,
  DIRECT_OFFICE_LABELS,
} from "../constants";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { cn } from "@/lib/utils";

/* ---------- helpers ---------- */

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
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
          isCompleted
            ? "border-emerald-500 bg-emerald-500 text-white"
            : isActive
              ? "border-blue-500 bg-blue-50 text-blue-600"
              : "border-slate-200 bg-slate-50 text-slate-400",
        )}
      >
        {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <p
        className={cn(
          "text-[11px] font-medium",
          isCompleted
            ? "text-emerald-700"
            : isActive
              ? "text-blue-700"
              : "text-slate-400",
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
        "flex items-start gap-2 rounded-lg border border-slate-100 bg-white px-2.5",
        className,
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">
          {value}
        </p>
        {sub ? (
          <p className="truncate text-[10px] text-slate-500">{sub}</p>
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
  const { data, isLoading, isError, refetch } =
    useGetOriginalDocumentCollectionQuery(id, { skip: !id });
  const [completeCollection, { isLoading: isCompleting }] =
    useCompleteOriginalDocumentCollectionMutation();
  const [updateEvent, { isLoading: isUpdating }] =
    useUpdateOriginalDocumentCollectionEventMutation();

  const collection = data?.data;

  // Aggregate all documents across all events to show cumulative checklist
  // MUST be called before any conditional returns (Rules of Hooks)
  const allDocuments = React.useMemo(() => {
    if (!collection?.events) return [];
    
    const docMap = new Map<string, { docType: string; isReceived: boolean }>();
    // Iterate through all events to collect all document types
    collection.events.forEach((event) => {
      event.items.forEach((item) => {
        // If document already exists, mark as received if it's received in ANY event
        const existing = docMap.get(item.docType);
        if (existing) {
          docMap.set(item.docType, {
            docType: item.docType,
            isReceived: existing.isReceived || item.isReceived,
          });
        } else {
          docMap.set(item.docType, {
            docType: item.docType,
            isReceived: item.isReceived,
          });
        }
      });
    });
    return Array.from(docMap.values()).sort((a, b) =>
      a.docType.localeCompare(b.docType)
    );
  }, [collection?.events]);

  const handleComplete = async () => {
    try {
      const result = await completeCollection(id).unwrap();
      toast.success(
        `Collection completed${
          result.syncedDocTypes.length
            ? ` — synced ${result.syncedDocTypes.length} doc type(s) to processing`
            : ""
        }`,
      );
      await refetch();
    } catch (error) {
      toast.error(
        "Complete failed — ensure merge upload and locker submission are done",
      );
      throw error; // Re-throw so modal knows it failed
    }
  };

  const handleToggleItem = async (
    eventId: string,
    docType: string,
    isReceived: boolean,
  ) => {
    if (!collection) return;
    const event = collection.events.find((e) => e.id === eventId);
    if (!event) return;
    
    // Check if the docType exists in the current event
    const existingItem = event.items.find((item) => item.docType === docType);
    
    let items;
    if (existingItem) {
      // Update existing item
      items = event.items.map((item) =>
        item.docType === docType ? { ...item, isReceived } : item,
      );
    } else {
      // Add new item to the event if it doesn't exist
      items = [...event.items, { docType, isReceived, remarks: null }];
    }
    
    try {
      await updateEvent({
        collectionId: id,
        eventId,
        body: {
          items: items.map((item) => ({
            docType: item.docType,
            isReceived: item.isReceived,
            remarks: item.remarks ?? undefined,
          })),
        },
      }).unwrap();
      refetch();
    } catch {
      toast.error("Failed to update checklist");
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

  const docsOnFile = collection.cumulativeReceivedCount ?? 0;

  const statusSteps = [
    { key: "draft", label: "Draft", icon: FileText },
    { key: "merged_uploaded", label: "Merged", icon: Upload },
    { key: "locker_submitted", label: "Locker", icon: Archive },
    { key: "completed", label: "Done", icon: CheckCircle2 },
  ];
  const currentIdx = statusSteps.findIndex((s) => s.key === collection.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="rounded-xl">
              <Link to="/original-documents" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="relative hidden sm:block">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 opacity-70 blur-sm" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 shadow-lg">
                <FileStack className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Collection Details
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {collection.eventCount} intake event
                {collection.eventCount !== 1 ? "s" : ""}
                {latest
                  ? ` · latest ${COLLECTION_TYPE_LABELS[latest.collectionType]}`
                  : ""}
                {sourceDetail ? ` · ${sourceDetail}` : ""}
              </p>
            </div>
          </div>

          {/* Steps + Status */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3">
              {statusSteps.map((step, i) => (
                <div key={step.key} className="flex items-center">
                  <StatusStep
                    icon={step.icon}
                    label={step.label}
                    isActive={i === currentIdx}
                    isCompleted={i < currentIdx}
                  />
                  {i < statusSteps.length - 1 && (
                    <div
                      className={cn(
                        "mx-2 h-0.5 w-8 transition-colors",
                        i < currentIdx ? "bg-emerald-500" : "bg-slate-200",
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "px-3 py-1 text-xs font-semibold",
                getStatusColor(collection.status),
              )}
            >
              {COLLECTION_STATUS_LABELS[collection.status] ?? collection.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Row 1: Candidate Profile + Collection Info side-by-side */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid gap-4 lg:grid-cols-5"
        >
          {/* Candidate Card – takes 3/5 */}
          <Card className="lg:col-span-3 border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-transparent py-2.5 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  Candidate
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Profile strip */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12 border-2 border-white ring-2 ring-slate-100 shadow-sm">
                  <AvatarImage src={cand.profileImage || undefined} alt={fullName} />
                  <AvatarFallback className="bg-gradient-to-br from-slate-500 to-slate-600 text-sm font-bold text-white">
                    {`${cand.firstName?.charAt(0) || ""}${cand.lastName?.charAt(0) || ""}`.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-bold text-slate-900 truncate">
                      {fullName}
                    </p>
                    {cand.currentStatus?.statusName && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        {cand.currentStatus.statusName}
                      </Badge>
                    )}
                  </div>
                  {cand.candidateCode && (
                    <p className="font-mono text-[10px] text-slate-500">
                      {cand.candidateCode}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <InfoTile icon={Mail} label="Email" value={cand.email?.trim() || "—"} className="py-2" />
                <InfoTile icon={Phone} label="Phone" value={formatPhone(cand)} className="py-2" />
                <InfoTile icon={Users} label="Gender" value={formatGender(cand.gender)} className="py-2" />
                <InfoTile icon={Calendar} label="Date of Birth" value={formatDob(cand.dateOfBirth)} className="py-2" />
                <InfoTile
                  icon={Briefcase}
                  label="Profession"
                  value={cand.professionType?.label || cand.professionType?.name || "—"}
                  className="py-2"
                />
                <InfoTile
                  icon={UserCircle2}
                  label="Recruiter"
                  value={recruiter?.name?.trim() || "Not assigned"}
                  sub={recruiter?.email}
                  className="py-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Latest Collection Info – takes 2/5 */}
          <Card className="lg:col-span-2 border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-amber-50/50 to-transparent py-2.5 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
                  <FileStack className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  Latest Collection Info
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              <div className="grid gap-2.5 grid-cols-1">
                <InfoTile
                  icon={User}
                  label="Created By"
                  value={collection.createdBy.name}
                  sub={collection.createdBy.email}
                  className="py-2"
                />
                <InfoTile
                  icon={Calendar}
                  label="Latest Intake"
                  value={
                    latest
                      ? format(new Date(latest.collectedAt), "dd MMM yyyy, h:mm a")
                      : "—"
                  }
                  sub={latest?.collectedBy.name}
                  className="py-2"
                />
                <InfoTile
                  icon={FileStack}
                  label="Documents On File"
                  value={`${docsOnFile} received`}
                  className="py-2"
                />
                {collection.completedBy && (
                  <InfoTile
                    icon={CheckCircle2}
                    label="Completed By"
                    value={collection.completedBy.name}
                    sub={collection.completedBy.email}
                    className="py-2"
                  />
                )}
              </div>
              {canWrite && collection.status !== "completed" && (
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <Link
                    to={`/original-documents/new?candidateId=${collection.candidateId}&collectionId=${collection.id}`}
                  >
                    Log Intake Event
                  </Link>
                </Button>
              )}
              {collection.status === "completed" && (
                <div className="rounded-lg border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-3 mt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-900">
                      Collection Completed
                    </p>
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-1">
                    All documents received and processed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Collection history for this candidate */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <CandidateCollectionHistoryPanel
            candidateId={collection.candidateId}
            variant="full"
            highlightEventId={latest?.id}
            showAddEventLink={false}
          />
        </motion.div>

        {/* Row 2: Checklist + Merge/Locker side-by-side */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="grid gap-4 lg:grid-cols-2"
        >
          {/* Latest event checklist */}
          <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-transparent py-2.5 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Latest Event Checklist
                  </CardTitle>
                  <p className="text-[10px] text-slate-500">
                    {docsOnFile} documents on file across all events
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {allDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No intake events yet.
                </p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
                  {allDocuments.map((item, index) => {
                    const label =
                      getDocumentTypeConfig(item.docType)?.displayName ??
                      item.docType;
                    // Cycle through colors for variety
                    const colors = [
                      {
                        border: "border-emerald-200",
                        bg: "bg-gradient-to-r from-emerald-50 to-green-50",
                        text: "text-emerald-800",
                        check: "border-emerald-500 bg-emerald-500",
                        icon: "bg-emerald-500",
                      },
                      {
                        border: "border-blue-200",
                        bg: "bg-gradient-to-r from-blue-50 to-cyan-50",
                        text: "text-blue-800",
                        check: "border-blue-500 bg-blue-500",
                        icon: "bg-blue-500",
                      },
                      {
                        border: "border-purple-200",
                        bg: "bg-gradient-to-r from-purple-50 to-pink-50",
                        text: "text-purple-800",
                        check: "border-purple-500 bg-purple-500",
                        icon: "bg-purple-500",
                      },
                      {
                        border: "border-amber-200",
                        bg: "bg-gradient-to-r from-amber-50 to-orange-50",
                        text: "text-amber-800",
                        check: "border-amber-500 bg-amber-500",
                        icon: "bg-amber-500",
                      },
                      {
                        border: "border-indigo-200",
                        bg: "bg-gradient-to-r from-indigo-50 to-blue-50",
                        text: "text-indigo-800",
                        check: "border-indigo-500 bg-indigo-500",
                        icon: "bg-indigo-500",
                      },
                    ];
                    const color = item.isReceived
                      ? colors[index % colors.length]
                      : {
                          border: "border-slate-200",
                          bg: "bg-white",
                          text: "text-slate-700",
                          check: "border-slate-300",
                          icon: "bg-slate-500",
                        };
                    return (
                      <div
                        key={item.docType}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-all",
                          item.isReceived
                            ? `${color.border} ${color.bg} shadow-sm`
                            : `${color.border} ${color.bg} hover:border-slate-300`,
                        )}
                      >
                        <Checkbox
                          id={`item-${item.docType}`}
                          checked={item.isReceived}
                          disabled={
                            !canWrite ||
                            isUpdating ||
                            !latest ||
                            collection.status === "completed"
                          }
                          onCheckedChange={(checked) => {
                            if (!latest || collection.status === "completed") return;
                            handleToggleItem(
                              latest.id,
                              item.docType,
                              checked === true,
                            );
                          }}
                          className={cn("h-4 w-4", item.isReceived && color.check)}
                        />
                        <Label
                          htmlFor={`item-${item.docType}`}
                          className={cn(
                            "flex-1 text-xs font-medium",
                            collection.status === "completed"
                              ? "cursor-default"
                              : "cursor-pointer",
                            color.text,
                          )}
                        >
                          {label}
                        </Label>
                        {item.isReceived && (
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-full shrink-0",
                              color.icon,
                            )}
                          >
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Merge + Locker */}
          <div className="space-y-4">
            <MergeUploadSection collection={collection} onUpdated={refetch} />
            <SubmitToLockerSection collection={collection} onUpdated={refetch} />
          </div>
        </motion.div>

        {/* ── Complete Action ── */}
        {canWrite && collection.status !== "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
            className="sticky bottom-4 z-10 rounded-xl border border-slate-200 bg-white/90 backdrop-blur-xl p-4 shadow-xl"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Ready to complete?
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {!collection.mergedDocumentId
                      ? "Upload merged document first"
                      : !collection.lockerSubmittedAt
                        ? "Submit to locker first"
                        : "All requirements met — you can finalize now"}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowCompleteModal(true)}
                disabled={
                  !collection.mergedDocumentId ||
                  !collection.lockerSubmittedAt
                }
                size="default"
                className="gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg px-6"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Collection
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Completed Status ── */}
        {collection.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
            className="sticky bottom-4 z-10 rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 p-5 shadow-xl"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-900">
                  Collection Completed Successfully
                </p>
                <p className="text-sm text-emerald-700 mt-1">
                  All original documents have been received, verified, and processed
                  {collection.completedBy && collection.completedAt && (
                    <>
                      {" "}
                      · Completed by {collection.completedBy.name} on{" "}
                      {format(new Date(collection.completedAt), "dd MMM yyyy")}
                    </>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
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
