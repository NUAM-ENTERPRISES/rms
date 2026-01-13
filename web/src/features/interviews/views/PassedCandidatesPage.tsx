import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { getAge } from "@/utils/getAge";
import {
  ClipboardCheck,
  Search,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  ChevronRight,
  MoveRight,
  CheckCircle2,
  X,
  CheckSquare,
  ChevronLeft,
  Mail,
  Phone,
  GraduationCap,
  CalendarDays,
  Layers,
  MapPin,
  Clock,
  ShieldCheck,
  Eye,
  Upload,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateInterviewStatusMutation, useUpdateBulkInterviewStatusMutation } from "../api";
import { useGetCandidatesToTransferQuery } from "@/features/processing/data/processing.endpoints";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SingleTransferToProcessingModal } from "../components/SingleTransferToProcessingModal";
import { MultiTransferToProcessingModal } from "../components/MultiTransferToProcessingModal";
import { ProcessingHistory } from "@/features/processing/components/ProcessingHistory";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { OfferLetterUploadModal } from "@/features/documents/components/OfferLetterUploadModal";
import { useAppDispatch } from "@/app/hooks";
import { processingApi } from "@/features/processing/data/processing.endpoints";

export default function PassedCandidatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    limit: 20,
    search: debouncedProjectSearch || undefined
  });
  const projects = projectsData?.data?.projects || [];
  
  const filteredProjects = projects; // API handles the filtering

  const selectedProject = useMemo(() => 
    projects.find((p: any) => p.id === filters.projectId),
    [projects, filters.projectId]
  );

  const [updateStatus, { isLoading: isUpdating }] = useUpdateInterviewStatusMutation();
  const [updateBulkStatus, { isLoading: isBulkUpdating }] = useUpdateBulkInterviewStatusMutation();

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

  // Derive active PDF URL with cache busting
  const activePdfUrl = useMemo(() => {
    if (!pdfViewerState.isOpen || !pdfViewerState.candidateId) return "";
    
    // Check if we have an override for this candidate (just uploaded)
    const overrideUrl = offerLetterOverrides[pdfViewerState.candidateId];
    if (overrideUrl) {
      return `${overrideUrl}${overrideUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    }

    // Otherwise find in the current interview list
    const interview = interviews.find(it => (it.candidateProjectMap?.candidate?.id || it.candidate?.id) === pdfViewerState.candidateId);
    const originalUrl = interview?.offerLetterData?.document?.fileUrl || pdfViewerState.fileUrl;
    
    return originalUrl ? `${originalUrl}${originalUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : "";
  }, [pdfViewerState.isOpen, pdfViewerState.candidateId, pdfViewerState.fileUrl, offerLetterOverrides, interviews]);

  // Apply additional client-side filtering for the UI-specific statuses ('pending' | 'transferred')
  const filteredList = useMemo(() => {
    return passedCandidates.filter((it) => {
      if (filters.status === 'pending') return !it.isTransferredToProcessing;
      if (filters.status === 'transferred') return !!it.isTransferredToProcessing;
      return true;
    });
  }, [passedCandidates, filters.status]); // Filtering already done by query and the .filter above

  const selected = useMemo(() => {
    if (selectedId) return filteredList.find((i) => i.id === selectedId) || null;
    return filteredList[0] || null;
  }, [filteredList, selectedId]);

  // Is the selected candidate's offer letter already verified by processing?
  const selectedIsOfferVerified = selected ? isOfferLetterVerified(selected) : false;

  const handleTransfer = async () => {
    setTransferModalOpen(true);
  };

  const handleBulkTransfer = async () => {
    if (selectedBulkIds.length === 0) return;
    setBulkTransferModalOpen(true);
  };

  const bulkTransferCandidates = useMemo(() => {
    return selectedBulkIds.map(id => {
      const interview = filteredList.find(it => it.id === id);
      if (!interview) return null;
      
      const candidate = interview.candidateProjectMap?.candidate || interview.candidate;
      return {
        id: interview.id,
        candidateId: candidate?.id,
        candidate, // Pass full candidate object for tooltip
        candidateName: `${candidate?.firstName} ${candidate?.lastName}`,
        recruiterName: interview.candidateProjectMap?.recruiter?.name,
        isOfferLetterUploaded: interview.isOfferLetterUploaded,
        offerLetterData: interview.offerLetterData,
      };
    }).filter(Boolean) as Array<{
      id: string;
      candidateId: string;
      candidate: any;
      candidateName: string;
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
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-950 dark:to-black">
      <div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Ready for Processing
                </h1>
                <p className="text-sm text-muted-foreground">Candidates passed and ready for handoff</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <div className="relative flex-1 min-w-[200px] max-w-md">
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
                  setSearchParams(np, { replace: true });
                }}
                className="pl-10 text-sm"
              />
            </div>

            <Select 
              value={filters.projectId} 
              onValueChange={(val) => {
                const np = new URLSearchParams(searchParams);
                if (val === "all") {
                  np.delete("projectId");
                  np.delete("roleCatalogId");
                  setSelectedBulkIds([]);
                } else {
                  np.set("projectId", val);
                  np.delete("roleCatalogId");
                }
                np.delete("page");
                setProjectSearch("");
                setSearchParams(np);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
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
                setSearchParams(np);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
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
                setSearchParams(np);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending Transfer</SelectItem>
                <SelectItem value="transferred">Already Transferred</SelectItem>
              </SelectContent>
            </Select>

            {(filters.search || filters.projectId !== "all" || filters.roleCatalogId !== "all" || filters.status !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => {
                setSearchParams(new URLSearchParams());
              }}>
                <X className="h-4 w-4" />
              </Button>
            )}

            {filters.projectId !== "all" && selectedBulkIds.length > 0 && (
              <Button
                size="sm"
                onClick={handleBulkTransfer}
                disabled={isBulkUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all animate-in fade-in zoom-in duration-200 gap-2"
              >
                {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                Bulk Transfer ({selectedBulkIds.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r bg-white/60 dark:bg-gray-900/60 flex flex-col">
          {filters.projectId !== "all" && filteredList.length > 0 && (
            <div className="p-3 border-b flex items-center justify-between bg-white/40 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={
                    filteredList.length > 0 &&
                    filteredList.every((it) => it.isTransferredToProcessing || selectedBulkIds.includes(it.id))
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedBulkIds(filteredList.filter(it => !it.isTransferredToProcessing).map((it) => it.id));
                    } else {
                      setSelectedBulkIds([]);
                    }
                  }}
                />
                <label
                  htmlFor="select-all"
                  className="text-xs font-medium cursor-pointer select-none"
                >
                  {selectedBulkIds.length > 0 ? `${selectedBulkIds.length} selected` : "Select All"}
                </label>
              </div>
              {selectedBulkIds.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[10px] px-2"
                  onClick={() => setSelectedBulkIds([])}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
          <ScrollArea className="flex-1">
            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-40 text-emerald-400" />
                <p className="font-medium">No candidates ready</p>
                <p className="text-xs mt-1">Candidates marked 'Passed' will appear here for processing</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filteredList.map((it) => {
                  const candidate = it.candidateProjectMap?.candidate || it.candidate;
                  const isSelected = it.id === selected?.id;
                  const offerVerified = isOfferLetterVerified(it);

                  return (
                    <div key={it.id} className="relative flex items-center gap-1 group">
                      {filters.projectId !== "all" && (
                        <Checkbox
                          checked={selectedBulkIds.includes(it.id)}
                          disabled={it.isTransferredToProcessing}
                          onCheckedChange={(checked) => {
                            setSelectedBulkIds((prev) =>
                              checked ? [...prev, it.id] : prev.filter((id) => id !== it.id)
                            );
                          }}
                          className="ml-1 opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                        />
                      )}
                      <button
                        onClick={() => setSelectedId(it.id)}
                        className={cn(
                          "flex-1 text-left p-3.5 rounded-lg border transition-all min-w-0",
                          isSelected
                            ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 dark:from-emerald-900/30 dark:to-teal-900/30 dark:border-emerald-700"
                            : "bg-white dark:bg-gray-800 border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="text-sm font-bold bg-emerald-500 text-white">
                              {candidate ? `${candidate.firstName?.[0]}${candidate.lastName?.[0]}` : "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium text-sm truncate max-w-[120px]">
                                {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown"}
                              </p>
                              {it.isTransferredToProcessing && (
                                <Badge variant="secondary" className="px-1 py-0 h-4 text-[8px] bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none shrink-0">
                                  Transferred
                                </Badge>
                              )}
                              {offerVerified ? (
                                <Badge variant="secondary" className="px-1 py-0 h-4 text-[8px] bg-emerald-100 text-emerald-700 border-none shrink-0">
                                  VERIFIED
                                </Badge>
                              ) : ((it.isOfferLetterUploaded || offerLetterOverrides[candidate?.id]) && (
                                <Badge variant="secondary" className="px-1 py-0 h-4 text-[8px] bg-emerald-100 text-emerald-700 border-none shrink-0">
                                  DOC
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {it.candidateProjectMap?.project?.title || it.project?.title || "Unknown Project"}
                            </p>
                          </div>
                          <div className="flex items-center shrink-0">
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              {(it.isOfferLetterUploaded || offerLetterOverrides[candidate?.id] || offerVerified) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const fileUrl = offerLetterOverrides[candidate?.id] || it.offerLetterData?.document?.fileUrl;
                                    if (fileUrl) {
                                      setPdfViewerState({
                                        isOpen: true,
                                        fileUrl,
                                        fileName: `Offer Letter - ${candidate?.firstName} ${candidate?.lastName}`,
                                        candidateId: candidate?.id
                                      });
                                    }
                                  }}
                                  title="View Offer Letter"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              )}
                              {!offerVerified && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-6 w-6 p-0",
                                    (it.isOfferLetterUploaded || offerLetterOverrides[candidate?.id]) 
                                      ? "text-amber-600 hover:bg-amber-50" 
                                      : "text-indigo-600 hover:bg-indigo-50"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOfferLetterModal({
                                      isOpen: true,
                                      candidateId: candidate?.id,
                                      interviewId: it.id
                                    });
                                  }}
                                  title={(it.isOfferLetterUploaded || offerLetterOverrides[candidate?.id]) ? "Re-upload Offer Letter" : "Upload Offer Letter"}
                                >
                                  <Upload className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <ChevronRight className={cn("h-4 w-4", isSelected ? "text-emerald-600" : "text-muted-foreground")} />
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {data?.data?.pagination && data.data.pagination.totalPages > 1 && (
            <div className="p-3 border-t bg-white/40 dark:bg-gray-800/40 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Page {currentPage} of {data.data.pagination.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === data.data.pagination.totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden min-w-0">
          {selected ? (
            <ScrollArea className="h-full">
              <div className="p-6 max-w-4xl mx-auto space-y-6 w-full overflow-hidden">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Candidate Details</h2>
                      {selected.isTransferredToProcessing && (
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200 uppercase tracking-wider text-[10px]">
                          Already Transferred
                        </Badge>
                      )}
                    </div>
                    {selectedIsOfferVerified ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 uppercase tracking-wider text-[10px] mb-2">
                        Offer Letter Verified
                      </Badge>
                    ) : ((selected.isOfferLetterUploaded || offerLetterOverrides[(selected.candidateProjectMap?.candidate || selected.candidate)?.id]) && (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 uppercase tracking-wider text-[10px] mb-2">
                        Offer Letter Ready
                      </Badge>
                    ))}
                    <p className="text-sm text-muted-foreground">Passed on {format(new Date(selected.updatedAt || selected.scheduledTime), "PPP")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Button 
                      onClick={handleTransfer}
                      disabled={isUpdating || selected.isTransferredToProcessing}
                      className={cn(
                        "shadow-md transition-all hover:scale-105 h-9 min-w-[120px]",
                        selected.isTransferredToProcessing 
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed hover:scale-100" 
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      )}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : selected.isTransferredToProcessing ? (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      ) : (
                        <MoveRight className="h-4 w-4 mr-2" />
                      )}
                      {selected.isTransferredToProcessing ? "Transferred" : "Transfer"}
                    </Button>

                    <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-0.5 shadow-sm overflow-hidden">
                      {(selected.isOfferLetterUploaded || offerLetterOverrides[(selected.candidateProjectMap?.candidate || selected.candidate)?.id] || selectedIsOfferVerified) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            const candidate = selected.candidateProjectMap?.candidate || selected.candidate;
                            const fileUrl = offerLetterOverrides[candidate?.id] || selected.offerLetterData?.document?.fileUrl;
                            if (fileUrl) {
                              setPdfViewerState({
                                isOpen: true,
                                fileUrl,
                                fileName: `Offer Letter - ${candidate?.firstName} ${candidate?.lastName}`,
                                candidateId: candidate?.id
                              });
                            }
                          }}
                          title="View Offer Letter"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden md:inline text-[10px] font-medium">View</span>
                        </Button>
                      )}
                      {!selectedIsOfferVerified && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 gap-1 px-1.5",
                            (selected.isOfferLetterUploaded || offerLetterOverrides[(selected.candidateProjectMap?.candidate || selected.candidate)?.id])
                              ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          )}
                          onClick={() => {
                            const candidate = selected.candidateProjectMap?.candidate || selected.candidate;
                            setOfferLetterModal({
                              isOpen: true,
                              candidateId: candidate?.id,
                              interviewId: selected.id
                            });
                          }}
                          title={(selected.isOfferLetterUploaded || offerLetterOverrides[(selected.candidateProjectMap?.candidate || selected.candidate)?.id]) ? "Re-upload Offer" : "Upload Offer"}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span className="hidden md:inline text-[10px] font-medium">
                            {(selected.isOfferLetterUploaded || offerLetterOverrides[(selected.candidateProjectMap?.candidate || selected.candidate)?.id]) ? "Re-upload" : "Upload"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 w-full min-w-0 overflow-hidden">
                  {/* Candidate Information Card */}
                  <Card className="border-emerald-100 dark:border-emerald-900/30 overflow-hidden shadow-sm w-full max-w-full">
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 px-6 py-4 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                        <User className="h-5 w-5 shrink-0" />
                        Candidate Details
                      </h3>
                      {(selected.candidateProjectMap?.candidate || selected.candidate)?.experience && (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                          {(selected.candidateProjectMap?.candidate || selected.candidate).experience} Years Experience
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-6 overflow-hidden max-w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-full">
                        <div className="space-y-4 min-w-0 overflow-hidden">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Full Name</p>
                            <p className="font-bold text-xl text-slate-800 dark:text-slate-200 truncate">
                              {(selected.candidateProjectMap?.candidate || selected.candidate)?.firstName} {(selected.candidateProjectMap?.candidate || selected.candidate)?.lastName}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                              <Mail className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Email Address</p>
                              <p className="text-sm font-medium truncate">{(selected.candidateProjectMap?.candidate || selected.candidate)?.email || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                              <Phone className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Contact Number</p>
                              <p className="text-sm font-medium truncate">
                                {(selected.candidateProjectMap?.candidate || selected.candidate)?.countryCode || "+91"} {(selected.candidateProjectMap?.candidate || selected.candidate)?.mobileNumber || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                              <CalendarDays className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Personal Info</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium capitalize">{(selected.candidateProjectMap?.candidate || selected.candidate)?.gender?.toLowerCase() || "N/A"}</p>
                                <span className="text-slate-300">•</span>
                                <p className="text-sm font-medium">
                                  {getAge((selected.candidateProjectMap?.candidate || selected.candidate)?.dateOfBirth) ? `${getAge((selected.candidateProjectMap?.candidate || selected.candidate)?.dateOfBirth)} years` : "Age N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {((selected.candidateProjectMap?.candidate || selected.candidate)?.qualifications?.length ?? 0) > 0 && (
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                                <GraduationCap className="h-4 w-4 text-slate-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Qualifications</p>
                                <div className="space-y-1 mt-1">
                                  {(selected.candidateProjectMap?.candidate || selected.candidate).qualifications.map((q: any) => (
                                    <div key={q.id} className="text-sm">
                                      <p className="font-medium truncate leading-tight">{q.qualification?.name || q.qualification?.shortName || "Degree"}</p>
                                      <p className="text-[11px] text-muted-foreground">{q.university} • {q.graduationYear}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4 min-w-0 overflow-hidden">
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Work Status</p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs">Experience</span>
                                <span className="text-xs font-bold text-emerald-600">{(selected.candidateProjectMap?.candidate || selected.candidate)?.totalExperience || "0"}y</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full" 
                                  style={{ width: `${Math.min(((selected.candidateProjectMap?.candidate || selected.candidate)?.totalExperience || 0) * 10, 100)}%` }} 
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground italic">Current: {(selected.candidateProjectMap?.candidate || selected.candidate)?.currentRole || "Not Specified"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Project & Handoff Context Card */}
                  <Card className="border-indigo-100 dark:border-indigo-900/30 overflow-hidden shadow-sm w-full max-w-full">
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 px-6 py-4 border-b border-indigo-100 dark:border-indigo-900/30">
                      <h3 className="font-semibold text-lg flex items-center gap-2 text-indigo-800 dark:text-indigo-400">
                        <Briefcase className="h-5 w-5 shrink-0" />
                        Project Context
                      </h3>
                    </div>
                    <CardContent className="p-6 overflow-hidden max-w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-full">
                        <div className="space-y-4 min-w-0 overflow-hidden">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target Project</p>
                            <p className="font-bold text-lg text-slate-800 dark:text-slate-200 truncate">
                              {selected.candidateProjectMap?.project?.title || selected.project?.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/40 shrink-0">
                              <Layers className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Hiring Designation</p>
                              <p className="text-sm font-medium truncate">{(selected.candidateProjectMap?.roleNeeded || selected.roleNeeded)?.designation || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/40 shrink-0">
                              <Clock className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Deadline & Status</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-600 border-amber-200 shrink-0">
                                  {selected.candidateProjectMap?.project?.priority || "Medium"}
                                </Badge>
                                <span className="text-xs font-medium">
                                  {selected.candidateProjectMap?.project?.deadline ? format(new Date(selected.candidateProjectMap.project.deadline), "MMM d, yyyy") : "No Deadline"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 min-w-0 overflow-hidden">
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requirement Details</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Type</p>
                                <p className="text-sm font-medium truncate">{(selected.candidateProjectMap?.project?.type || "Bulk").replace("_", " ")}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Creator</p>
                                <p className="text-sm font-medium truncate">{selected.candidateProjectMap?.project?.createdBy?.name || "System"}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Grooming Standard</p>
                                <div className="flex items-center gap-1.5">
                                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                  <p className="text-xs font-medium truncate">{selected.candidateProjectMap?.project?.groomingStandard || "A-Grade"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 min-w-0 overflow-hidden">
                          <div className="p-4 bg-indigo-50/30 dark:bg-indigo-900/20 rounded-xl border border-indigo-50 dark:border-indigo-900/40 overflow-hidden">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assigned Recruiter</p>
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shrink-0">
                                <AvatarFallback className="bg-indigo-500 text-white text-xs">
                                  {selected.candidateProjectMap?.recruiter?.name?.split(" ").map((n: string) => n[0]).join("") || "R"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{selected.candidateProjectMap?.recruiter?.name || "System Assigned"}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{selected.candidateProjectMap?.recruiter?.email || "recruiter@system.com"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-emerald-100 dark:border-emerald-900/30 w-full max-w-full overflow-hidden">
                  <CardContent className="p-6 overflow-hidden">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                      Interview Summary
                    </h3>
                    <div className="space-y-4 overflow-hidden">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm overflow-hidden">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg overflow-hidden">
                          <p className="text-muted-foreground text-xs uppercase font-semibold">Final Outcome</p>
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 mt-1">PASSED</Badge>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                          <p className="text-muted-foreground text-xs uppercase font-semibold">Interview Type</p>
                          <p className="font-medium capitalize mt-1">{selected.type || "—"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                          <p className="text-muted-foreground text-xs uppercase font-semibold">Mode</p>
                          <p className="font-medium capitalize mt-1">{selected.mode?.replace("_", " ") || "—"}</p>
                        </div>
                      </div>
                      
                      {selected.notes && (
                        <div className="pt-4 border-t">
                          <p className="text-sm font-semibold mb-2">Interviewer Feedback & Notes</p>
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm border italic text-slate-700 dark:text-slate-300 leading-relaxed">
                            "{selected.notes}"
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {selected.isTransferredToProcessing && 
                 selected.candidateProjectMap?.candidate?.id && 
                 selected.candidateProjectMap?.project?.id && 
                 selected.candidateProjectMap?.roleNeeded?.roleCatalogId && (
                  <ProcessingHistory
                    candidateId={selected.candidateProjectMap.candidate.id}
                    projectId={selected.candidateProjectMap.project.id}
                    roleCatalogId={selected.candidateProjectMap.roleNeeded.roleCatalogId}
                  />
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <CheckCircle2 className="h-10 w-10 opacity-20" />
                </div>
                <p className="font-medium">Select a candidate</p>
                <p className="text-sm">Choose from the list on the left to review and handoff</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {selected && (
        <SingleTransferToProcessingModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          candidateId={(selected.candidateProjectMap?.candidate || selected.candidate)?.id}
          candidateName={`${(selected.candidateProjectMap?.candidate || selected.candidate)?.firstName} ${(selected.candidateProjectMap?.candidate || selected.candidate)?.lastName}`}
          recruiterName={selected.candidateProjectMap?.recruiter?.name}
          projectId={selected.candidateProjectMap?.project?.id || selected.project?.id}
          roleCatalogId={(selected.candidateProjectMap?.roleNeeded || selected.roleNeeded)?.roleCatalogId || (selected.candidateProjectMap?.roleNeeded || selected.roleNeeded)?.roleCatalog?.id || ""}
          isOfferVerified={selectedIsOfferVerified}
          isAlreadyUploaded={selected.isOfferLetterUploaded || !!offerLetterOverrides[(selected.candidateProjectMap?.candidate || selected.candidate)?.id]}
          existingFileUrl={offerLetterOverrides[(selected.candidateProjectMap?.candidate || selected.candidate)?.id] || selected.offerLetterData?.document?.fileUrl}
          onSuccess={() => {
            if (selectedId === selected.id) {
              setSelectedId(null);
            }
            setSelectedBulkIds(prev => prev.filter(id => id !== selected.id));
          }}
        />
      )}

      {bulkTransferCandidates.length > 0 && filters.projectId !== "all" && (
        <MultiTransferToProcessingModal
          isOpen={bulkTransferModalOpen}
          onClose={() => setBulkTransferModalOpen(false)}
          candidates={bulkTransferCandidates}
          projectId={filters.projectId}
          roleCatalogId={
            filters.roleCatalogId !== "all" 
              ? filters.roleCatalogId 
              : (filteredList.find(it => selectedBulkIds.includes(it.id))?.candidateProjectMap?.roleNeeded?.roleCatalogId || 
                 filteredList.find(it => selectedBulkIds.includes(it.id))?.roleNeeded?.roleCatalogId || "")
          }
          onSuccess={() => {
            setSelectedBulkIds([]);
            if (selectedId && selectedBulkIds.includes(selectedId)) {
              setSelectedId(null);
            }
          }}
          onRemoveCandidate={(interviewId) => {
            setSelectedBulkIds(prev => prev.filter(id => id !== interviewId));
            // Close modal if no candidates left
            if (selectedBulkIds.length <= 1) {
              setBulkTransferModalOpen(false);
            }
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
          isAlreadyUploaded={!!(offerLetterInterview.isOfferLetterUploaded || offerLetterOverrides[offerLetterModal.candidateId!])}
          existingFileUrl={offerLetterOverrides[offerLetterModal.candidateId!] || offerLetterInterview.offerLetterData?.document?.fileUrl}
          onSuccess={(uploadData) => {
            if (uploadData?.fileUrl) {
              setOfferLetterOverrides(prev => ({ ...prev, [offerLetterModal.candidateId!]: uploadData.fileUrl }));
              
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
    </div>
  );
}
