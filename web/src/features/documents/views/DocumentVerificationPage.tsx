import { useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Status filter dropdown removed — tiles act as status filters now
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label as FormLabel } from "@/components/ui/label";
import {
  Search,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  Building2,
  FileText,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useGetVerificationCandidatesQuery, useGetVerifiedRejectedDocumentsQuery } from "@/features/documents";
import { useCan } from "@/hooks/useCan";
import { useAppSelector } from "@/app/hooks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import VerificationActionsMenu from "../components/VerificationActionsMenu";
import { ProjectRoleFilter, type ProjectRoleFilterValue } from "@/components/molecules";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import { BulkSendToClientModal } from "../components/BulkSendToClientModal";
import { ClientForwardHistoryModal } from "../components/ClientForwardHistoryModal";
// import TypedHeader from "@/components/molecules/TypedHeader";
type VerificationCountsPayload = {
  pending?: number;
  verified?: number;
  rejected?: number;
  client_revision_requested?: number;
  verification_in_progress_document?: number;
};

function formatPhoneForLink(candidate: {
  countryCode?: string;
  mobileNumber?: string;
  contact?: string;
}): string | null {
  const raw = `${candidate.countryCode ?? ""}${candidate.mobileNumber ?? candidate.contact ?? ""}`;
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

function formatPhoneDisplay(candidate: {
  countryCode?: string;
  mobileNumber?: string;
  contact?: string;
}): string | null {
  const code = candidate.countryCode?.trim();
  const mobile = candidate.mobileNumber?.trim() || candidate.contact?.trim();
  if (!mobile) return null;
  return `${code ? `${code} ` : ""}${mobile}`;
}

function extractVerificationCounts(queryResult: unknown): VerificationCountsPayload {
  if (!queryResult || typeof queryResult !== "object") {
    return {};
  }

  const root = queryResult as {
    data?: { counts?: VerificationCountsPayload } | VerificationCountsPayload;
    counts?: VerificationCountsPayload;
  };

  const nestedData = root.data;
  if (nestedData && typeof nestedData === "object" && "counts" in nestedData) {
    return nestedData.counts ?? {};
  }

  if (nestedData && typeof nestedData === "object" && "pending" in nestedData) {
    return nestedData as VerificationCountsPayload;
  }

  return root.counts ?? {};
}

/** Oldest candidates first (FIFO), matching verification queue order. */
function sortVerificationCandidatesAscending(rows: any[]): any[] {
  return [...rows].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;

    const aName = `${a.candidate?.firstName ?? ""} ${a.candidate?.lastName ?? ""}`
      .trim()
      .toLowerCase();
    const bName = `${b.candidate?.firstName ?? ""} ${b.candidate?.lastName ?? ""}`
      .trim()
      .toLowerCase();
    return aName.localeCompare(bName);
  });
}

const accentStyles: Record<string, { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }> = {
  blue: { card: "from-blue-50 via-white to-blue-50/30 border-blue-100", icon: "text-blue-600", iconBg: "bg-blue-100", value: "text-blue-700", ring: "ring-blue-400/50", dot: "bg-blue-500" },
  emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", value: "text-emerald-700", ring: "ring-emerald-400/50", dot: "bg-emerald-500" },
  red: { card: "from-red-50 via-white to-red-50/30 border-red-100", icon: "text-red-600", iconBg: "bg-red-100", value: "text-red-700", ring: "ring-red-400/50", dot: "bg-red-500" },
  orange: { card: "from-orange-50 via-white to-orange-50/30 border-orange-100", icon: "text-orange-600", iconBg: "bg-orange-100", value: "text-orange-700", ring: "ring-orange-400/50", dot: "bg-orange-500" },
};

