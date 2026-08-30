import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoveRight,
  CheckCircle2,
  CheckSquare,
  X,
  Eye,
  Upload,
  Briefcase
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SURFACE_AMBER_SOFT,
  SURFACE_EMERALD_SOFT,
} from "@/lib/page-shell-styles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateInterviewStatusMutation, useUpdateBulkInterviewStatusMutation } from "../api";
import { useGetCandidatesToTransferQuery } from "@/features/processing/data/processing.endpoints";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { SingleTransferToProcessingModal } from "../components/SingleTransferToProcessingModal";
import { MultiTransferToProcessingModal } from "../components/MultiTransferToProcessingModal";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { OfferLetterUploadModal } from "@/features/documents/components/OfferLetterUploadModal";
import { useAppDispatch } from "@/app/hooks";
import { processingApi } from "@/features/processing/data/processing.endpoints";
import { OfferLetterBadge } from "../components/OfferLetterBadge";
import {
  canShowInterviewOfferLetterUpload,
  getOfferLetterOverrideKey,
  getOfferLetterUploaderName,
  getOfferLetterUrlFromUpload,
  hasOfferLetter,
  resolveOfferLetterFileUrl,
} from "../utils/offerLetter";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import { useCan, useCanExplicitLive, useHasRole } from "@/hooks/useCan";

