import { useState, useMemo } from "react";
import { Loader2, User, Users, X, FileText, ChevronLeft, ChevronRight, Mail, Phone, Briefcase, Globe, Upload, Eye, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useTransferToProcessingMutation, processingApi } from "@/features/processing/data/processing.endpoints";
import { useUsersLookup } from "@/shared/hooks/useUsersLookup";
import { toast } from "sonner";
import { useAppDispatch } from "@/app/hooks";
import { CandidateDetailTooltip } from "@/features/projects/components/CandidateDetailTooltip";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { OfferLetterUploadModal } from "@/features/documents/components/OfferLetterUploadModal";
import { useGetProjectsQuery } from "@/services/projectsApi";
import { cn } from "@/lib/utils";
import { PDFViewer } from "@/components/molecules/PDFViewer";

interface CandidateTransferData {
  candidateId: string;
  candidateName: string;
  recruiterName?: string;
  assignedProcessingTeamUserId: string;
  notes: string;
}

interface MultiTransferToProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Array<{
    id: string;
    candidateId: string;
    candidate: any;
    candidateName: string;
    recruiterName?: string;
    isOfferLetterUploaded?: boolean;
    offerLetterData?: any;
  }>;
  projectId: string;
  roleCatalogId: string;
  onSuccess: () => void;
  onRemoveCandidate?: (candidateId: string) => void;
}

