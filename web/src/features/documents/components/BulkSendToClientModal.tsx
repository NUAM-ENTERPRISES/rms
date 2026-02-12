import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  User,
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  FileText,
  Download,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  MessageSquare,
  Edit2,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PDFViewer } from "@/components/molecules";
import { MergeVerifiedModal } from "./MergeVerifiedModal";
import { BulkViewDocumentsModal } from "./BulkViewDocumentsModal";
import { ClientForwardHistoryModal } from "./ClientForwardHistoryModal";
import { useGetMergedDocumentQuery, useBulkForwardToClientMutation } from "../api";

interface BulkSendToClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Array<{
    id?: string;
    candidateProjectMapId?: string;
    candidate: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      mobileNumber: string;
      profileImage?: string;
    };
    project: {
      id: string;
      title: string;
      clientName?: string;
      client?: {
        id: string;
        name: string;
        email?: string;
        phone?: string;
      };
    };
    roleNeeded?: {
      roleCatalog?: {
        label: string;
      };
    };
    docsStatus?: string;
  }>;
  onSuccess?: () => void;
}

export function BulkSendToClientModal({
  isOpen,
  onClose,
  candidates,
  onSuccess,
}: BulkSendToClientModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16; // 4 rows × 4 columns
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedCandidateForMerge, setSelectedCandidateForMerge] = useState<any>(null);
  const [viewDocumentsModalOpen, setViewDocumentsModalOpen] = useState(false);
  const [selectedCandidateForViewDocs, setSelectedCandidateForViewDocs] = useState<any>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string>("");
  const [selectedPdfName, setSelectedPdfName] = useState<string>("");
  const [mergedDocsData, setMergedDocsData] = useState<Record<string, any>>({});
  const [isFetchingMergedDocs, setIsFetchingMergedDocs] = useState(false);
  const [selectedDocsByCandidate, setSelectedDocsByCandidate] = useState<Record<string, string[]>>({});
  const [recipientEmail, setRecipientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // History modal state (opens forwarding history for a single candidate)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCandidate, setHistoryCandidate] = useState<any>(null);

  // Local visibility set so user can remove candidates from the batch before sending
  const [visibleCandidateKeys, setVisibleCandidateKeys] = useState<Set<string>>(new Set());

  const [bulkForward, { isLoading: isBulkForwarding }] = useBulkForwardToClientMutation();

  const removeCandidate = (key: string) => {
    setVisibleCandidateKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);

      // remove any selected docs for the removed candidate
      setSelectedDocsByCandidate((prevDocs) => {
        const copy = { ...prevDocs } as Record<string, string[]>;
        delete copy[key];
        return copy;
      });

      const newSize = next.size;
      if (newSize === 0) {
        // close modal if no candidates remain
        onClose();
      } else {
        const newTotalPages = Math.max(1, Math.ceil(newSize / itemsPerPage));
        setCurrentPage((p) => Math.min(p, newTotalPages));
      }

      return next;
    });
  }

  // Initialize recipient email from the first candidate's client if available
  // Also initialize a local visible-candidates set so users can remove cards locally
  useEffect(() => {
    if (isOpen) {
      // set visible candidates to incoming list
      const keys = new Set(candidates.map(c => c.id || c.candidateProjectMapId || ""));
      setVisibleCandidateKeys(keys);

      if (candidates.length > 0) {
        // Find the first candidate that has a client email
        const candidateWithClient = candidates.find(c => c.project.client?.email);
        const clientEmail = candidateWithClient?.project.client?.email;
        
        if (clientEmail) {
          setRecipientEmail(clientEmail);
          setIsEditingEmail(false);
        } else {
          setIsEditingEmail(true);
        }
      }
    } else {
      // Reset state when modal closes
      setShowValidationErrors(false);
      setRecipientEmail("");
      setNotes("");
      setIsEditingEmail(false);
      setSelectedDocsByCandidate({});
      setMergedDocsData({});
      setCurrentPage(1);
      setVisibleCandidateKeys(new Set());
    }
  }, [isOpen, candidates]);

  // Compute visible candidates (allows per-card removal)
  const visibleCandidates = useMemo(() => {
    if (visibleCandidateKeys.size === 0) return candidates;
    return candidates.filter(c => visibleCandidateKeys.has(c.id || c.candidateProjectMapId || ""));
  }, [candidates, visibleCandidateKeys]);

  // Pagination calculations (based on visible candidates)
  const totalPages = Math.ceil(visibleCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCandidates = visibleCandidates.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const commonClient = useMemo(() => {
    if (candidates.length === 0) return null;
    const project = candidates[0].project;
    return project.client || (project.clientName ? { name: project.clientName } : null);
  }, [candidates]);

  const handleSendToClient = async () => {
    if (!recipientEmail) {
      toast.error("Recipient email is required");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validation check: Ensure all candidates have documents selected
    const candidatesWithoutSelections = candidates.filter(candidate => {
      const candidateKey = candidate.id || candidate.candidateProjectMapId || "";
      const selectedDocs = selectedDocsByCandidate[candidateKey] || [];
      return selectedDocs.length === 0;
    });

    if (candidatesWithoutSelections.length > 0) {
      setShowValidationErrors(true);
      toast.error(`Please select documents for all candidates. ${candidatesWithoutSelections.length} candidate(s) still need selection.`);
      return;
    }

    setShowValidationErrors(false);
    setIsSubmitting(true);
    setIsFetchingMergedDocs(true);
    try {
      // Prepare selection data as per API reference
      const selections = visibleCandidates.map((candidate) => {
        const candidateKey = candidate.id || candidate.candidateProjectMapId || "";
        const selectedDocs = selectedDocsByCandidate[candidateKey] || [];
        
        const sendType = selectedDocs.includes("merged") 
          ? "merged" 
          : "individual";

        return {
          candidateId: candidate.candidate.id,
          roleCatalogId: candidate.roleNeeded?.roleCatalog?.id || "",
          sendType,
          documentIds: sendType === "individual" ? selectedDocs : undefined,
        };
      });

      const payload = {
        recipientEmail,
        projectId: visibleCandidates[0]?.project.id,
        notes: notes || `Attached are the verified documents for ${visibleCandidates.length} candidates.`,
        selections
      }; 

      console.log("Bulk Forwarding Payload:", payload);
      
      await bulkForward(payload).unwrap();

      toast.success(`Mail sent successfully and queued (${visibleCandidates.length}). Please wait for 3 minutes.`);
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Bulk send error:", error);
      toast.error(error?.data?.message || error?.message || "Failed to send candidates");
    } finally {
      setIsSubmitting(false);
      setIsFetchingMergedDocs(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-[1400px] w-[90vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none"
        showCloseButton={false}
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Send className="h-6 w-6 text-blue-600" />
                Bulk Send to Client
              </DialogTitle>
              <DialogDescription className="mt-1">
                Review and send {visibleCandidates.length} candidates to client. All
                documents are verified.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* History button opens ClientForwardHistoryModal for the first visible candidate */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const first = visibleCandidates[0];
                  if (!first) return;
                  setHistoryCandidate(first);
                  setHistoryOpen(true);
                }}
                disabled={visibleCandidates.length === 0}
                className="h-8 px-2 text-slate-600"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>

              {totalPages > 1 && (
                <Badge
                  variant="outline"
                  className="border-blue-300 text-blue-700 font-bold px-3 py-1"
                >
                  Page {currentPage} of {totalPages}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 border-blue-200 font-bold px-3 py-1"
              >
                {visibleCandidates.length} Selected
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4 bg-slate-50/50 dark:bg-gray-950/50">
          <div className="max-w-5xl mx-auto space-y-2 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Client Information Section */}
              <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-3 w-3 text-blue-600" />
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">Recipient Details</h3>
                </div>
                
                {commonClient ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-0.5">
                        <p className="text-slate-500 text-[8px] font-bold uppercase tracking-wider">Client Name</p>
                        <p className="text-slate-900 dark:text-white text-xs font-semibold">{commonClient.name || "N/A"}</p>
                      </div>
                      {commonClient.phone && (
                        <div className="space-y-0.5">
                          <p className="text-slate-500 text-[8px] font-bold uppercase tracking-wider">Contact</p>
                          <p className="text-slate-900 dark:text-white text-xs font-semibold truncate">{commonClient.phone}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-slate-500 text-[8px] font-bold uppercase">Email</Label>
                      <div className="flex gap-1">
                        <div className="relative flex-1">
                          <Input
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            disabled={!isEditingEmail}
                            className={cn(
                              "pl-7 h-8 text-xs border-slate-200 focus:ring-blue-500/20",
                              !isEditingEmail ? "bg-slate-50 dark:bg-slate-800/50 text-slate-600" : "bg-white dark:bg-gray-900"
                            )}
                            placeholder="client@email.com"
                          />
                          <Mail className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingEmail(!isEditingEmail)}
                          className="h-8 px-2 border-slate-200 text-slate-600 dark:text-slate-400 text-xs"
                        >
                          {isEditingEmail ? "Save" : <Edit2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-amber-50 border border-amber-100 p-2 rounded flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-[10px]">
                        <p className="text-amber-800 font-semibold">No client details</p>
                        <p className="text-amber-700">Enter email manually</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-600 dark:text-slate-400 text-[8px] font-bold">Email</Label>
                      <div className="relative">
                        <Input
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          className="pl-7 h-8 text-xs border-slate-200 dark:border-slate-800"
                          placeholder="client@email.com"
                        />
                        <Mail className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Section */}
              <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-3 w-3 text-blue-600" />
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">Message (Optional)</h3>
                </div>
                <Textarea 
                  placeholder={`Message about these ${candidates.length} candidates...`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px] text-xs border-slate-200 dark:border-slate-800 focus:ring-blue-500/20 resize-none p-2"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Candidates</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>

          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-4">
            {currentCandidates.map((candidate) => {
              const roleLabel =
                candidate.roleNeeded?.roleCatalog?.label || "Role Not Specified";
              const candidateName = `${candidate.candidate.firstName} ${candidate.candidate.lastName}`;
              const candidateKey = candidate.id || candidate.candidateProjectMapId || "";
              const candidateSelectedDocs = selectedDocsByCandidate[candidateKey] || [];
              const selectedDocsCount = candidateSelectedDocs.length;
              const hasMerged = candidateSelectedDocs.includes("merged");

              return (
                <Card
                  key={candidateKey}
                  className={cn(
                    "relative border-blue-100 dark:border-blue-900/30 shadow-sm transition-all h-fit overflow-hidden",
                    selectedDocsCount > 0 
                      ? "ring-2 ring-emerald-500/50 border-emerald-200 shadow-emerald-50 bg-white dark:bg-gray-900" 
                      : showValidationErrors
                        ? "ring-2 ring-rose-500 border-rose-300 shadow-rose-100 bg-rose-50 dark:bg-rose-950/20"
                        : "ring-2 ring-rose-500/30 border-rose-200 shadow-rose-50 bg-white dark:bg-gray-900"
                  )}
                >
                  {/* Left Side Required Line */}
                  {selectedDocsCount === 0 && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 z-10" />
                  )}

                  {/* Selection/Required Indicator Top Right */}
                  {/* Close / remove from batch button */}
                <div className="absolute top-2 right-2 z-30">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCandidate(candidateKey)}
                        aria-label={`Remove ${candidateName} from batch`}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 text-white">Remove from batch</TooltipContent>
                  </Tooltip>
                </div>

                <div className="absolute top-0 right-8 z-10">
                  {selectedDocsCount > 0 ? (
                    <div className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                      <CheckCircle2 className="h-3 w-3" />
                      {hasMerged ? "Merged" : `${selectedDocsCount} Docs`}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                      <AlertCircle className="h-3 w-3" />
                      Documents Required
                    </div>
                  )}
                </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Profile Section */}
                    <div className="flex items-start gap-3 border-b pb-3">
                      <div className="flex-shrink-0">
                        {candidate.candidate.profileImage ? (
                          <img
                            src={candidate.candidate.profileImage}
                            alt={candidateName}
                            className="h-12 w-12 rounded-full object-cover shadow-md border-2 border-blue-100"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg text-sm font-bold text-white">
                            {candidate.candidate.firstName?.[0]?.toUpperCase() ||
                              "A"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {candidateName}
                        </h4>
                        {candidate.docsStatus && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] mt-1",
                              candidate.docsStatus === "verified"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-yellow-50 text-yellow-700 border-yellow-200"
                            )}
                          >
                            {candidate.docsStatus}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Generate Unified PDF Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              type="button"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-100 shadow-sm"
                              onClick={() => {
                                setSelectedCandidateForMerge(candidate);
                                setMergeModalOpen(true);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white">
                            Generate Unified PDF - Combines all candidate documents into a single PDF file
                          </TooltipContent>
                        </Tooltip>

                        {/* Documents Attachments Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              type="button"
                              size="sm"
                              className={cn(
                                "h-8 w-8 p-0 border shadow-sm relative",
                                selectedDocsCount > 0 
                                  ? "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" 
                                  : "text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100"
                              )}
                              onClick={() => {
                                setSelectedCandidateForViewDocs(candidate);
                                setViewDocumentsModalOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                              {selectedDocsCount > 0 ? (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                  {hasMerged ? "M" : selectedDocsCount}
                                </span>
                              ) : (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                                  !
                                </span>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white">
                            {selectedDocsCount > 0 
                              ? `${selectedDocsCount} document(s) selected for attachment`
                              : "Action Required: Please select documents to attach for this candidate"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-2">
                      {/* Email */}
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <a
                          href={`mailto:${candidate.candidate.email}`}
                          className="text-xs text-blue-600 hover:underline truncate"
                          title={candidate.candidate.email}
                        >
                          {candidate.candidate.email}
                        </a>
                      </div>

                      {/* Phone */}
                      {candidate.candidate.mobileNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <a
                            href={`tel:${candidate.candidate.mobileNumber}`}
                            className="text-xs text-blue-600 hover:underline"
                            title={candidate.candidate.mobileNumber}
                          >
                            {candidate.candidate.mobileNumber}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Project & Role */}
                    <div className="space-y-2 border-t pt-2">
                      {/* Project */}
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">
                            Project
                          </p>
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {candidate.project.title}
                          </p>
                        </div>
                      </div>

                      {/* Role Catalog */}
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">
                            Position
                          </p>
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {roleLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </TooltipProvider>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-white dark:bg-gray-900 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Reviewing {visibleCandidates.length} candidates
                </p>
                {Object.keys(selectedDocsByCandidate).length < visibleCandidates.length && (
                  <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {visibleCandidates.length - Object.keys(selectedDocsByCandidate).length} pending document selection
                  </p>
                )}
              </div>

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
                disabled={isSubmitting || isFetchingMergedDocs}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSendToClient}
                disabled={isSubmitting || isFetchingMergedDocs}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 min-w-[140px]"
              >
                {isSubmitting || isFetchingMergedDocs ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {isFetchingMergedDocs ? "Fetching Documents..." : "Queuing..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send to Client
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Merge Verified Modal */}
    {selectedCandidateForMerge && (
      <MergeVerifiedModal
        isOpen={mergeModalOpen}
        onOpenChange={setMergeModalOpen}
        candidateId={selectedCandidateForMerge.candidate.id}
        projectId={selectedCandidateForMerge.project.id}
        roleCatalogId={selectedCandidateForMerge.roleNeeded?.roleCatalog?.id || ""}
        onViewDocument={(url, name) => {
          window.open(url, '_blank');
        }}
      />
    )}

    {/* View Documents Modal */}
    {selectedCandidateForViewDocs && (
      <BulkViewDocumentsModal
        isOpen={viewDocumentsModalOpen}
        onOpenChange={setViewDocumentsModalOpen}
        candidateId={selectedCandidateForViewDocs.candidate.id}
        projectId={selectedCandidateForViewDocs.project.id}
        roleCatalogId={selectedCandidateForViewDocs.roleNeeded?.roleCatalog?.id || ""}
        candidateName={`${selectedCandidateForViewDocs.candidate.firstName} ${selectedCandidateForViewDocs.candidate.lastName}`}
        candidateData={selectedCandidateForViewDocs.candidate}
        projectTitle={selectedCandidateForViewDocs.project.title}
        roleLabel={selectedCandidateForViewDocs.roleNeeded?.roleCatalog?.label || "Role Not Specified"}
        selectedDocs={selectedDocsByCandidate[selectedCandidateForViewDocs.id || selectedCandidateForViewDocs.candidateProjectMapId || ""] || []}
        onSelectedDocsChange={(docs) => {
          const candidateKey = selectedCandidateForViewDocs.id || selectedCandidateForViewDocs.candidateProjectMapId || "";
          setSelectedDocsByCandidate(prev => ({
            ...prev,
            [candidateKey]: docs
          }));
        }}
      />
    )}

    {/* Client Forwarding History Modal (opens for selected candidate) */}
    {historyCandidate && (
      <ClientForwardHistoryModal
        isOpen={historyOpen}
        onOpenChange={setHistoryOpen}
        candidateId={historyCandidate.candidate?.id}
        projectId={historyCandidate.project?.id}
        roleCatalogId={historyCandidate.roleNeeded?.roleCatalog?.id}
        candidateName={`${historyCandidate.candidate?.firstName || ""} ${historyCandidate.candidate?.lastName || ""}`}
      />
    )}
    {/* PDF Viewer Modal */}
    <PDFViewer
      fileUrl={selectedPdfUrl}
      fileName={selectedPdfName}
      isOpen={pdfViewerOpen}
      onClose={() => setPdfViewerOpen(false)}
      showDownload={true}
      showZoomControls={true}
      showRotationControls={true}
      showFullscreenToggle={true}
    />
  </>
  );
}