export default function DocumentVerificationPage() {
  const navigate = useNavigate();
  const canReadDocuments = useCan("read:documents");
  const user = useAppSelector((s) => s.auth.user);
  // Only treat a user as a strict recruiter for filtering when they have the explicit "Recruiter" role
  const isStrictRecruiter = (user?.roles || []).includes("Recruiter");

  // State
  const [searchTerm, setSearchTerm] = useState("");
  // default to verification_in_progress_document so the list shows candidates needing verification
  const [statusFilter, setStatusFilter] = useState(
    "verification_in_progress_document"
  );
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [verificationDialog, setVerificationDialog] = useState(false);
  const [verificationAction, setVerificationAction] = useState<
    "verify" | "reject"
  >("verify");
  const [verificationNotes, setVerificationNotes] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleStatusTileClick = (
    status:
      | "verification_in_progress_document"
      | "documents_verified"
      | "rejected_documents"
      | "client_revision_requested"
  ) => {
    setStatusFilter(status);
    setCurrentPage(1);
    window.requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const [screeningFilter, setScreeningFilter] = useState(false);
  const [projectRoleFilter, setProjectRoleFilter] = useState<ProjectRoleFilterValue>({
    projectId: "all",
    roleCatalogId: "all",
  });
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [bulkSendModalOpen, setBulkSendModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalData, setHistoryModalData] = useState<any>(null);

  const handleProjectRoleChange = useCallback((value: ProjectRoleFilterValue) => {
    setProjectRoleFilter(value);
    setCurrentPage(1);
  }, []);

  const handleSelectCandidate = (candidateId: string) => {
    const newSelected = new Set(selectedCandidateIds);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidateIds(newSelected);
    
    // Check against only selectable candidates
    const selectableCandidates = candidateProjects.filter(cp => !cp.isInInterview && cp.docsStatus !== "pending");
    setSelectAll(newSelected.size === selectableCandidates.length && selectableCandidates.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCandidateIds(new Set());
      setSelectAll(false);
    } else {
      // Only select candidates that are NOT in interview and NOT pending
      const selectableIds = candidateProjects
        .filter(cp => !cp.isInInterview && cp.docsStatus !== "pending")
        .map((cp: any) => cp.id || cp.candidateProjectMapId);
      
      setSelectedCandidateIds(new Set(selectableIds));
      setSelectAll(selectableIds.length > 0);
    }
  };

  const handleBulkSendToClient = () => {
    setBulkSendModalOpen(true);
  };

  const sharedListFilters = {
    projectId: projectRoleFilter.projectId === "all" ? undefined : projectRoleFilter.projectId,
    roleCatalogId: projectRoleFilter.roleCatalogId === "all" ? undefined : projectRoleFilter.roleCatalogId,
    search: searchTerm || undefined,
    recruiterId: isStrictRecruiter ? user?.id : undefined,
    screening: screeningFilter || undefined,
  };

  // Always fetch tile counts (regardless of active tile) so badges stay in sync.
  // `forTileCounts` is ignored by the backend but keeps a dedicated RTK cache entry.
  const tileCountsQuery = useGetVerificationCandidatesQuery(
    {
      ...sharedListFilters,
      page: 1,
      limit: 1,
      forTileCounts: true,
    },
    { refetchOnMountOrArgChange: true },
  );

  // Always fetch verified/rejected tile counts (verification history semantics).
  const verifiedRejectedCountsQuery = useGetVerifiedRejectedDocumentsQuery(
    {
      status: "verified",
      ...sharedListFilters,
      page: 1,
      limit: 1,
    },
    { refetchOnMountOrArgChange: true },
  );

  // Pending (verification candidates) query — only call when viewing pending / in-progress
  const verificationCandidatesQuery = useGetVerificationCandidatesQuery(
    {
      ...sharedListFilters,
      status: statusFilter === "all" ? undefined : statusFilter,
      page: currentPage,
      limit: 10,
    },
    { 
      skip: statusFilter !== "verification_in_progress_document" && statusFilter !== "client_revision_requested",
    }
  );

  // Verified / Rejected documents query — only call when viewing verified or rejected lists
  // Always fetch verified/rejected counts (we'll merge counts from both endpoints)
  const verifiedRejectedQuery = useGetVerifiedRejectedDocumentsQuery({
    status:
      statusFilter === "documents_verified"
        ? "verified"
        : statusFilter === "rejected_documents"
        ? "rejected"
        : "verified",
    ...sharedListFilters,
    page: currentPage,
    limit: 10,
  }, {
    skip:
      statusFilter !== "documents_verified" &&
      statusFilter !== "rejected_documents",
  });

  // Normalize data for table rendering
  const verificationData = verificationCandidatesQuery.data;
  const verifiedRejectedData = verifiedRejectedQuery.data;

  const isLoading = 
    tileCountsQuery.isLoading ||
    verifiedRejectedCountsQuery.isLoading ||
    verificationCandidatesQuery.isLoading || 
    verifiedRejectedQuery.isLoading;
    
  const error = 
    tileCountsQuery.error ||
    verifiedRejectedCountsQuery.error ||
    verificationCandidatesQuery.error || 
    verifiedRejectedQuery.error;

  // Refresh both endpoints to keep counts and lists in sync
  const refetch = () => {
    if (tileCountsQuery.status !== 'uninitialized') {
      tileCountsQuery.refetch?.();
    }
    if (verifiedRejectedCountsQuery.status !== 'uninitialized') {
      verifiedRejectedCountsQuery.refetch?.();
    }
    if (verificationCandidatesQuery.status !== 'uninitialized') {
      verificationCandidatesQuery.refetch?.();
    }
    if (verifiedRejectedQuery.status !== 'uninitialized') {
      verifiedRejectedQuery.refetch?.();
    }
  };

  let candidateProjects: any[] = [];
  let totalCandidates = 0;
  let totalPages = 1;

  if (statusFilter === "verification_in_progress_document" || statusFilter === "client_revision_requested") {
    candidateProjects = verificationData?.data?.items || verificationData?.data?.candidateProjects || [];
    totalCandidates = verificationData?.data?.pagination?.total || candidateProjects.length;
    totalPages = verificationData?.data?.pagination?.totalPages || 1;
  } else {
    // Map verified/rejected items into candidateProject-like rows grouped by candidateProjectMap.id
    // Support both shapes: 1) flat verification records with `candidateProjectMap` wrapper
    // and 2) grouped rows already containing `candidate`, `project`, and `documentVerifications`.
    const items = verifiedRejectedData?.data?.items || [];
    const map = new Map<string, any>();

    items.forEach((it: any) => {
      // Case A: verification record with nested candidateProjectMap
      const cpm = it.candidateProjectMap;
      if (cpm) {
        const id = cpm.id;
        const existing = map.get(id) || {
          id,
          candidate: cpm.candidate,
          project: cpm.project,
          documentVerifications: [],
          recruiter: it.recruiter || cpm.recruiter,
          screening: it.screening || cpm.screening,
          sendToClient: it.sendToClient || cpm.sendToClient,
          roleNeeded: it.roleNeeded || cpm.roleNeeded,
          // preserve interview state when present so UI can disable selection
          isInInterview: (cpm as any).isInInterview || it.isInInterview || false,
          awaitingResubmitToClient:
            it.awaitingResubmitToClient || (cpm as any).awaitingResubmitToClient || false,
          // surface API-provided statuses so UI can show subStatus/mainStatus
          subStatus: (it as any).subStatus || (cpm as any).subStatus || null,
          mainStatus: (it as any).mainStatus || (cpm as any).mainStatus || null,
        };
        map.set(id, existing);
        return;
      }

      // Case B: endpoint returns grouped candidateProject-like rows
      // Use candidateProjectMapId if available, otherwise fall back to a generated key
      const groupedId = it.candidateProjectMapId || it.id || (it.candidate?.id && it.project?.id ? `${it.candidate.id}-${it.project.id}` : undefined);
      if (!groupedId) return;

      const existing2 = map.get(groupedId) || {
        id: groupedId,
        createdAt: it.createdAt ?? null,
        candidate: it.candidate || null,
        project: it.project || null,
        documentVerifications: [],
        recruiter: it.recruiter || null,
        screening: it.screening || null,
        sendToClient: it.sendToClient || null,
        roleNeeded: it.roleNeeded || null,
        // ensure interview flag is preserved when backend provides it
        isInInterview: (it as any).isInInterview || false,
        awaitingResubmitToClient: (it as any).awaitingResubmitToClient || false,
        // surface API-provided statuses so UI can show subStatus/mainStatus
        subStatus: (it as any).subStatus || null,
        mainStatus: (it as any).mainStatus || null,
      };

      if (Array.isArray(it.documentVerifications) && it.documentVerifications.length > 0) {
        existing2.documentVerifications = existing2.documentVerifications.concat(it.documentVerifications);
      } else if (it.document) {
        existing2.documentVerifications.push({
          id: it.id,
          status: it.status,
          notes: it.notes,
          rejectionReason: it.rejectionReason,
          verifiedAt: it.status === "verified" ? it.updatedAt || it.createdAt : undefined,
          rejectedAt: it.status === "rejected" ? it.updatedAt || it.createdAt : undefined,
          document: it.document,
        });
      }

      map.set(groupedId, existing2);
    });

    candidateProjects = Array.from(map.values());
    totalCandidates = verifiedRejectedData?.data?.pagination?.total || candidateProjects.length;
    totalPages = verifiedRejectedData?.data?.pagination?.totalPages || 1;
  }

  candidateProjects = sortVerificationCandidatesAscending(candidateProjects);

  // Permission check
  if (!canReadDocuments) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-[98%] mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Access Denied
                </h2>
                <p className="text-muted-foreground">
                  You don't have permission to view document verification.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleRejectCandidate = (candidateProject: any) => {
    setSelectedCandidate(candidateProject);
    setVerificationAction("reject");
    setVerificationDialog(true);
  };

  const handleSubmitVerification = async () => {
    if (!selectedCandidate) return;

    try {
      if (verificationAction === "verify") {
        toast.success("Candidate documents verified successfully");
      } else {
        toast.success("Candidate documents rejected successfully");
      }

      setVerificationDialog(false);
      setVerificationNotes("");
      setSelectedCandidate(null);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update document status");
    }
  };

  // Calculate status counts from API data (prefer server-supplied counts when available)
  const statusCounts = useMemo(() => {
    const tileCounts = extractVerificationCounts(tileCountsQuery.data);
    const listCounts = extractVerificationCounts(verificationCandidatesQuery.data);
    const verifiedRejectedTileCounts = extractVerificationCounts(verifiedRejectedCountsQuery.data);
    const verifiedCounts = extractVerificationCounts(verifiedRejectedQuery.data);

    const counts = { ...listCounts, ...tileCounts };

    const pending = Number(
      counts.pending ?? counts.verification_in_progress_document ?? 0
    );

    const verified = Number(
      verifiedRejectedTileCounts.verified ?? verifiedCounts.verified ?? counts.verified ?? 0
    );
    const rejected = Number(
      verifiedRejectedTileCounts.rejected ?? verifiedCounts.rejected ?? counts.rejected ?? 0
    );
    const clientRevisionFromList =
      statusFilter === "client_revision_requested"
        ? Number(verificationData?.data?.pagination?.total ?? 0)
        : 0;
    const clientRevisionRequested = Number(
      tileCounts.client_revision_requested ??
      counts.client_revision_requested ??
      verifiedCounts.client_revision_requested ??
      clientRevisionFromList ??
      0
    );

    return {
      verification_in_progress_document: pending,
      documents_submitted: 0,
      verification_in_progress: pending,
      documents_verified: verified,
      rejected_documents: rejected,
      client_revision_requested: clientRevisionRequested,
    };
  }, [
    tileCountsQuery.data,
    verifiedRejectedCountsQuery.data,
    verificationCandidatesQuery.data,
    verifiedRejectedQuery.data,
    statusFilter,
    verificationData?.data?.pagination?.total,
  ]);

  // Get candidate data for bulk send modal
  // Only include candidates with verified documents (exclude pending)
  const selectedCandidatesForModal = useMemo(() => {
    return candidateProjects.filter(cp => 
      selectedCandidateIds.has(cp.id || cp.candidateProjectMapId) &&
      cp.docsStatus !== "pending" && // Exclude candidates with pending documents
      !cp.isInInterview // Exclude candidates already in interview
    );
  }, [candidateProjects, selectedCandidateIds]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-[98%] mx-auto space-y-4">
        {/* Compact Header */}
        <DashboardWelcomeHeader
          userName={user?.name || "Verifier"}
          subtitle="Review and verify candidate documents with enterprise-grade precision"
        />

        {/* Tiles Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pending Candidates Tile */}
          {(() => {
            const s = accentStyles.blue;
            const isActive = statusFilter === "verification_in_progress_document";
            return (
              <button
                type="button"
                onClick={() => handleStatusTileClick("verification_in_progress_document")}
                className={cn(
                  "group relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200 focus:outline-none",
                  s.card,
                  isActive ? `ring-2 shadow-md ${s.ring}` : "hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                {isActive && (
                  <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Candidates</p>
                    <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{statusCounts.verification_in_progress_document}</p>
                    <p className="text-xs text-slate-500">For verification</p>
                  </div>
                  <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                    <User className={cn("h-5 w-5", s.icon)} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                  <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </button>
            );
          })()}

          {/* Verified Documents Tile */}
          {(() => {
            const s = accentStyles.emerald;
            const isActive = statusFilter === "documents_verified";
            return (
              <button
                type="button"
                onClick={() => handleStatusTileClick("documents_verified")}
                className={cn(
                  "group relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200 focus:outline-none",
                  s.card,
                  isActive ? `ring-2 shadow-md ${s.ring}` : "hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                {isActive && (
                  <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Verified Documents</p>
                    <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{statusCounts.documents_verified}</p>
                    <p className="text-xs text-slate-500">Verification history</p>
                  </div>
                  <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                    <Building2 className={cn("h-5 w-5", s.icon)} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                  <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </button>
            );
          })()}

          {/* Rejected Documents Tile */}
          {(() => {
            const s = accentStyles.red;
            const isActive = statusFilter === "rejected_documents";
            return (
              <button
                type="button"
                onClick={() => handleStatusTileClick("rejected_documents")}
                className={cn(
                  "group relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200 focus:outline-none",
                  s.card,
                  isActive ? `ring-2 shadow-md ${s.ring}` : "hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                {isActive && (
                  <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rejected Documents</p>
                    <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{statusCounts.rejected_documents}</p>
                    <p className="text-xs text-slate-500">Rejection history</p>
                  </div>
                  <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                    <XCircle className={cn("h-5 w-5", s.icon)} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                  <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </button>
            );
          })()}

          {/* Client Revision Requested Tile */}
          {(() => {
            const s = accentStyles.orange;
            const isActive = statusFilter === "client_revision_requested";
            return (
              <button
                type="button"
                onClick={() => handleStatusTileClick("client_revision_requested")}
                className={cn(
                  "group relative text-left rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200 focus:outline-none",
                  s.card,
                  isActive ? `ring-2 shadow-md ${s.ring}` : "hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                {isActive && (
                  <span className={cn("absolute top-3 right-3 h-2 w-2 rounded-full animate-pulse", s.dot)} />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Client Revision Requested</p>
                    <p className={cn("text-3xl font-bold tabular-nums", s.value)}>
                      {tileCountsQuery.isLoading && !tileCountsQuery.data
                        ? "—"
                        : statusCounts.client_revision_requested}
                    </p>
                    <p className="text-xs text-slate-500">Awaiting corrections</p>
                  </div>
                  <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                    <RotateCcw className={cn("h-5 w-5", s.icon)} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                  <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </button>
            );
          })()}
        </div>

        {/* Unified Table Container */}
        <div
          ref={tableRef}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 sm:px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
              <div className="relative min-w-0 flex-1 w-full group">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                <Input
                  placeholder="Search candidates or files..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 w-full pl-10 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-blue-500/10 rounded-xl transition-all"
                />
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:shrink-0">
                <div className="w-full min-w-0 sm:flex-1 lg:w-auto lg:min-w-[280px] lg:max-w-[420px] [&_button]:h-11 [&_button]:rounded-xl">
                  <ProjectRoleFilter
                    value={projectRoleFilter}
                    onChange={handleProjectRoleChange}
                    className="w-full gap-2"
                  />
                </div>

                <div className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                  <Checkbox
                    id="screening-filter"
                    checked={screeningFilter}
                    onCheckedChange={(checked) => {
                      setScreeningFilter(checked as boolean);
                      setCurrentPage(1);
                    }}
                  />
                  <label
                    htmlFor="screening-filter"
                    className="cursor-pointer whitespace-nowrap text-xs font-semibold text-slate-600"
                  >
                    Screening Approved Only
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                  <User className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {(() => {
                      switch (statusFilter) {
                        case "documents_verified":
                          return "Verified Candidates";
                        case "verification_in_progress_document":
                          return "In-progress Candidates";
                        case "rejected_documents":
                          return "Rejected Candidates";
                        case "client_revision_requested":
                          return "Client Revision Requested";
                        default:
                          return "Candidates for Verification";
                      }
                    })()}
                  </h2>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-gray-900">{totalCandidates}</span>{" "}
                    {totalCandidates === 1 ? "candidate" : "candidates"} found
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isLoading && <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />}
                {statusFilter === "documents_verified" && selectedCandidatesForModal.length > 0 && (
                  <Button
                    onClick={handleBulkSendToClient}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    size="sm"
                  >
                    Bulk Send to Client ({selectedCandidatesForModal.length})
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-0">

  {/* Loading */}
  {isLoading && (
    <div className="py-24 text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
      <p className="mt-3 text-sm text-gray-500">Loading candidates...</p>
    </div>
  )}

  {/* Error */}
  {error && (
    <div className="py-24 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
      <p className="mt-4 text-sm font-medium text-gray-900">Failed to load candidates</p>
      <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
        Try Again
      </Button>
    </div>
  )}

  {/* Table */}
  {!isLoading && !error && candidateProjects.length > 0 && (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50/50 border-b border-gray-200">
          {statusFilter === "documents_verified" && (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600 w-12">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                className="rounded"
              />
            </TableHead>
          )}
          <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
            Candidate
          </TableHead>
          <TableHead className="h-11 px-6 text-center text-xs font-medium uppercase tracking-wider text-gray-600">
            Contact
          </TableHead>
          <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
            Project
          </TableHead>
          
          {statusFilter === "documents_verified" ? (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Verified
            </TableHead>
          ) : statusFilter === "verification_in_progress_document" ? (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Pending / Submitted
            </TableHead>
          ) : statusFilter === "rejected_documents" ? (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Rejected
            </TableHead>
          ) : statusFilter === "client_revision_requested" ? (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Document Status
            </TableHead>
          ) : (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Status
            </TableHead>
          )}

          <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
            Screening Details
          </TableHead>
          {statusFilter === "documents_verified" && (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Sent to Client
            </TableHead>
          )}
          <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
            Recruiter
          </TableHead>
          <TableHead className="h-11 px-6 text-right text-xs font-medium uppercase tracking-wider text-gray-600">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {candidateProjects.map((candidateProject: any, index: number) => {
          const status = candidateProject?.subStatus?.label || candidateProject?.status?.sub || "";

          return (
            <motion.tr
              key={candidateProject.id || candidateProject.candidateProjectMapId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70 transition-colors",
                statusFilter === "verification_in_progress_document" ? "relative group" : ""
              )}
              data-tooltip={statusFilter === "verification_in_progress_document" ? "Please verify the documents" : undefined}
            >
              {statusFilter === "documents_verified" && (
                <TableCell className="px-6 py-5 w-12 relative group">
                  {candidateProject.isInInterview ? (
                    <div className="flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded-md whitespace-nowrap pointer-events-none shadow-xl border border-gray-800">
                        Candidate already in interview
                      </div>
                    </div>
                  ) : candidateProject.docsStatus === "pending" ? (
                    <div className="flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded-md whitespace-nowrap pointer-events-none shadow-xl border border-gray-800">
                        Documents still pending
                      </div>
                    </div>
                  ) : (
                    <Checkbox
                      checked={selectedCandidateIds.has(candidateProject.id || candidateProject.candidateProjectMapId)}
                      onCheckedChange={() => handleSelectCandidate(candidateProject.id || candidateProject.candidateProjectMapId)}
                      className="rounded"
                    />
                  )}
                </TableCell>
              )}
              <TableCell className="px-6 py-5">
                <div className="flex items-center gap-4">
                  {candidateProject.candidate.profileImage ? (
                    <img
                      src={candidateProject.candidate.profileImage}
                      alt={`${candidateProject.candidate.firstName || ''} ${candidateProject.candidate.lastName || ''}`.trim()}
                      className="h-10 w-10 rounded-full object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20 text-sm font-medium text-white">
                      {candidateProject.candidate.firstName?.[0]?.toUpperCase() || "A"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <button
                      onClick={() =>
                        navigate(
                          `/candidates/${candidateProject.candidate.id}/documents/${candidateProject.project.id}`
                        )
                      }
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {candidateProject.candidate.firstName} {candidateProject.candidate.lastName}
                    </button>
                    {candidateProject.candidate.candidateCode ? (
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {candidateProject.candidate.candidateCode}
                      </p>
                    ) : null}
                  </div>
                </div>
              </TableCell>

              <TableCell className="px-6 py-5 text-center">
                {(() => {
                  const candidate = candidateProject.candidate;
                  const phoneDigits = formatPhoneForLink(candidate);
                  const phoneDisplay = formatPhoneDisplay(candidate);
                  const hasContact = phoneDisplay || candidate.email;

                  if (!hasContact) {
                    return <span className="text-slate-400 text-xs">—</span>;
                  }

                  return (
                    <div className="w-full min-w-0 flex flex-col items-center gap-2 text-xs text-slate-500">
                      {phoneDisplay ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <TooltipProvider>
                            <div className="flex items-center justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-green-600 hover:bg-green-100 hover:text-green-700"
                                    disabled={!phoneDigits}
                                    aria-label={`WhatsApp ${candidate.firstName ?? "candidate"}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (phoneDigits) {
                                        window.open(
                                          `https://wa.me/${phoneDigits}`,
                                          "_blank",
                                        );
                                      }
                                    }}
                                  >
                                    <FaWhatsapp className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">WhatsApp</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                                    disabled={!phoneDigits}
                                    aria-label={`Call ${candidate.firstName ?? "candidate"}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (phoneDigits) {
                                        window.location.href = `tel:${phoneDigits}`;
                                      }
                                    }}
                                  >
                                    <Phone className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">Call</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                          <div className="flex items-center justify-center gap-1.5">
                            <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="text-gray-700 whitespace-nowrap">
                              {phoneDisplay}
                            </span>
                          </div>
                        </div>
                      ) : null}
                      {candidate.email ? (
                        <div className="flex items-center justify-center gap-1.5 max-w-[180px]">
                          <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="text-gray-700 break-all">
                            {candidate.email}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </TableCell>

              <TableCell className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {candidateProject.project.title}
                    </p>
                    {candidateProject.roleNeeded?.roleCatalog?.label ? (
                      <p className="text-xs font-semibold text-blue-600">
                        {candidateProject.roleNeeded.roleCatalog.label}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        {candidateProject.project.client?.name || candidateProject.project.clientName || "—"}
                      </p>
                    )}
                    {candidateProject.roleNeeded?.roleCatalog?.label && (
                      <p className="text-[10px] text-gray-400">
                        {candidateProject.project.client?.name || candidateProject.project.clientName || "—"}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>

              {/* Dynamic status/summary column */}
              <TableCell className="px-6 py-5">
                {(() => {
                  const docs = candidateProject.documentVerifications || [];
                  const totalDocs = docs.length;
                  const verifiedCount = docs.filter((d: any) => d.status === "verified").length;
                  const pendingCount = docs.filter((d: any) => d.status === "pending" || d.status === "verification_in_progress").length;
                  const rejectedCount = docs.filter((d: any) => d.status === "rejected").length;

                  const subStatusLabel = candidateProject.subStatus?.label || candidateProject.subStatus?.name || null;

                  const renderSubStatus = () =>
                    subStatusLabel ? (
                      <div className="mt-2">
                        <Badge className="text-[10px] px-2 py-0.5">{subStatusLabel}</Badge>
                      </div>
                    ) : null;

                  if (statusFilter === "documents_verified") {
                    const lastVerified = docs
                      .filter((d: any) => d.status === "verified")
                      .map((d: any) => d.verifiedAt)
                      .filter(Boolean)
                      .sort()
                      .reverse()[0];

                    return (
                      <div className="text-sm text-gray-700">
                        <div className="font-medium">{verifiedCount} / {totalDocs} verified</div>
                        {lastVerified ? (
                          <div className="text-xs text-gray-500">Last: {new Date(lastVerified).toLocaleDateString()}</div>
                        ) : null}
                        {candidateProject.awaitingResubmitToClient && (
                          <Badge
                            variant="outline"
                            className="mt-2 bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-semibold"
                          >
                            2nd submission pending
                          </Badge>
                        )}
                        {renderSubStatus()}
                      </div>
                    );
                  }

                  if (statusFilter === "verification_in_progress_document") {
                    const documentSummary = candidateProject.documentSummary;
                    const hasMissing =
                      documentSummary && documentSummary.missingCount > 0;

                    return (
                      <div className="text-sm text-gray-700">
                        <div className="font-medium">Pending: {pendingCount}</div>
                        <div className="text-xs text-gray-500">Submitted: {totalDocs}</div>
                        {hasMissing ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                                  aria-hidden
                                />
                                {documentSummary.submittedCount}/
                                {documentSummary.requiredCount} submitted ·{" "}
                                {documentSummary.missingCount} missing
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              <p className="font-semibold mb-1">Missing documents</p>
                              <ul className="list-disc pl-4 space-y-0.5">
                                {documentSummary.missingDocTypes.map((docType: string) => (
                                  <li key={docType}>{docType}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                        {renderSubStatus()}
                      </div>
                    );
                  }

                  if (statusFilter === "rejected_documents") {
                    const lastRejected = docs
                      .filter((d: any) => d.status === "rejected")
                      .map((d: any) => ({at: d.rejectedAt, reason: d.rejectionReason}))
                      .filter((x: any) => x.at)
                      .sort((a: any, b: any) => (a.at > b.at ? -1 : 1))[0];

                    return (
                      <div className="text-sm text-gray-700">
                        <div className="font-medium">Rejected: {rejectedCount}</div>
                        {lastRejected?.reason ? (
                          <div className="text-xs text-gray-500 truncate max-w-[20rem]">Reason: {lastRejected.reason}</div>
                        ) : null}
                        {renderSubStatus()}
                      </div>
                    );
                  }

                  if (statusFilter === "client_revision_requested") {
                    const resubmissionCount = docs.filter((d: any) => d.status === "resubmission_required").length;

                    return (
                      <div className="text-sm text-gray-700">
                        <div className="font-medium">
                          Verified: {verifiedCount} · Rejected: {rejectedCount} · Resubmit: {resubmissionCount}
                        </div>
                        <div className="text-xs text-gray-500">Total documents: {totalDocs}</div>
                        {renderSubStatus()}
                      </div>
                    );
                  }

                  return (
                    <div className="text-sm text-gray-700">
                      <div className="font-medium">{status}</div>
                      {renderSubStatus()}
                    </div>
                  );
                })()}
              </TableCell>

              {/* Documents / Screening Details */}
              <TableCell className="px-6 py-5 text-sm text-gray-600">
                <div>
                  {candidateProject.screening ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize bg-blue-50 text-blue-700 border-blue-200 font-semibold ring-0">
                            {candidateProject.screening.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold ring-0">
                            {candidateProject.screening.decision}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                          Rating: {candidateProject.screening.overallRating}%
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No screening info</span>
                    )}
                </div>
              </TableCell>

              {/* Sent to Client Column (Screening Approved & Verified only) */}
              {statusFilter === "documents_verified" && (
                <TableCell className="px-6 py-5">
                  {candidateProject.sendToClient ? (
                    <div className="flex items-center gap-2 group/sent">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
                          {candidateProject.sendToClient.recipientEmail}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-[9px] px-1 py-0 uppercase font-bold",
                              candidateProject.sendToClient.status === 'sent' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            )}
                          >
                            {candidateProject.sendToClient.status}
                          </Badge>
                          {candidateProject.sendToClient.isBulk && (
                            <Badge className="bg-blue-50 text-blue-700 text-[9px] px-1 py-0 font-bold border-blue-100">
                              Bulk
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover/sent:opacity-100 transition-opacity"
                        onClick={() => {
                          setHistoryModalData({
                            candidateId: candidateProject.candidate.id,
                            projectId: candidateProject.project.id,
                            roleCatalogId: candidateProject.roleNeeded?.roleCatalog?.id,
                            candidateName: `${candidateProject.candidate.firstName} ${candidateProject.candidate.lastName}`
                          });
                          setHistoryModalOpen(true);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </TableCell>
              )}

              {/* Recruiter */}
              <TableCell className="px-6 py-5 text-sm text-gray-600">
                {candidateProject.recruiter?.name || "Unassigned"}
              </TableCell>

              {/* Actions */}
              <TableCell className="px-6 py-5 text-right">
                <VerificationActionsMenu
                  candidateProject={candidateProject}
                  onReject={handleRejectCandidate}
                />
              </TableCell>
            </motion.tr>
          );
        })}
      </TableBody>
    </Table>
  )}

  {/* Pagination */}
  {!isLoading && !error && totalPages > 1 && (
    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Showing page <span className="font-medium text-gray-900">{currentPage}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, i, arr) => (
              <div key={p} className="flex items-center gap-1">
                {i > 0 && p - arr[i-1] > 1 && <span className="text-gray-400 px-1">...</span>}
                <Button
                  variant={currentPage === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(p)}
                  className={cn("h-8 min-w-[32px] px-2", currentPage === p ? "bg-blue-600 hover:bg-blue-700" : "")}
                >
                  {p}
                </Button>
              </div>
            ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )}

  {/* Empty State */}
  {!isLoading && !error && candidateProjects.length === 0 && (
    <div className="py-24 text-center">
      <div className="mx-auto h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
        <User className="h-6 w-6 text-gray-400" />
      </div>
      <p className="mt-4 text-sm text-gray-500">No candidates found</p>
    </div>
  )}
</div>
</div>

        {/* Compact Verification Dialog */}
        <Dialog open={verificationDialog} onOpenChange={setVerificationDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {verificationAction === "verify"
                  ? "Verify Document"
                  : "Reject Document"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {verificationAction === "verify"
                  ? "Confirm this document is valid and verified."
                  : "Provide a reason for rejecting this document."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCandidate && (
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="font-medium text-slate-900">
                    {selectedCandidate.candidate.firstName}{" "}
                    {selectedCandidate.candidate.lastName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedCandidate.project.title}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <FormLabel className="text-sm font-medium">Notes</FormLabel>
                <Textarea
                  placeholder={
                    verificationAction === "verify"
                      ? "Add verification notes..."
                      : "Explain rejection reason..."
                  }
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setVerificationDialog(false)}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitVerification}
                variant={
                  verificationAction === "verify" ? "default" : "destructive"
                }
                size="sm"
              >
                {verificationAction === "verify" ? "Verify" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bulk Send to Client Modal */}
      <BulkSendToClientModal
        isOpen={bulkSendModalOpen}
        onClose={() => {
          setBulkSendModalOpen(false);
          setSelectedCandidateIds(new Set());
          setSelectAll(false);
        }}
        candidates={selectedCandidatesForModal}
        onSuccess={() => {
          // Reset selection after successful send
          setSelectedCandidateIds(new Set());
          setSelectAll(false);
          refetch();
        }}
      />

      {/* Forward History Modal */}
      {historyModalData && (
        <ClientForwardHistoryModal
          isOpen={historyModalOpen}
          onOpenChange={setHistoryModalOpen}
          candidateId={historyModalData.candidateId}
          projectId={historyModalData.projectId}
          roleCatalogId={historyModalData.roleCatalogId}
          candidateName={historyModalData.candidateName}
        />
      )}
    </div>
  );
}