export function MultiTransferToProcessingModal({
  isOpen,
  onClose,
  candidates,
  projectId,
  roleCatalogId,
  onSuccess,
  onRemoveCandidate,
}: MultiTransferToProcessingModalProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16; // 4 rows × 4 columns

  // State for Offer Letter Upload
  const [offerLetterModal, setOfferLetterModal] = useState<{
    isOpen: boolean;
    candidateId: string | null;
  }>({
    isOpen: false,
    candidateId: null,
  });

  // Get current candidate for the offer letter modal from props to ensure fresh data
  const offerLetterCandidate = useMemo(() => {
    if (!offerLetterModal.candidateId) return null;
    return candidates.find(c => c.candidateId === offerLetterModal.candidateId);
  }, [candidates, offerLetterModal.candidateId]);

  // State for PDF Viewer
  const [pdfViewerState, setPdfViewerState] = useState<{
    isOpen: boolean;
    candidateId: string | null;
    fileUrl: string;
    fileName: string;
  }>({
    isOpen: false,
    candidateId: null,
    fileUrl: "",
    fileName: "",
  });

  // Local overrides for offer letter URLs to reflect immediate uploads
  const [offerLetterOverrides, setOfferLetterOverrides] = useState<Record<string, string>>({});

  // Derive the latest PDF URL from the candidates prop to ensure it stays in sync after re-uploads
  const activePdfUrl = useMemo(() => {
    if (!pdfViewerState.isOpen || !pdfViewerState.candidateId) return "";
    const candidate = candidates.find(c => c.candidateId === pdfViewerState.candidateId);
    // prefer local override if present (immediate upload result)
    const override = pdfViewerState.candidateId ? offerLetterOverrides[pdfViewerState.candidateId] : undefined;
    const url = override || candidate?.offerLetterData?.document?.fileUrl || pdfViewerState.fileUrl;
    // Add cache buster to ensure the PDF viewer reloads the content if the file changed but URL remained same
    return url ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}` : "";
  }, [candidates, pdfViewerState.isOpen, pdfViewerState.candidateId, pdfViewerState.fileUrl, offerLetterOverrides]);

  const dispatch = useAppDispatch();
  const { data: projectsData } = useGetProjectsQuery({ limit: 100 });
  const selectedProject = useMemo(() => 
    projectsData?.data?.projects?.find((p: any) => p.id === projectId),
    [projectsData, projectId]
  );

  const selectedRole = useMemo(() => {
    if (!selectedProject?.rolesNeeded || !roleCatalogId) return null;
    return selectedProject.rolesNeeded.find((r: any) => (r.roleCatalogId || r.roleCatalog?.id) === roleCatalogId);
  }, [selectedProject, roleCatalogId]);

  const roleDesignation = selectedRole?.designation || "Unknown Role";

  // Initialize transfer data for each candidate
  const [candidatesData, setCandidatesData] = useState<Record<string, CandidateTransferData>>(() => {
    const initial: Record<string, CandidateTransferData> = {};
    candidates.forEach(c => {
      initial[c.candidateId] = {
        candidateId: c.candidateId,
        candidateName: c.candidateName,
        recruiterName: c.recruiterName,
        assignedProcessingTeamUserId: "",
        notes: "",
      };
    });
    return initial;
  });

  const [transferToProcessing, { isLoading }] = useTransferToProcessingMutation();
  const { users, isLoading: isLoadingUsers } = useUsersLookup();

  const processingUsers = useMemo(() => {
    return users.filter((u: any) => 
      u.role?.toLowerCase().includes("processing")
    );
  }, [users]);

  // Pagination calculations
  const totalPages = Math.ceil(candidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCandidates = candidates.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const updateCandidateData = (candidateId: string, field: keyof CandidateTransferData, value: string) => {
    setCandidatesData(prev => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        [field]: value,
      },
    }));
  };

  const handleBatchAssign = (userId: string) => {
    setCandidatesData(prev => {
      const updated = { ...prev };
      // Only update candidates that are currently in the list
      candidates.forEach(c => {
        if (updated[c.candidateId]) {
          updated[c.candidateId] = {
            ...updated[c.candidateId],
            assignedProcessingTeamUserId: userId,
          };
        }
      });
      return updated;
    });
    toast.success(`Assigned to all ${candidates.length} candidates`);
  };

  const allHaveProcessingUser = useMemo(() => {
    // Only check candidates currently in the list
    return candidates.every(c => candidatesData[c.candidateId]?.assignedProcessingTeamUserId);
  }, [candidates, candidatesData]);

  const handleSubmit = async () => {
    if (!allHaveProcessingUser) {
      toast.error("Please assign a processing user to all candidates");
      return;
    }

    try {
      // Only process candidates currently in the list
      const activeCandidateIds = candidates.map(c => c.candidateId);
      
      // Group candidates by identical processing user AND identical notes
      // to avoid leaking notes between candidates while still allowing batching.
      const groupedTransfers = activeCandidateIds.reduce((acc, candidateId) => {
        const data = candidatesData[candidateId];
        // Create a unique key for grouping (User ID + exact notes)
        const key = `${data.assignedProcessingTeamUserId}|${data.notes || ""}`;
        
        if (!acc[key]) {
          acc[key] = {
            candidateIds: [],
            userId: data.assignedProcessingTeamUserId,
            notes: data.notes,
          };
        }
        
        acc[key].candidateIds.push(candidateId);
        return acc;
      }, {} as Record<string, { candidateIds: string[]; userId: string; notes: string }>);

      // Make API calls for each unique group
      const transfers = Object.values(groupedTransfers).map((group) =>
        transferToProcessing({
          candidateIds: group.candidateIds,
          projectId,
          roleCatalogId,
          assignedProcessingTeamUserId: group.userId,
          notes: group.notes || undefined,
        }).unwrap()
      );

      await Promise.all(transfers);

      toast.success(`${candidates.length} candidates transferred successfully`);
      onSuccess();
      onClose();
      
      // Reset state
      setCurrentPage(1);
      const initial: Record<string, CandidateTransferData> = {};
      candidates.forEach(c => {
        initial[c.candidateId] = {
          candidateId: c.candidateId,
          candidateName: c.candidateName,
          recruiterName: c.recruiterName,
          assignedProcessingTeamUserId: "",
          notes: "",
        };
      });
      setCandidatesData(initial);
    } catch (error: any) {
      console.error("Bulk transfer error:", error);
      toast.error(error?.data?.message || "Failed to transfer candidates");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="!max-w-[1400px] w-[90vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none"
        showCloseButton={false}
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-emerald-600" />
                Bulk Transfer candidates to processing
              </DialogTitle>
              <DialogDescription className="mt-1">
                Assign processing team members and add notes for {candidates.length} candidates. Hover over names for details.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm">
                <Label className="text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap px-1">
                  Assign All To:
                </Label>
                <Select onValueChange={handleBatchAssign}>
                  <SelectTrigger className="h-8 w-[180px] text-xs bg-white border-emerald-200 hover:border-emerald-400 focus:ring-emerald-500 shadow-none">
                    <SelectValue placeholder="Batch assign member" />
                  </SelectTrigger>
                  <SelectContent>
                    {processingUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-emerald-600" />
                          {user.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                {totalPages > 1 && (
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700 font-bold px-3 py-1">
                    Page {currentPage} of {totalPages}
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold px-3 py-1">
                  {candidates.length} Selected
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <TooltipProvider delayDuration={200}>
          <ScrollArea className="flex-1 px-6 py-4 bg-slate-50/50 dark:bg-gray-950/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-4">
              {currentCandidates.map((candidate) => {
                const data = candidatesData[candidate.candidateId];
                
                return (
                  <Card key={candidate.candidateId} className="border-emerald-100 dark:border-emerald-900/30 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-900 h-fit relative group/card group overflow-hidden">
                    {onRemoveCandidate && (
                      <button
                        type="button"
                        onClick={() => onRemoveCandidate(candidate.id)}
                        className="absolute top-1 right-1 z-20 h-5 w-5 rounded-full bg-slate-200/50 hover:bg-red-500 text-slate-600 hover:text-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shadow-sm border border-slate-300/50"
                        title="Remove from selection"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <CardContent className="p-3 space-y-2">
                      {/* Candidate Info Header */}
                      <div className="flex items-center justify-between gap-1.5 border-b pb-1.5">
                          <CandidateDetailTooltip candidate={candidate.candidate}>
                            <div className="flex items-center gap-1 cursor-help group w-fit">
                              <div className="p-0.5 rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                                <User className="h-3 w-3" />
                              </div>
                              <h4 className="font-semibold text-xs border-b border-dotted border-emerald-300 group-hover:border-emerald-600 transition-colors truncate max-w-[100px]">
                                {candidate.candidateName}
                              </h4>
                            </div>
                          </CandidateDetailTooltip>
                          <div className="flex items-center gap-1 shrink-0">
                            {candidate.isOfferLetterUploaded && (
                              <>
                                <Badge 
                                  variant="secondary" 
                                  className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-[9px] font-bold px-1.5 py-0 h-5 whitespace-nowrap"
                                >
                                  DOC UPLOADED
                                </Badge>
                                <Button
                                  variant="ghost"
                                  type="button"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-100 shadow-sm"
                                  onClick={() => {
                                    const fileUrl = candidate.offerLetterData?.document?.fileUrl;
                                    if (fileUrl) {
                                      setPdfViewerState({
                                        isOpen: true,
                                        candidateId: candidate.candidateId,
                                        fileUrl,
                                        fileName: `Offer Letter - ${candidate.candidateName}`,
                                      });
                                    } else {
                                      toast.error("File URL not found");
                                    }
                                  }}
                                  title="View Offer Letter"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              type="button"
                              size="sm"
                              className={cn(
                                "h-6 w-6 p-0 border shadow-sm transition-all",
                                candidate.isOfferLetterUploaded 
                                  ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-100" 
                                  : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-100"
                              )}
                              onClick={() => setOfferLetterModal({ isOpen: true, candidateId: candidate.candidateId })}
                              title={candidate.isOfferLetterUploaded ? "Re-upload Offer Letter" : "Upload Offer Letter (Optional)"}
                            >
                              <Upload className="h-3 w-3" />
                            </Button>
                          </div>
                      </div>

                      {/* Candidate Extra Details */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-slate-500 overflow-hidden">
                        {candidate.candidate?.source && (
                          <div className="flex items-center gap-1 truncate" title={`Source: ${candidate.candidate.source}`}>
                            <Globe className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{candidate.candidate.source}</span>
                          </div>
                        )}
                        {(candidate.candidate?.totalExperience !== undefined || candidate.candidate?.experience !== undefined) && (
                          <div className="flex items-center gap-1 truncate">
                            <Briefcase className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{candidate.candidate.totalExperience || candidate.candidate.experience} yrs</span>
                          </div>
                        )}
                        {candidate.candidate?.currentRole && (
                          <div className="flex items-center gap-1 truncate col-span-2" title={`Role: ${candidate.candidate.currentRole}`}>
                            <User className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            <span className="truncate italic font-medium">{candidate.candidate.currentRole}</span>
                          </div>
                        )}
                        {candidate.candidate?.email && (
                          <div className="flex items-center gap-1 truncate col-span-2" title={candidate.candidate.email}>
                            <Mail className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{candidate.candidate.email}</span>
                            {candidate.recruiterName && (
                              <Badge variant="outline" className="ml-auto text-[8px] font-medium border-slate-200 bg-slate-50 text-slate-600 px-1 py-0 uppercase tracking-tighter shrink-0">
                                {candidate.recruiterName.split(' ')[0]}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Processing User Selection */}
                      <div className="space-y-1">
                        <Label htmlFor={`processing-user-${candidate.candidateId}`} className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          Processing <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={data.assignedProcessingTeamUserId}
                          onValueChange={(val) => 
                            updateCandidateData(candidate.candidateId, "assignedProcessingTeamUserId", val)
                          }
                        >
                          <SelectTrigger id={`processing-user-${candidate.candidateId}`} className="h-7 text-xs bg-white border-slate-300 hover:border-emerald-400 transition-colors">
                            <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select member"} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingUsers ? (
                              <div className="p-4 text-center">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                              </div>
                            ) : processingUsers.length === 0 ? (
                              <div className="p-4 text-center text-xs text-muted-foreground">
                                No members found
                              </div>
                            ) : (
                              processingUsers.map((user: any) => (
                                <SelectItem key={user.id} value={user.id} className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3" />
                                    {user.name}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Notes */}
                      <div className="space-y-1">
                        <Label htmlFor={`notes-${candidate.candidateId}`} className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1">
                          <FileText className="h-2.5 w-2.5" />
                          Notes
                        </Label>
                        <Textarea
                          id={`notes-${candidate.candidateId}`}
                          placeholder="Instructions..."
                          value={data.notes}
                          onChange={(e) => 
                            updateCandidateData(candidate.candidateId, "notes", e.target.value)
                          }
                          className="h-[45px] text-[10px] leading-snug resize-none bg-white border-slate-300 hover:border-emerald-400 focus:border-emerald-500 transition-colors p-1.5"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TooltipProvider>

        <div className="px-6 py-4 border-t bg-white dark:bg-gray-900 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {!allHaveProcessingUser && (
            <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                Please assign a processing team member to all candidates before submitting.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {Object.values(candidatesData).filter(c => c.assignedProcessingTeamUserId).length} of {candidates.length} assigned
              </p>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="h-8 px-3 gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-xs text-muted-foreground px-2">
                    Showing {startIndex + 1}-{Math.min(endIndex, candidates.length)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !allHaveProcessingUser}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Transfer All
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {offerLetterModal.isOpen && offerLetterCandidate && (
        <OfferLetterUploadModal
          isOpen={offerLetterModal.isOpen}
          onClose={() => setOfferLetterModal({ isOpen: false, candidateId: null })}
          candidateId={offerLetterCandidate.candidateId}
          candidateName={offerLetterCandidate.candidateName}
          projectId={projectId}
          projectTitle={selectedProject?.title || "Project"}
          roleCatalogId={roleCatalogId}
          roleDesignation={roleDesignation}
          isAlreadyUploaded={offerLetterCandidate.isOfferLetterUploaded}
          existingFileUrl={offerLetterCandidate.offerLetterData?.document?.fileUrl}
          onSuccess={(uploadData) => {
            if (uploadData?.fileUrl) {
              // Update local override mapping so viewer uses the new file immediately
              setOfferLetterOverrides(prev => ({ ...prev, [offerLetterCandidate.candidateId]: uploadData.fileUrl }));
              // Optionally open viewer immediately with new file
              setPdfViewerState({ isOpen: true, candidateId: offerLetterCandidate.candidateId, fileUrl: uploadData.fileUrl, fileName: `Offer Letter - ${offerLetterCandidate.candidateName}` });

              // Refresh the processing candidates list so the transfer modal shows fresh data
              try {
                dispatch(processingApi.util.invalidateTags([{ type: "ProcessingSummary" }]));
                dispatch(
                  processingApi.endpoints.getCandidatesToTransfer.initiate({ projectId, page: 1, limit: 20 }, { forceRefetch: true })
                );
              } catch (err) {
                console.warn("Failed to refresh transfer candidates:", err);
              }
            }
            toast.success(`Offer letter updated successfully`);
          }}
        />
      )}

      <PDFViewer
        fileUrl={activePdfUrl}
        fileName={pdfViewerState.fileName}
        isOpen={pdfViewerState.isOpen}
        onClose={() => setPdfViewerState({ isOpen: false, candidateId: null, fileUrl: "", fileName: "" })}
      />
    </Dialog>
  );
}
