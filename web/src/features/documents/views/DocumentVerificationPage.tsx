import { useState, useCallback, useMemo } from "react";
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
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Users,
  User,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import { useGetVerificationCandidatesQuery, useGetVerifiedRejectedDocumentsQuery } from "@/features/documents";
import { useGetApprovedScreeningDocumentsQuery } from "@/features/screening-coordination";
import { useCan } from "@/hooks/useCan";
import { useAppSelector } from "@/app/hooks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import VerificationActionsMenu from "../components/VerificationActionsMenu";
import { ProjectRoleFilter, type ProjectRoleFilterValue } from "@/components/molecules";
import { BulkSendToClientModal } from "../components/BulkSendToClientModal";
import { BulkSendForInterviewModal } from "../components/BulkSendForInterviewModal";
import { ClientForwardHistoryModal } from "../components/ClientForwardHistoryModal";

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
  const [screeningFilter, setScreeningFilter] = useState(false);
  const [projectRoleFilter, setProjectRoleFilter] = useState<ProjectRoleFilterValue>({
    projectId: "all",
    roleCatalogId: "all",
  });
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [bulkSendModalOpen, setBulkSendModalOpen] = useState(false);
  const [bulkInterviewModalOpen, setBulkInterviewModalOpen] = useState(false);
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

  // Pending (verification candidates) query — only call when viewing pending / in-progress
  const verificationCandidatesQuery = useGetVerificationCandidatesQuery(
    {
      status: statusFilter === "all" ? undefined : statusFilter,
      projectId: projectRoleFilter.projectId === "all" ? undefined : projectRoleFilter.projectId,
      roleCatalogId: projectRoleFilter.roleCatalogId === "all" ? undefined : projectRoleFilter.roleCatalogId,
      search: searchTerm || undefined,
      page: currentPage,
      limit: 10,
      recruiterId: isStrictRecruiter ? user?.id : undefined,
      screening: screeningFilter || undefined,
    },
    { skip: statusFilter !== "verification_in_progress_document" }
  );

  // Verified / Rejected documents query — only call when viewing verified or rejected lists
  // Always fetch verified/rejected counts (we'll merge counts from both endpoints)
  const verifiedRejectedQuery = useGetVerifiedRejectedDocumentsQuery({
    status:
      statusFilter === "documents_verified"
        ? "verified"
        : statusFilter === "rejected_documents"
        ? "rejected"
        : undefined,
    projectId: projectRoleFilter.projectId === "all" ? undefined : projectRoleFilter.projectId,
    roleCatalogId: projectRoleFilter.roleCatalogId === "all" ? undefined : projectRoleFilter.roleCatalogId,
    search: searchTerm || undefined,
    page: currentPage,
    limit: 10,
    recruiterId: isStrictRecruiter ? user?.id : undefined,
    screening: screeningFilter || undefined,
  }, {
    skip: statusFilter === "screening_approved"
  });

  // Screening approved candidates query
  const approvedScreeningQuery = useGetApprovedScreeningDocumentsQuery(
    {
      projectId: projectRoleFilter.projectId === "all" ? undefined : projectRoleFilter.projectId,
      roleCatalogId: projectRoleFilter.roleCatalogId === "all" ? undefined : projectRoleFilter.roleCatalogId,
      search: searchTerm || undefined,
      page: currentPage,
      limit: 10,
      recruiterId: isStrictRecruiter ? user?.id : undefined,
    },
    { skip: statusFilter !== "screening_approved" }
  );

  // Normalize data for table rendering
  const verificationData = verificationCandidatesQuery.data;
  const verifiedRejectedData = verifiedRejectedQuery.data;
  const approvedScreeningData = approvedScreeningQuery.data;

  const isLoading = 
    verificationCandidatesQuery.isLoading || 
    verifiedRejectedQuery.isLoading || 
    approvedScreeningQuery.isLoading;
    
  const error = 
    verificationCandidatesQuery.error || 
    verifiedRejectedQuery.error || 
    approvedScreeningQuery.error;

  // Refresh both endpoints to keep counts and lists in sync
  const refetch = () => {
    if (verificationCandidatesQuery.status !== 'uninitialized') {
      verificationCandidatesQuery.refetch?.();
    }
    if (verifiedRejectedQuery.status !== 'uninitialized') {
      verifiedRejectedQuery.refetch?.();
    }
    if (approvedScreeningQuery.status !== 'uninitialized') {
      approvedScreeningQuery.refetch?.();
    }
  };

  let candidateProjects: any[] = [];
  let totalCandidates = 0;
  let totalPages = 1;

  if (statusFilter === "verification_in_progress_document") {
    candidateProjects = verificationData?.data?.items || verificationData?.data?.candidateProjects || [];
    totalCandidates = verificationData?.data?.pagination?.total || candidateProjects.length;
    totalPages = verificationData?.data?.pagination?.totalPages || 1;
  } else if (statusFilter === "screening_approved") {
    // Map screening items to extract candidateProjectMap and include screening info
    const items = approvedScreeningData?.data?.items || [];
    candidateProjects = items.map((item: any) => ({
      ...(item.candidateProjectMap || {}),
      screeningDecision: item.decision,
      screeningConductedAt: item.conductedAt,
      screeningRemarks: item.remarks,
      screeningId: item.id,
      sendToClient: item.sendToClient,
      isInInterview: item.isInInterview,
      documentRequirements: item.candidateProjectMap?.documentRequirements || item.candidateProjectMap?.project?.documentRequirements || []
    }));
    totalCandidates = approvedScreeningData?.data?.pagination?.total || candidateProjects.length;
    totalPages = approvedScreeningData?.data?.pagination?.totalPages || 1;
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
        candidate: it.candidate || null,
        project: it.project || null,
        documentVerifications: [],
        recruiter: it.recruiter || null,
        screening: it.screening || null,
        sendToClient: it.sendToClient || null,
        roleNeeded: it.roleNeeded || null,
        // ensure interview flag is preserved when backend provides it
        isInInterview: (it as any).isInInterview || false,
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

  // Permission check
  if (!canReadDocuments) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
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
  const getStatusCounts = () => {
    // Prefer server-supplied counts when available. We merge counts from both
    // the verification (pending) endpoint and the verified/rejected endpoint.
    const verificationCounts = (verificationData?.data)?.counts || {};
    const verifiedCounts = (verifiedRejectedData?.data)?.counts || {};
    const screeningApprovedTotal = (approvedScreeningData?.data as any)?.pagination?.total || 0;

    const pending = Number(
      verificationCounts.pending ?? verificationCounts.verification_in_progress ?? verificationCounts.verification_in_progress_document ?? 0
    );

    const verified = Number(verifiedCounts.verified ?? verificationCounts.verified ?? 0);
    const rejected = Number(verifiedCounts.rejected ?? verificationCounts.rejected ?? 0);

    return {
      verification_in_progress_document: pending,
      documents_submitted: 0,
      verification_in_progress: pending,
      documents_verified: verified,
      rejected_documents: rejected,
      screening_approved: screeningApprovedTotal,
    };
  };

  const statusCounts = getStatusCounts();

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
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Document Verification
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{totalCandidates}</span> candidates &bull; Review and verify candidate documents
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Dashboard Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Screening Approved Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <Card
              className={cn(
                "border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
                statusFilter === "screening_approved" ? "ring-2 ring-purple-300" : ""
              )}
              onClick={() => {
                setStatusFilter("screening_approved");
                setCurrentPage(1);
                setSelectedCandidateIds(new Set());
                setSelectAll(false);
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Screening Approved</p>
                    <h3 className="text-3xl font-bold text-purple-600">
                      {statusCounts.screening_approved}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Ready for verification</p>
                  </div>
                  <div className="p-3 bg-purple-200/40 rounded-full">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Candidates Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card
              className={cn(
                "border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
                statusFilter === "verification_in_progress_document" ? "ring-2 ring-blue-300" : ""
              )}
              onClick={() => {
                setStatusFilter("verification_in_progress_document");
                setCurrentPage(1);
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Pending Candidates</p>
                    <h3 className="text-3xl font-bold text-blue-600">
                      {statusCounts.verification_in_progress_document}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">For verification</p>
                  </div>
                  <div className="p-3 bg-blue-200/40 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Verified Documents Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card
              className={cn(
                "border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
                statusFilter === "documents_verified" ? "ring-2 ring-green-300" : ""
              )}
              onClick={() => {
                setStatusFilter("documents_verified");
                setCurrentPage(1);
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Verified</p>
                    <h3 className="text-3xl font-bold text-green-600">
                      {statusCounts.documents_verified}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Approved</p>
                  </div>
                  <div className="p-3 bg-green-200/40 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Rejected Documents Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card
              className={cn(
                "border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
                statusFilter === "rejected_documents" ? "ring-2 ring-red-300" : ""
              )}
              onClick={() => {
                setStatusFilter("rejected_documents");
                setCurrentPage(1);
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Rejected</p>
                    <h3 className="text-3xl font-bold text-red-600">
                      {statusCounts.rejected_documents}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Not approved</p>
                  </div>
                  <div className="p-3 bg-red-200/40 rounded-full">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Compact Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:w-1/3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search candidates or files..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-4 items-center w-full">
              <ProjectRoleFilter
                value={projectRoleFilter}
                onChange={handleProjectRoleChange}
                showRoleFilter={true}
                className="flex-1"
              />
              
              <div className={cn(
                "flex items-center space-x-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200 transition-opacity",
                statusFilter === "screening_approved" ? "opacity-50 pointer-events-none" : "opacity-100"
              )}>
                <Checkbox
                  id="screening-filter"
                  checked={statusFilter === "screening_approved" ? true : screeningFilter}
                  onCheckedChange={(checked) => {
                    setScreeningFilter(checked as boolean);
                    setCurrentPage(1);
                  }}
                  disabled={statusFilter === "screening_approved"}
                />
                <label
                  htmlFor="screening-filter"
                  className="text-sm font-medium leading-none cursor-pointer whitespace-nowrap"
                >
                  Screening Approved
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Documents Table */}
       <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
  {/* Header */}
  <div className="border-b border-gray-200 bg-gray-50/70 px-6 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
       <div className="rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-lg shadow-purple-500/20">
          <User className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {(() => {
              switch (statusFilter) {
                case "documents_verified":
                  return "Verified Candidates";
                case "verification_in_progress_document":
                  return "In-progress Candidates";
                case "rejected_documents":
                  return "Rejected Candidates";
                case "screening_approved":
                  return "Screening Approved Candidates";
                default:
                  return "Candidates for Verification";
              }
            })()}
          </h3>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{totalCandidates}</span>{' '}
            {(() => {
              return totalCandidates === 1 ? 'candidate' : 'candidates';
            })()} {statusFilter === 'all' ? 'to review' : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isLoading && <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />}
        {(statusFilter === "screening_approved" || statusFilter === "documents_verified") && selectedCandidatesForModal.length > 0 && (
          <>
            <Button
              onClick={() => setBulkInterviewModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
            >
              Bulk Send for Interview ({selectedCandidatesForModal.length})
            </Button>
            <Button
              onClick={handleBulkSendToClient}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              Bulk Send to Client ({selectedCandidatesForModal.length})
            </Button>
          </>
        )}
      </div>
    </div>
  </div>

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
          {(statusFilter === "screening_approved" || statusFilter === "documents_verified") && (
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
          ) : statusFilter === "screening_approved" ? (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Screening Status
            </TableHead>
          ) : (
            <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Status
            </TableHead>
          )}

          <TableHead className="h-11 px-6 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
            {statusFilter === "screening_approved" ? "Docs Status" : "Screening Details"}
          </TableHead>
          {(statusFilter === "screening_approved" || statusFilter === "documents_verified") && (
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
              {(statusFilter === "screening_approved" || statusFilter === "documents_verified") && (
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
                  <div>
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
                    <p className="text-xs text-gray-500">{candidateProject.candidate.email}</p>
                  </div>
                </div>
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
                      </div>
                    );
                  }

                  if (statusFilter === "verification_in_progress_document") {
                    return (
                      <div className="text-sm text-gray-700">
                        <div className="font-medium">Pending: {pendingCount}</div>
                        <div className="text-xs text-gray-500">Submitted: {totalDocs}</div>
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
                      </div>
                    );
                  }

                  if (statusFilter === "screening_approved") {
                    return (
                      <div className="text-sm text-gray-700">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {candidateProject.screeningDecision || "Approved"}
                        </Badge>
                        {candidateProject.screeningConductedAt && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            {new Date(candidateProject.screeningConductedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  }

                  return <div className="text-sm text-gray-700">{status}</div>;
                })()}
              </TableCell>

              {/* Documents / Screening Details */}
              <TableCell className="px-6 py-5 text-sm text-gray-600">
                {statusFilter === "screening_approved" ? (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        candidateProject.docsStatus === "verified" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        candidateProject.docsStatus === "pending" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                        candidateProject.docsStatus === "queued" ? "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse" :
                        "bg-slate-50 text-slate-700 border-slate-200"
                      )}
                    >
                      {candidateProject.docsStatus || "—"}
                    </Badge>
                  </div>
                ) : (
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
                )}
              </TableCell>

              {/* Sent to Client Column (Screening Approved & Verified only) */}
              {(statusFilter === "screening_approved" || statusFilter === "documents_verified") && (
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

      {/* Bulk Send for Interview Modal */}
      <BulkSendForInterviewModal
        isOpen={bulkInterviewModalOpen}
        onClose={() => {
          setBulkInterviewModalOpen(false);
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