export default function PassedCandidatesPage() {
  const navigate = useNavigate();
  const isRecruiter = useHasRole("Recruitment Executive");
  const canUploadDocuments = useCan("write:documents");
  const canWriteCandidates = useCan("write:candidates");
  const canUploadOfferLetters = useCanExplicitLive("upload:offer_letters");
  const canUploadOfferLetter = canShowInterviewOfferLetterUpload({
    isRecruiter,
    canUploadDocuments,
    canWriteCandidates,
    canUploadOfferLetters,
    assumeInterviewPassed: true,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [transferInterviewId, setTransferInterviewId] = useState<string | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [bulkTransferModalOpen, setBulkTransferModalOpen] = useState(false);

  // Offer Letter Upload State
  const [offerLetterModal, setOfferLetterModal] = useState<{
    isOpen: boolean;
    candidateId: string | null;
    interviewId: string | null;
  }>({
    isOpen: false,
    candidateId: null,
    interviewId: null,
  });

  // PDF Viewer State
  const [pdfViewerState, setPdfViewerState] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
    candidateId: string | null;
  }>({
    isOpen: false,
    fileUrl: "",
    fileName: "",
    candidateId: null,
  });

  // Local overrides for immediate UI updates
  const [offerLetterOverrides, setOfferLetterOverrides] = useState<Record<string, string>>({});

  const dispatch = useAppDispatch();
  
  const currentPage = parseInt(searchParams.get("page") || "1");
  const setCurrentPage = (page: number) => {
    const np = new URLSearchParams(searchParams);
    if (page === 1) np.delete("page");
    else np.set("page", page.toString());
    setSearchParams(np);
  };

  const [filters, setFilters] = useState({ 
    search: searchParams.get("search") || "", 
    projectId: searchParams.get("projectId") || "all",
    roleCatalogId: searchParams.get("roleCatalogId") || "all",
    status: searchParams.get("status") || "all"
  });

  const [projectSearch, setProjectSearch] = useState("");
  const debouncedProjectSearch = useDebounce(projectSearch, 400);

  useEffect(() => {
    setFilters({
      search: searchParams.get("search") || "",
      projectId: searchParams.get("projectId") || "all",
      roleCatalogId: searchParams.get("roleCatalogId") || "all",
      status: searchParams.get("status") || "all"
    });
  }, [searchParams]);

  // Map UI status ('pending'|'transferred'|'all') to API-accepted statuses.
  // The processing API expects: 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'all'
  const queryStatus = ((): 'assigned' | 'in_progress' | 'completed' | 'cancelled' | undefined => {
    if (filters.status === 'assigned' || filters.status === 'in_progress' || filters.status === 'completed' || filters.status === 'cancelled') {
      return filters.status as 'assigned' | 'in_progress' | 'completed' | 'cancelled';
    }
    // Do not pass 'pending' or 'transferred' directly to the API - handle them client-side
    return undefined;
  })();

  const { data, isLoading, error } = useGetCandidatesToTransferQuery({
    search: filters.search || undefined,
    projectId: filters.projectId !== "all" ? filters.projectId : undefined,
    roleCatalogId: filters.roleCatalogId !== "all" ? filters.roleCatalogId : undefined,
    status: queryStatus,
    page: currentPage,
    limit: 20,
  });

  const { data: projectsData } = useGetProjectsQuery({ 
    limit: 10,
    search: debouncedProjectSearch || undefined
  });
  const projects = projectsData?.data?.projects || [];
  
  const filteredProjects = projects; // API handles the filtering

  const selectedProject = useMemo(() => 
    projects.find((p: any) => p.id === filters.projectId),
    [projects, filters.projectId]
  );

  const [, { isLoading: isUpdating }] = useUpdateInterviewStatusMutation();
  const [, { isLoading: isBulkUpdating }] = useUpdateBulkInterviewStatusMutation();

  const interviews = (data?.data?.interviews ?? []) as any[];
  
  const passedCandidates = useMemo(() => {
    return interviews.filter(it => it.outcome?.toLowerCase() === "passed");
  }, [interviews]);

  // Helper to determine if an interview's offer letter has been verified by processing
  const isOfferLetterVerified = (it: any) => {
    if (!it) return false;
    return (
      it.offerLetterData?.status === 'verified' ||
      it.offerLetterData?.document?.status === 'verified' ||
      (it.candidateProjectMap?.documentVerifications?.some((dv: any) => dv.document?.docType === 'offer_letter' && dv.status === 'verified') ?? false)
    );
  };

  useEffect(() => {
    setOfferLetterOverrides((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const item of interviews) {
        const serverUrl = item.offerLetterData?.document?.fileUrl;
        if (!serverUrl) continue;

        const key = getOfferLetterOverrideKey(item);
        if (next[key] !== serverUrl) {
          next[key] = serverUrl;
          changed = true;
        }

        const legacyCandidateId =
          item.candidateProjectMap?.candidate?.id || item.candidate?.id;
        if (legacyCandidateId && next[legacyCandidateId] !== serverUrl) {
          delete next[legacyCandidateId];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [interviews]);

  // Derive active PDF URL with cache busting (server URL wins over stale local overrides)
  const activePdfUrl = useMemo(() => {
    if (!pdfViewerState.isOpen || !pdfViewerState.candidateId) return "";

    const interview = interviews.find(
      (it) =>
        (it.candidateProjectMap?.candidate?.id || it.candidate?.id) ===
        pdfViewerState.candidateId,
    );
    const originalUrl =
      resolveOfferLetterFileUrl(interview || {}, offerLetterOverrides) ||
      pdfViewerState.fileUrl;

    return originalUrl
      ? `${originalUrl}${originalUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
      : "";
  }, [
    pdfViewerState.isOpen,
    pdfViewerState.candidateId,
    pdfViewerState.fileUrl,
    offerLetterOverrides,
    interviews,
  ]);

  // Apply additional client-side filtering for the UI-specific statuses ('pending' | 'transferred')
  const filteredList = useMemo(() => {
    return passedCandidates.filter((it) => {
      if (filters.status === 'pending') return !it.isTransferredToProcessing;
      if (filters.status === 'transferred') return !!it.isTransferredToProcessing;
      return true;
    });
  }, [passedCandidates, filters.status]); // Filtering already done by query and the .filter above

  useEffect(() => {
    setSelectedBulkIds((prev) => {
      const allowedIds = new Set(
        filteredList.filter((it) => !it.isTransferredToProcessing).map((it) => it.id)
      );
      const next = prev.filter((id) => allowedIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [filteredList]);

  const transferInterview = useMemo(() => {
    if (!transferInterviewId) return null;
    return filteredList.find((i) => i.id === transferInterviewId) || null;
  }, [filteredList, transferInterviewId]);

  const transferIsOfferVerified = transferInterview
    ? isOfferLetterVerified(transferInterview)
    : false;

  const transferProjectTitle =
    transferInterview?.candidateProjectMap?.project?.title ||
    transferInterview?.project?.title ||
    "";
  const transferRoleDesignation =
    (transferInterview?.candidateProjectMap?.roleNeeded || transferInterview?.roleNeeded)
      ?.designation ||
    (transferInterview?.candidateProjectMap?.roleNeeded || transferInterview?.roleNeeded)
      ?.roleCatalog?.designation ||
    "Unknown Role";

  const bulkSelection = filteredList.find(it => selectedBulkIds.includes(it.id));
  const bulkProjectTitle = bulkSelection?.candidateProjectMap?.project?.title || bulkSelection?.project?.title || "";
  const bulkRoleDesignation = (bulkSelection?.candidateProjectMap?.roleNeeded || bulkSelection?.roleNeeded)?.designation ||
    (bulkSelection?.candidateProjectMap?.roleNeeded || bulkSelection?.roleNeeded)?.roleCatalog?.designation || "Unknown Role";

  const handleBulkTransfer = async () => {
    if (selectedBulkIds.length === 0) return;
    setBulkTransferModalOpen(true);
  };

  const bulkTransferCandidates = useMemo(() => {
    return selectedBulkIds.map(id => {
      const interview = filteredList.find(it => it.id === id);
      if (!interview) return null;
      
      const candidate = interview.candidateProjectMap?.candidate || interview.candidate;
      if (!candidate?.id) return null;

      const firstName = candidate.firstName || "";
      const lastName = candidate.lastName || "";
      return {
        id: interview.id,
        candidateId: candidate.id,
        candidate, // Pass full candidate object for tooltip
        candidateName: `${firstName} ${lastName}`.trim() || "Unknown Candidate",
        agentName: interview.agentName || candidate?.agent?.name,
        agentType: interview.agentType || candidate?.agent?.agentType,
        recruiterName: interview.candidateProjectMap?.recruiter?.name,
        isOfferLetterUploaded: interview.isOfferLetterUploaded,
        offerLetterData: interview.offerLetterData,
      };
    }).filter(Boolean) as Array<{
      id: string;
      candidateId: string;
      candidate: any;
      candidateName: string;
      agentName?: string;
      agentType?: string;
      recruiterName?: string;
      isOfferLetterUploaded?: boolean;
      offerLetterData?: any;
    }>;
  }, [selectedBulkIds, filteredList]);

  const offerLetterInterview = useMemo(() => {
    if (!offerLetterModal.interviewId) return null;
    return passedCandidates.find(it => it.id === offerLetterModal.interviewId);
  }, [passedCandidates, offerLetterModal.interviewId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load passed candidates.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalPages = data?.data?.pagination?.totalPages ?? 1;
  const totalCount = data?.data?.pagination?.total ?? filteredList.length;

  return (
    <>
    <div className="min-h-screen">
      <div className="w-full mx-auto space-y-6 mt-2">
        {/* Search & Filter Bar */}
        <div className="rounded-2xl border border-border bg-card shadow-sm px-4 py-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={filters.search}
                onChange={(e) => {
                  const val = e.target.value;
                  const np = new URLSearchParams(searchParams);
                  if (val) np.set("search", val);
                  else np.delete("search");
                  np.delete("page");
                  setSelectedBulkIds([]);
                  setSearchParams(np, { replace: true });
                }}
                className="pl-9 h-9 text-sm border-border bg-muted focus:bg-card focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filters.projectId}
                onValueChange={(val) => {
                  const np = new URLSearchParams(searchParams);
                  setSelectedBulkIds([]);
                  if (val === "all") {
                    np.delete("projectId");
                    np.delete("roleCatalogId");
                  } else {
                    np.set("projectId", val);
                    np.delete("roleCatalogId");
                  }
                  np.delete("page");
                  setProjectSearch("");
                  setSearchParams(np);
                }}
              >
                <SelectTrigger className="h-9 w-48 text-sm border-border rounded-xl bg-card">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <div className="p-2">
                    <Input
                      placeholder="Search projects..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <SelectItem value="all">All Projects</SelectItem>
                  {filteredProjects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.roleCatalogId}
                disabled={filters.projectId === "all"}
                onValueChange={(val) => {
                  const np = new URLSearchParams(searchParams);
                  if (val === "all") np.delete("roleCatalogId");
                  else np.set("roleCatalogId", val);
                  np.delete("page");
                  setSelectedBulkIds([]);
                  setSearchParams(np);
                }}
              >
                <SelectTrigger className="h-9 w-48 text-sm border-border rounded-xl bg-card">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="all">All Roles</SelectItem>
                  {selectedProject?.rolesNeeded?.filter((r: any) => r.roleCatalogId).map((r: any) => (
                    <SelectItem key={r.roleCatalogId!} value={r.roleCatalogId!}>{r.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(val) => {
                  const np = new URLSearchParams(searchParams);
                  if (val === "all") np.delete("status");
                  else np.set("status", val);
                  np.delete("page");
                  setSelectedBulkIds([]);
                  setSearchParams(np);
                }}
              >
                <SelectTrigger className="h-9 w-48 text-sm border-border rounded-xl bg-card">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending Transfer</SelectItem>
                  <SelectItem value="transferred">Already Transferred</SelectItem>
                </SelectContent>
              </Select>

              {(filters.search || filters.projectId !== "all" || filters.roleCatalogId !== "all" || filters.status !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedBulkIds([]);
                    setSearchParams(new URLSearchParams());
                  }}
                  className="h-9 px-3 rounded-xl text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              {filters.projectId !== "all" && selectedBulkIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleBulkTransfer}
                  disabled={isBulkUpdating}
                  className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl gap-2"
                >
                  {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                  Bulk Transfer ({selectedBulkIds.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Ready for Processing Table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground truncate">Ready for Processing</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Candidates with offer letters — {totalCount} record{totalCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {filters.projectId !== "all" && filteredList.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <Checkbox
                    id="select-all"
                    checked={
                      filteredList.length > 0 &&
                      filteredList.every(
                        (it) =>
                          it.isTransferredToProcessing || selectedBulkIds.includes(it.id),
                      )
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedBulkIds(
                          filteredList
                            .filter((it) => !it.isTransferredToProcessing)
                            .map((it) => it.id),
                        );
                      } else {
                        setSelectedBulkIds([]);
                      }
                    }}
                  />
                  <label htmlFor="select-all" className="text-xs font-medium cursor-pointer select-none text-muted-foreground">
                    {selectedBulkIds.length > 0 ? `${selectedBulkIds.length} selected` : "Select all"}
                  </label>
                  {selectedBulkIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedBulkIds([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-foreground">No candidates ready</p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Candidates appear here after the Interview Coordinator sends them for processing
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/80">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      {filters.projectId !== "all" && (
                        <TableHead className="h-10 w-10 px-4" />
                      )}
                      <TableHead className="h-10 min-w-[14rem] whitespace-normal px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Candidate
                      </TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Project
                      </TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Role
                      </TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Offer Letter
                      </TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Upload By
                      </TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="h-10 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredList.map((it) => {
                      const candidate = it.candidateProjectMap?.candidate || it.candidate;
                      const candidateCode =
                        it.candidateProjectMap?.candidate?.candidateCode ??
                        it.candidate?.candidateCode ??
                        it.candidateProjectMap?.candidate?.candidate_code ??
                        it.candidate?.candidate_code ??
                        undefined;
                      const offerVerified = isOfferLetterVerified(it);
                      const hasUploadedOfferLetter = hasOfferLetter(it, offerLetterOverrides);
                      const uploadByName = getOfferLetterUploaderName(it);
                      const projectTitle = it.candidateProjectMap?.project?.title || it.project?.title || "—";
                      const roleDesignation =
                        (it.candidateProjectMap?.roleNeeded || it.roleNeeded)?.designation ||
                        (it.candidateProjectMap?.roleNeeded || it.roleNeeded)?.roleCatalog?.designation ||
                        "—";

                      return (
                        <TableRow
                          key={it.id}
                          className="border-b border-border hover:bg-muted/60 transition-colors last:border-b-0"
                        >
                          {filters.projectId !== "all" && (
                            <TableCell className="align-middle px-4 py-3">
                              <Checkbox
                                checked={selectedBulkIds.includes(it.id)}
                                disabled={it.isTransferredToProcessing}
                                onCheckedChange={(checked) => {
                                  setSelectedBulkIds((prev) =>
                                    checked ? [...prev, it.id] : prev.filter((id) => id !== it.id)
                                  );
                                }}
                                aria-label={`Select ${candidate?.firstName ?? "candidate"}`}
                              />
                            </TableCell>
                          )}

                          <TableCell className="min-w-[14rem] whitespace-normal align-top px-4 py-3">
                            <div className="flex items-start gap-3">
                              <ImageViewer
                                title={`${candidate?.firstName} ${candidate?.lastName}`}
                                src={candidate?.profileImage || null}
                                fallbackSrc="https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                                className="h-10 w-10 shrink-0 rounded-full"
                                ariaLabel={`View full image for ${candidate?.firstName} ${candidate?.lastName}`}
                                enableHoverPreview={true}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm text-foreground truncate">
                                  {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown"}
                                </p>
                                {candidateCode && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {candidateCode}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle">
                            <p className="max-w-[180px] truncate text-sm text-foreground">
                              {projectTitle}
                            </p>
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle">
                            <p className="max-w-[160px] truncate text-sm text-muted-foreground">
                              {roleDesignation}
                            </p>
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle">
                            {offerVerified ? (
                              <Badge className={cn("text-[10px] font-medium border", SURFACE_EMERALD_SOFT)}>
                                Verified
                              </Badge>
                            ) : hasUploadedOfferLetter ? (
                              <OfferLetterBadge
                                size="xs"
                                uploaderName={uploadByName}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">Not uploaded</span>
                            )}
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle">
                            {hasUploadedOfferLetter ? (
                              <span className="text-sm text-foreground">{uploadByName || "Unknown"}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle">
                            {it.isTransferredToProcessing ? (
                              <Badge className="border-indigo-200 bg-indigo-100 text-[10px] text-indigo-700 font-medium dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800">
                                Transferred
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={cn("text-[10px] font-medium border", SURFACE_AMBER_SOFT)}>
                                Pending
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="px-4 py-3 text-right align-middle">
                            <div className="flex items-center justify-end gap-1">
                              {(hasOfferLetter(it, offerLetterOverrides) || offerVerified) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                                  onClick={() => {
                                    const fileUrl = resolveOfferLetterFileUrl(it, offerLetterOverrides);
                                    if (fileUrl) {
                                      setPdfViewerState({
                                        isOpen: true,
                                        fileUrl,
                                        fileName: `Offer Letter - ${candidate?.firstName} ${candidate?.lastName}`,
                                        candidateId: candidate?.id,
                                      });
                                    }
                                  }}
                                  title="View offer letter"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}

                              {!offerVerified && canUploadOfferLetter && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                                  onClick={() => {
                                    setOfferLetterModal({
                                      isOpen: true,
                                      candidateId: candidate?.id,
                                      interviewId: it.id,
                                    });
                                  }}
                                  title={hasOfferLetter(it, offerLetterOverrides) ? "Re-upload offer letter" : "Upload offer letter"}
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5"
                                onClick={() => navigate(`/ready-for-processing/${it.id}`)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Button>

                              {!it.isTransferredToProcessing && (
                                <Button
                                  size="sm"
                                  className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  disabled={isUpdating}
                                  onClick={() => {
                                    setTransferInterviewId(it.id);
                                    setTransferModalOpen(true);
                                  }}
                                >
                                  {isUpdating && transferInterviewId === it.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <MoveRight className="h-3.5 w-3.5" />
                                  )}
                                  Transfer
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-6 py-4 gap-3 bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
                    <span className="font-semibold text-foreground">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="h-8 gap-1 border-border hover:bg-muted text-muted-foreground text-xs"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="h-8 gap-1 border-border hover:bg-muted text-muted-foreground text-xs"
                    >
                      Next
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
      {transferInterview && (
        <SingleTransferToProcessingModal
          isOpen={transferModalOpen}
          onClose={() => {
            setTransferModalOpen(false);
            setTransferInterviewId(null);
          }}
          candidateId={(transferInterview.candidateProjectMap?.candidate || transferInterview.candidate)?.id}
          candidateName={`${(transferInterview.candidateProjectMap?.candidate || transferInterview.candidate)?.firstName} ${(transferInterview.candidateProjectMap?.candidate || transferInterview.candidate)?.lastName}`}
          agentName={transferInterview.agentName || (transferInterview.candidateProjectMap?.candidate || transferInterview.candidate)?.agent?.name}
          agentType={transferInterview.agentType || (transferInterview.candidateProjectMap?.candidate || transferInterview.candidate)?.agent?.agentType}
          recruiterName={transferInterview.candidateProjectMap?.recruiter?.name}
          projectId={transferInterview.candidateProjectMap?.project?.id || transferInterview.project?.id}
          projectTitle={transferProjectTitle}
          roleCatalogId={(transferInterview.candidateProjectMap?.roleNeeded || transferInterview.roleNeeded)?.roleCatalogId || (transferInterview.candidateProjectMap?.roleNeeded || transferInterview.roleNeeded)?.roleCatalog?.id || ""}
          roleDesignation={transferRoleDesignation}
          isOfferVerified={transferIsOfferVerified}
          isAlreadyUploaded={transferInterview.isOfferLetterUploaded || !!offerLetterOverrides[(transferInterview.candidateProjectMap?.candidate || transferInterview.candidate)?.id]}
          existingFileUrl={resolveOfferLetterFileUrl(transferInterview, offerLetterOverrides)}
          onSuccess={() => {
            setTransferInterviewId(null);
            setSelectedBulkIds((prev) => prev.filter((id) => id !== transferInterview.id));
          }}
        />
      )}

      {bulkTransferCandidates.length > 0 && filters.projectId !== "all" && (
        <MultiTransferToProcessingModal
          isOpen={bulkTransferModalOpen}
          onClose={() => setBulkTransferModalOpen(false)}
          candidates={bulkTransferCandidates}
          projectId={filters.projectId}
          projectTitle={bulkProjectTitle}
          roleCatalogId={
            filters.roleCatalogId !== "all" 
              ? filters.roleCatalogId 
              : (filteredList.find(it => selectedBulkIds.includes(it.id))?.candidateProjectMap?.roleNeeded?.roleCatalogId || 
                 filteredList.find(it => selectedBulkIds.includes(it.id))?.roleNeeded?.roleCatalogId || "")
          }
          roleDesignation={bulkRoleDesignation}
          onSuccess={() => {
            setSelectedBulkIds([]);
            setTransferInterviewId(null);
          }}
          onRemoveCandidate={(interviewId) => {
            setSelectedBulkIds((prev) => {
              const next = prev.filter((id) => id !== interviewId);
              if (next.length === 0) {
                setBulkTransferModalOpen(false);
              }
              return next;
            });
          }}
        />
      )}

      {offerLetterModal.isOpen && offerLetterInterview && (
        <OfferLetterUploadModal
          isOpen={offerLetterModal.isOpen}
          onClose={() => setOfferLetterModal({ isOpen: false, candidateId: null, interviewId: null })}
          candidateId={offerLetterModal.candidateId!}
          candidateName={(offerLetterInterview.candidateProjectMap?.candidate || offerLetterInterview.candidate)?.firstName + " " + (offerLetterInterview.candidateProjectMap?.candidate || offerLetterInterview.candidate)?.lastName}
          projectId={offerLetterInterview.candidateProjectMap?.project?.id || offerLetterInterview.project?.id || filters.projectId}
          projectTitle={offerLetterInterview.candidateProjectMap?.project?.title || offerLetterInterview.project?.title || "Project"}
          roleCatalogId={(offerLetterInterview.candidateProjectMap?.roleNeeded || offerLetterInterview.roleNeeded)?.roleCatalogId || (offerLetterInterview.candidateProjectMap?.roleNeeded || offerLetterInterview.roleNeeded)?.roleCatalog?.id || ""}
          roleDesignation={(offerLetterInterview.candidateProjectMap?.roleNeeded || offerLetterInterview.roleNeeded)?.designation || "Unknown Role"}
          isAlreadyUploaded={hasOfferLetter(offerLetterInterview, offerLetterOverrides)}
          existingFileUrl={resolveOfferLetterFileUrl(offerLetterInterview, offerLetterOverrides)}
          onSuccess={(uploadData) => {
            const fileUrl = getOfferLetterUrlFromUpload(uploadData);
            if (fileUrl && offerLetterInterview) {
              const overrideKey = getOfferLetterOverrideKey(offerLetterInterview);
              setOfferLetterOverrides((prev) => ({ ...prev, [overrideKey]: fileUrl }));
              
              // Refresh the list to sync everything
              try {
                dispatch(processingApi.util.invalidateTags([{ type: "ProcessingSummary" }]));
                dispatch(
                  processingApi.endpoints.getCandidatesToTransfer.initiate({
                    search: filters.search || undefined,
                    projectId: filters.projectId !== "all" ? filters.projectId : undefined,
                    roleCatalogId: filters.roleCatalogId !== "all" ? filters.roleCatalogId : undefined,
                    // Use the same queryStatus mapping so we don't pass UI-specific statuses
                    status: queryStatus,
                    page: currentPage,
                    limit: 20,
                  }, { forceRefetch: true })
                );
              } catch (err) {
                console.warn("Refresh failed", err);
              }
            }
          }}
        />
      )}

      <PDFViewer
        fileUrl={activePdfUrl}
        fileName={pdfViewerState.fileName}
        isOpen={pdfViewerState.isOpen}
        onClose={() => setPdfViewerState({ ...pdfViewerState, isOpen: false, candidateId: null })}
      />
    </>
  );
}
