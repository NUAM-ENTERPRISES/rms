import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  User,
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  FileText,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  MessageSquare,
  Edit2,
  History,
  FileSpreadsheet,
  Paperclip,
  Trash2,
  Users,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BulkViewDocumentsModal, SelectedDoc } from "./BulkViewDocumentsModal";
import { ClientForwardHistoryModal } from "./ClientForwardHistoryModal";
import { useBulkForwardToClientMutation, BulkForwardToClientRequest } from "../api";
import { useUploadDocumentMutation } from "@/features/candidates/api";
import { MultiEmailInput } from "./MultiEmailInput";

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
        id: string;
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
  const [viewDocumentsModalOpen, setViewDocumentsModalOpen] = useState(false);
  const [selectedCandidateForViewDocs, setSelectedCandidateForViewDocs] = useState<any>(null);
  const [isFetchingMergedDocs, setIsFetchingMergedDocs] = useState(false);
  const [selectedDocsByCandidate, setSelectedDocsByCandidate] = useState<Record<string, SelectedDoc[]>>({});
  const [recipientEmail, setRecipientEmail] = useState("");
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCCBCC, setShowCCBCC] = useState(false);
  const [notes, setNotes] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"email_individual" | "email_combined" | "google_drive">("email_individual");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // History modal state (opens forwarding history for a single candidate)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCandidate, setHistoryCandidate] = useState<any>(null);

  // Local visibility set so user can remove candidates from the batch before sending
  const [visibleCandidateKeys, setVisibleCandidateKeys] = useState<Set<string>>(new Set());

  const [bulkForward] = useBulkForwardToClientMutation();
  const [uploadDocument] = useUploadDocumentMutation();

  const removeCandidate = (key: string) => {
    setVisibleCandidateKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);

      // remove any selected docs for the removed candidate
      setSelectedDocsByCandidate((prevDocs) => {
        const copy = { ...prevDocs } as Record<string, SelectedDoc[]>;
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
      setCc([]);
      setBcc([]);
      setShowCCBCC(false);
      setNotes("");
      setIsEditingEmail(false);
      setSelectedDocsByCandidate({});
      setCurrentPage(1);
      setVisibleCandidateKeys(new Set());
      setCsvFile(null);
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

  // Total size of selected documents in MB
  const totalSelectedSizeInfo = useMemo(() => {
    let totalBytes = 0;
    Object.values(selectedDocsByCandidate).forEach(candidateDocs => {
      candidateDocs.forEach(doc => {
        totalBytes += (doc.size || 0);
      });
    });
    // Add CSV size if present
    if (csvFile) {
      totalBytes += csvFile.size;
    }
    const mb = totalBytes / (1024 * 1024);
    return { bytes: totalBytes, mb };
  }, [selectedDocsByCandidate, csvFile]);

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

    // Gmail/Outlook limit check for combined delivery
    if (deliveryMethod === "email_combined" && totalSelectedSizeInfo.mb > 20) {
      toast.error(`Total document size (${totalSelectedSizeInfo.mb.toFixed(2)}MB) exceeds the 20MB limit for combined emails. Please remove some candidates or use Google Drive method.`);
      return;
    }

    setShowValidationErrors(false);
    setIsSubmitting(true);
    setIsFetchingMergedDocs(true);
    try {
      let csvUrl = undefined;
      let csvName = undefined;

      // Handle CSV upload if present
      if (csvFile && visibleCandidates.length > 0) {
        toast.info(`Uploading ${csvFile.name}...`);
        const firstCandidateId = visibleCandidates[0].candidate.id;
        
        const formData = new FormData();
        formData.append("file", csvFile);
        formData.append("docType", "bulk_csv_attachment");
        
        const uploadResult = await uploadDocument({ 
          candidateId: firstCandidateId, 
          formData 
        }).unwrap();

        if (uploadResult.success) {
          csvUrl = uploadResult.data.fileUrl;
          csvName = csvFile.name;
          console.log("CSV Upload Success:", { csvUrl, csvName });
        }
      }

      // Prepare selection data as per API reference
      const selections = visibleCandidates.map((candidate) => {
        const candidateKey = candidate.id || candidate.candidateProjectMapId || "";
        const selectedDocs = selectedDocsByCandidate[candidateKey] || [];
        
        const sendType = (selectedDocs.some(d => d.id === "merged") 
          ? "merged" 
          : "individual") as "merged" | "individual";

        return {
          candidateId: candidate.candidate.id,
          projectId: candidate.project.id,
          roleCatalogId: candidate.roleNeeded?.roleCatalog?.id || "",
          sendType,
          documentIds: sendType === "individual" ? selectedDocs.map(d => d.id) : undefined,
        };
      });

      const payload: BulkForwardToClientRequest = {
        recipientEmail,
        cc,
        bcc,
        projectId: visibleCandidates[0]?.project.id,
        notes: notes || `Attached are the verified documents for ${visibleCandidates.length} candidates.`,
        deliveryMethod,
        selections,
        csvUrl,
        csvName
      }; 

      console.log("Bulk Forwarding Payload to Server:", payload);
      
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
              {totalSelectedSizeInfo.bytes > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "font-bold px-3 py-1",
                    totalSelectedSizeInfo.mb > 20 && deliveryMethod === "email_combined"
                      ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  )}
                >
                  <FileText className="h-3 w-3 mr-1.5" />
                  {totalSelectedSizeInfo.mb.toFixed(2)} MB Total
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-3 bg-slate-50/50 dark:bg-gray-950/50">
          <div className="max-w-5xl mx-auto space-y-2 mb-3">
            {/* Delivery Method Selection - Compact */}
            <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Send className="h-3 w-3 text-blue-600" />
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">Send</h3>
                </div>
                <Tabs value={deliveryMethod} onValueChange={(v: any) => setDeliveryMethod(v)} className="flex-1">
                  <TabsList className="grid grid-cols-3 w-full h-7 bg-slate-100 dark:bg-slate-800 p-0.5">
                    <TabsTrigger value="email_individual" className="text-[8px] h-6 px-1">Separate</TabsTrigger>
                    <TabsTrigger value="email_combined" className="text-[8px] h-6 px-1">Combined</TabsTrigger>
                    <TabsTrigger value="google_drive" className="text-[8px] h-6 px-1">GDrive</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {visibleCandidates.length >= 10 && deliveryMethod === 'email_individual' && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 p-1.5 rounded">
                  <AlertCircle className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[9px] text-amber-700 font-semibold">Combined or GDrive recommended</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Client Information Section */}
              <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <User className="h-3 w-3 text-blue-600" />
                  <h3 className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Recipient & CC/BCC</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex gap-1 items-center">
                    <div className="relative flex-1">
                      <Input
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        disabled={!isEditingEmail && !!commonClient}
                        className={cn(
                          "pl-6 h-7 text-[10px] border-slate-200 focus:ring-blue-500/20",
                          !isEditingEmail && !!commonClient ? "bg-slate-50 dark:bg-slate-800/50 text-slate-600" : "bg-white dark:bg-gray-900"
                        )}
                        placeholder="Recipient Email"
                      />
                      <Mail className="absolute left-2 top-2 h-2.5 w-2.5 text-slate-400" />
                    </div>
                    {commonClient && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingEmail(!isEditingEmail)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {!showCCBCC ? (
                    <button
                      type="button"
                      onClick={() => setShowCCBCC(true)}
                      className="text-[9px] text-blue-600 font-bold hover:underline py-0.5 w-fit"
                    >
                      + Add CC/BCC
                    </button>
                  ) : (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <MultiEmailInput
                        emails={cc}
                        onChange={setCc}
                        placeholder="Add CC email..."
                        icon={<Users className="h-2.5 w-2.5" />}
                        className="space-y-1"
                      />
                      <MultiEmailInput
                        emails={bcc}
                        onChange={setBcc}
                        placeholder="Add BCC email..."
                        icon={<ShieldAlert className="h-2.5 w-2.5" />}
                        className="space-y-1"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCCBCC(false)}
                        className="text-[9px] text-slate-400 font-medium hover:text-red-500 hover:underline"
                      >
                        Hide
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Message Section */}
              <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquare className="h-3 w-3 text-blue-600" />
                  <h3 className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Message (Optional)</h3>
                </div>
                <Textarea 
                  placeholder={`Message about these ${candidates.length} candidates...`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[48px] text-xs border-slate-200 dark:border-slate-800 focus:ring-blue-500/20 resize-none p-2"
                />
              </div>

              {/* CSV Upload Section */}
              <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-3 w-3 text-blue-600" />
                    <h3 className="font-bold text-[11px] text-slate-800 dark:text-slate-200">CSV Attachment</h3>
                  </div>
                  {csvFile && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-100 font-bold">
                      CSV Document - {csvFile.size < 1024 * 1024 
                        ? `${(csvFile.size / 1024).toFixed(0)} KB` 
                        : `${(csvFile.size / (1024 * 1024)).toFixed(2)} MB`}
                    </Badge>
                  )}
                </div>

                {csvFile ? (
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="h-3 w-3 text-blue-600 shrink-0" />
                      <p className="text-[10px] font-semibold text-slate-900 dark:text-slate-100 truncate">{csvFile.name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCsvFile(null)}
                      className="h-5 w-5 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative group flex-1 min-h-[48px]">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
                            toast.error("Please upload only CSV files");
                            return;
                          }
                          setCsvFile(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="h-full border border-dashed border-slate-200 dark:border-slate-800 rounded flex flex-col items-center justify-center p-2 group-hover:border-blue-400 group-hover:bg-blue-50/30 transition-all">
                      <Paperclip className="h-3 w-3 text-slate-400 group-hover:text-blue-600 mb-0.5" />
                      <p className="text-[9px] font-medium text-slate-500 group-hover:text-blue-700">Attach CSV</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-4 px-6">
            {currentCandidates.map((candidate) => {
              const roleLabel =
                candidate.roleNeeded?.roleCatalog?.label || "Role Not Specified";
              const candidateName = `${candidate.candidate.firstName} ${candidate.candidate.lastName}`;
              const candidateKey = candidate.id || candidate.candidateProjectMapId || "";
              const candidateSelectedDocs = selectedDocsByCandidate[candidateKey] || [];
              const selectedDocsCount = candidateSelectedDocs.length;
              const hasMerged = candidateSelectedDocs.some(d => d.id === "merged");
              const candidateDocsSizeMB = candidateSelectedDocs.reduce((acc, d) => acc + (d.size || 0), 0) / (1024 * 1024);

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

                <div className="absolute top-0 right-8 z-10 flex flex-col items-end">
                  {selectedDocsCount > 0 ? (
                    <>
                      <div className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                        <CheckCircle2 className="h-3 w-3" />
                        {hasMerged ? "Merged" : `${selectedDocsCount} Docs`}
                      </div>
                      <div className="bg-white/90 dark:bg-gray-800/90 text-emerald-700 dark:text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded-bl flex items-center gap-1 shadow-sm border-l border-b border-emerald-100 dark:border-emerald-900/30">
                        {candidateDocsSizeMB.toFixed(2)} MB
                      </div>
                    </>
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
                        {/* Documents Attachments Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-1">
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
                              {selectedDocsCount > 0 && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-white border-emerald-100 text-emerald-700 font-bold whitespace-nowrap">
                                  {candidateDocsSizeMB.toFixed(2)} MB
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white">
                            {selectedDocsCount > 0 
                              ? `${selectedDocsCount} document(s) (${candidateDocsSizeMB.toFixed(2)} MB) selected for attachment`
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
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Reviewing {visibleCandidates.length} candidates
                </p>
                {Object.keys(selectedDocsByCandidate).length < visibleCandidates.length ? (
                  <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {visibleCandidates.length - Object.keys(selectedDocsByCandidate).length} pending document selection
                  </p>
                ) : totalSelectedSizeInfo.mb > 20 && deliveryMethod === "email_combined" ? (
                  <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Total size {totalSelectedSizeInfo.mb.toFixed(2)}MB exceeds 20MB limit. Remove some candidates.
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    All documents selected ({totalSelectedSizeInfo.mb.toFixed(2)}MB)
                  </p>
                )}
              </div>

              {/* Delivery Method Description */}
              <div className="flex flex-col text-xs text-slate-600 dark:text-slate-400 border-l pl-6">
                <span className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Delivery Method:</span>
                <p className="italic">
                  {deliveryMethod === 'email_individual' && "Recipient will get a separate email for EACH candidate."}
                  {deliveryMethod === 'email_combined' && "Recipient will get ONE email with all documents as attachments."}
                  {deliveryMethod === 'google_drive' && "Recipient will get ONE email with a Google Drive folder link."}
                </p>
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
  </>
  );
}
