import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mail, 
  User, 
  Phone, 
  Edit2, 
  Send, 
  FileText, 
  CheckCircle2, 
  FileCheck,
  AlertCircle,
  RefreshCw,
  Search,
  MessageSquare,
  Clock,
  History,
  Eye,
  Paperclip,
  Trash2,
  X,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { 
  useGetMergedDocumentQuery, 
  useForwardToClientMutation, 
  useGetLatestForwardingQuery 
} from "../api";
import { useUploadDocumentMutation } from "@/features/candidates/api";
import { PDFViewer } from "@/components/molecules";
import { formatDistanceToNow, format } from "date-fns";
import { ClientForwardHistoryModal } from "./ClientForwardHistoryModal";
import { MergeVerifiedModal } from "./MergeVerifiedModal";
import { SelectedDoc } from "./BulkViewDocumentsModal";
import { Badge } from "@/components/ui";

interface SendToClientModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  projectId: string;
  roleCatalogId?: string;
  clientData?: any;
  documents: any[];
  candidateName: string;
}

export function SendToClientModal({
  isOpen,
  onOpenChange,
  candidateId,
  projectId,
  roleCatalogId,
  clientData,
  documents,
  candidateName,
}: SendToClientModalProps) {
  const [email, setEmail] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<SelectedDoc[]>([]);
  const [notes, setNotes] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // PDF viewer state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string>("");
  const [pdfViewerName, setPdfViewerName] = useState<string>("");

  // Merge modal state
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  const [forwardToClient, { isLoading: isForwarding }] = useForwardToClientMutation();
  const [uploadDocument, { isLoading: isUploadingCsv }] = useUploadDocumentMutation();

  // Check for existing merged document
  const { data: mergedDocResponse, isLoading: isCheckingMerged, refetch: refetchMerged } = useGetMergedDocumentQuery(
    { candidateId, projectId, roleCatalogId: roleCatalogId || undefined },
    { skip: !isOpen || !candidateId || !projectId, refetchOnMountOrArgChange: true }
  );

  useEffect(() => {
    if (isOpen) {
      refetchMerged();
    }
  }, [isOpen, refetchMerged, roleCatalogId]);

  const mergedDoc = mergedDocResponse?.data;

  // Total size of selected documents in MB
  const totalSelectedSizeInfo = useMemo(() => {
    let totalBytes = 0;
    selectedDocs.forEach(doc => {
      totalBytes += (doc.size || 0);
    });
    // Add CSV size if present
    if (csvFile) {
      totalBytes += csvFile.size;
    }
    const mb = totalBytes / (1024 * 1024);
    return { bytes: totalBytes, mb };
  }, [selectedDocs, csvFile]);

  // New: Check for latest forwarding record
  const { data: latestForwardingResponse } = useGetLatestForwardingQuery(
    { candidateId, projectId, roleCatalogId },
    { skip: !isOpen || !candidateId || !projectId }
  );

  const latestForwarding = latestForwardingResponse?.data;

  // Helper to safely format dates
  const safeFormatDistanceToNow = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const safeFormatDate = (dateStr?: string, formatStr: string = "MMM d, h:mm a") => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return format(date, formatStr);
  };

  // Initialize email from client data
  useEffect(() => {
    if (isOpen) {
      if (clientData?.email) {
        setEmail(clientData.email);
        setIsEditingEmail(false);
      } else if (!clientData?.email) {
        setIsEditingEmail(true);
      }
    } else {
      // Reset state when modal closes
      setEmail("");
      setIsEditingEmail(false);
      setSelectedDocs([]);
      setNotes("");
      setCsvFile(null);
    }
  }, [isOpen, clientData]);

  // Handle document selection with exclusivity
  const toggleDoc = (docId: string) => {
    setSelectedDocs((prev) => {
      // If selecting merged, clear individual docs
      if (docId === "merged") {
        const isCurrentlySelected = prev.some(d => d.id === "merged");
        if (isCurrentlySelected) {
          return [];
        } else if (mergedDoc) {
          return [
            {
              id: "merged",
              name: mergedDoc.fileName || "merged_documents.pdf",
              size: mergedDoc.fileSize || 0,
            },
          ];
        }
        return prev;
      }
      
      // If selecting individual doc, ensure merged is NOT selected
      const isCurrentlySelected = prev.some(d => d.id === docId);
      const withoutMerged = prev.filter(d => d.id !== "merged");
      
      if (isCurrentlySelected) {
        return withoutMerged.filter(d => d.id !== docId);
      } else {
        const doc = documents.find(d => d.id === docId);
        if (!doc) return withoutMerged;
        return [
          ...withoutMerged,
          {
            id: doc.id,
            name: doc.fileName,
            size: doc.fileSize || 0,
          },
        ];
      }
    });
  };

  const hasIndividualSelected = selectedDocs.some(d => d.id !== "merged");
  const hasMergedSelected = selectedDocs.some(d => d.id === "merged");

  const handleSend = async () => {
    if (!email) {
      toast.error("Recipient email is required");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (selectedDocs.length === 0) {
      toast.error("Please select at least one document to send");
      return;
    }

    // Gmail/Outlook limit check
    if (totalSelectedSizeInfo.mb > 20) {
      toast.error(`Total document size (${totalSelectedSizeInfo.mb.toFixed(2)}MB) exceeds the 20MB limit. Please remove some documents.`);
      return;
    }

    try {
      let csvUrl = undefined;
      let csvName = undefined;

      // Handle CSV upload if present
      if (csvFile) {
        toast.info(`Uploading ${csvFile.name}...`);
        const formData = new FormData();
        formData.append("file", csvFile);
        formData.append("docType", "csv_attachment");
        
        const uploadResult = await uploadDocument({ 
          candidateId, 
          formData 
        }).unwrap();

        if (uploadResult.success) {
          csvUrl = uploadResult.data.fileUrl;
          csvName = csvFile.name;
          console.log("Single CSV Upload Success:", { csvUrl, csvName });
        }
      }

      const sendType: "merged" | "individual" = selectedDocs.some(d => d.id === "merged") ? "merged" : "individual";
      const documentIds = sendType === "individual" ? selectedDocs.map(d => d.id) : undefined;

      const payload = {
        recipientEmail: email,
        candidateId,
        projectId,
        roleCatalogId,
        sendType,
        documentIds,
        notes: notes || `Attached are the verified documents for ${candidateName}`,
        csvUrl,
        csvName
      };

      console.log("Forward to Client Payload:", payload);

      await forwardToClient(payload).unwrap();

      toast.success("Mail sent successfully and queued. Please wait for 3 minutes.");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to forward documents to client");
    }
  };

  const abbreviateFileName = (name?: string, segmentsToKeep = 3) => {
    if (!name) return "unnamed_file";
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot) : '';
    const base = dot >= 0 ? name.slice(0, dot) : name;
    
    // If it's a long ID-based filename (often uses underscores or just long strings)
    if (base.length > 30) {
      return `${base.slice(0, 25)}.....${ext}`;
    }

    const parts = base.split('-');
    if (parts.length <= segmentsToKeep) return name;
    const prefix = parts.slice(0, segmentsToKeep).join('-');
    return `${prefix}-.....${ext}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-slate-50">
        {/* Header */}
        <DialogHeader className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white relative">
          <div className="absolute right-12 top-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="text-emerald-50 hover:bg-white/10 hover:text-white flex items-center gap-2 border border-white/20 rounded-lg px-3"
            >
              <History className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-tight">History</span>
            </Button>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span>Send Documents to Client</span>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-emerald-100/80 font-normal">Candidate: {candidateName}</p>
                {totalSelectedSizeInfo.bytes > 0 && (
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] h-4.5 px-1.5 border-white/20 text-white font-bold ${
                      totalSelectedSizeInfo.mb > 20 ? "bg-red-500/20 text-red-100 border-red-400/30 animate-pulse" : "bg-white/10"
                    }`}
                  >
                    {totalSelectedSizeInfo.mb.toFixed(2)} MB
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
          <p className="text-emerald-100 text-sm mt-1">
            Send {candidateName}'s verified documentation to the client for review.
          </p>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Previous Forwarding History (if any) */}
          {latestForwarding && (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="p-2.5 bg-blue-100 rounded-lg shrink-0">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-bold text-blue-900 text-sm">Last Sent to Client</h4>
                  <span className="text-[10px] bg-blue-200/50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">
                    {latestForwarding.status}
                  </span>
                </div>
                <p className="text-xs text-blue-800 leading-normal">
                  <span className="font-semibold text-blue-900">{latestForwarding.sender.name}</span> forwarded {latestForwarding.sendType === "merged" ? "the unified PDF" : `${latestForwarding.documentDetails.length} documents`} to <span className="font-semibold">{latestForwarding.recipientEmail}</span>
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-[10px] text-blue-600 font-medium italic">
                    {safeFormatDistanceToNow(latestForwarding.createdAt)}
                    {latestForwarding.sentAt && safeFormatDate(latestForwarding.sentAt) && (
                      ` (${safeFormatDate(latestForwarding.sentAt)})`
                    )}
                  </p>
                  {latestForwarding.notes && (
                    <div className="flex items-center gap-1 group relative">
                      <div className="w-1 h-1 bg-blue-300 rounded-full" />
                      <p className="text-[10px] text-blue-600 font-medium truncate max-w-[150px]">
                        Note: {latestForwarding.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client Information Section */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">Client Details</h3>
              </div>
              
              {clientData ? (
                <div className="flex flex-col gap-4 text-sm flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Client Name</p>
                      <p className="text-slate-900 font-semibold truncate">{clientData.name || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Contact</p>
                      <p className="text-slate-900 font-semibold truncate">{clientData.phone || "N/A"}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-auto">
                    <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Recipient Email</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={!isEditingEmail}
                          className={`pl-8 h-9 text-xs border-slate-200 focus:ring-emerald-500/20 ${!isEditingEmail ? 'bg-slate-50 text-slate-600' : 'bg-white'}`}
                          placeholder="client@email.com"
                        />
                        <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingEmail(!isEditingEmail)}
                        className="h-9 px-2 border-slate-200 text-slate-600"
                      >
                        {isEditingEmail ? "Save" : <Edit2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3 flex-1">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium">No client linked</p>
                    <p className="text-xs text-amber-700">Enter email below</p>
                    <div className="mt-3 relative">
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-8 h-9 text-xs border-slate-200 focus:ring-emerald-500/20"
                        placeholder="client@email.com"
                      />
                      <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Message Section */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 flex flex-col h-full">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">Message (Optional)</h3>
              </div>
              <Textarea 
                placeholder={`Add a message for the client...`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-1 min-h-[100px] border-slate-200 focus:ring-emerald-500/20 resize-none ring-offset-transparent text-sm"
              />
            </div>

            {/* New CSV Upload Section */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-semibold text-slate-800">CSV Attachment</h3>
                </div>
                {csvFile && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px]">
                    {csvFile.size < 1024 * 1024 
                      ? `${(csvFile.size / 1024).toFixed(0)} KB` 
                      : `${(csvFile.size / (1024 * 1024)).toFixed(2)} MB`}
                  </Badge>
                )}
              </div>

              <div className="flex-1 flex flex-col justify-center">
                {csvFile ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{csvFile.name}</p>
                        <p className="text-[10px] text-slate-500">Ready to attach</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCsvFile(null)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative h-full">
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
                      id="csv-upload"
                    />
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 h-full flex flex-col items-center justify-center text-center hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                      <div className="inline-flex p-2 bg-slate-100 rounded-full mb-2">
                        <Paperclip className="h-4 w-4 text-slate-500" />
                      </div>
                      <p className="text-xs font-medium text-slate-700">Attach CSV</p>
                      <p className="text-[10px] text-slate-500 mt-1">Summary data</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">Attachments</h3>
              </div>
              <p className="text-xs text-slate-500">{selectedDocs.length} selected</p>
            </div>

            {/* Merged Document (if exists) */}
            {mergedDoc ? (
              <div className={`p-4 rounded-xl flex items-center justify-between group transition-colors border ${
                hasIndividualSelected 
                  ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" 
                  : "bg-emerald-50/50 border-emerald-100 hover:border-emerald-200"
              }`}>
                <div className="flex items-center gap-3 text-left">
                  <Checkbox 
                    id="merged-doc" 
                    checked={selectedDocs.some(d => d.id === "merged")}
                    onCheckedChange={() => toggleDoc("merged")}
                    disabled={hasIndividualSelected}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <div>
                    <Label 
                      htmlFor="merged-doc" 
                      className={`font-bold flex items-center gap-2 ${
                        hasIndividualSelected ? "text-slate-400 cursor-not-allowed" : "text-emerald-900 cursor-pointer"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      Unified PDF (All Documents Merged)
                    </Label>
                    <p className={`text-xs mt-0.5 ${hasIndividualSelected ? "text-slate-400" : "text-emerald-700"}`}>
                      {mergedDoc.fileName ? abbreviateFileName(mergedDoc.fileName) : "merged_documents.pdf"} 
                      <span className="mx-2">•</span>
                      {mergedDoc.fileSize > 0 && (
                        <>
                          {(mergedDoc.fileSize / (1024 * 1024)).toFixed(2)} MB
                          <span className="mx-2">•</span>
                        </>
                      )}
                      {mergedDoc.updatedAt ? `Generated ${safeFormatDistanceToNow(mergedDoc.updatedAt)}` : 'Ready to send'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Already generated — you can re-generate to include any recent updates.</p>
                  </div>
                </div>

                {/* View merged PDF + Re-generate */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="View merged PDF"
                    aria-label="View merged PDF"
                    onClick={() => {
                      const url = mergedDoc.fileUrl || "";
                      const cacheBuster = mergedDoc.updatedAt ? (url.includes('?') ? '&' : '?') + `t=${new Date(mergedDoc.updatedAt).getTime()}` : "";
                      setPdfViewerUrl(url + cacheBuster);
                      setPdfViewerName(mergedDoc.fileName || `Merged - ${candidateName}`);
                      setPdfViewerOpen(true);
                    }}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMergeModalOpen(true)}
                    className="h-8 px-3 text-xs"
                  >
                    Re-generate
                  </Button>

                  {!hasIndividualSelected && (
                    <div className="bg-emerald-100 px-2 py-1 rounded text-[10px] font-bold text-emerald-700 uppercase">Recommended</div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-xl flex items-center justify-between border bg-slate-50`}> 
                <div>
                  <Label className="font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Unified PDF (All Documents Merged)
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">No unified PDF yet — please generate to attach a single merged file for the client.</p>
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMergeModalOpen(true)}
                    className="h-8 px-3 text-xs"
                    disabled={!roleCatalogId}
                    title={roleCatalogId ? "Generate unified PDF" : "Select role to enable generation"}
                  >
                    Generate
                  </Button>
                </div>
              </div>
            )},

            {/* Individual Documents */}
            <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${hasMergedSelected ? "opacity-60" : ""}`}>
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${hasMergedSelected ? "text-slate-400" : "text-slate-500"}`}>
                  Individual Verified Files
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={hasMergedSelected}
                  className="h-6 text-[10px] uppercase font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:text-slate-400"
                  onClick={() => {
                    if (hasMergedSelected) return;
                    
                    const individualSelectedCount = selectedDocs.filter(d => d.id !== "merged").length;
                    
                    if (individualSelectedCount === documents.length) {
                      setSelectedDocs([]);
                    } else {
                      setSelectedDocs(documents.map(doc => ({
                        id: doc.id,
                        name: doc.fileName,
                        size: doc.fileSize || 0
                      })));
                    }
                  }}
                >
                  {selectedDocs.filter(d => d.id !== "merged").length === documents.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {documents.map((doc) => (
                  <div key={doc.id} className={`p-3 flex items-center gap-3 transition-colors ${hasMergedSelected ? "cursor-not-allowed" : "hover:bg-slate-50"}`}>
                    <Checkbox 
                      id={`doc-${doc.id}`} 
                      checked={selectedDocs.some(d => d.id === doc.id)}
                      onCheckedChange={() => toggleDoc(doc.id)}
                      disabled={hasMergedSelected}
                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={`doc-${doc.id}`} 
                        className={`text-sm font-semibold block truncate ${
                          hasMergedSelected ? "text-slate-400 cursor-not-allowed" : "text-slate-700 cursor-pointer"
                        }`}
                      >
                        {abbreviateFileName(doc.fileName)}
                      </Label>
                      <div className="flex items-center gap-2">
                        <p className={`text-[10px] capitalize ${hasMergedSelected ? "text-slate-300" : "text-slate-500"}`}>
                          {doc.docType.replace(/_/g, ' ')}
                        </p>
                        <span className={`text-[10px] ${hasMergedSelected ? "text-slate-300" : "text-slate-400"}`}>•</span>
                        <p className={`text-[10px] ${hasMergedSelected ? "text-slate-300" : "text-emerald-600 font-medium"}`}>
                          {((doc.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View document"
                        aria-label={`View ${doc.fileName}`}
                        onClick={() => {
                          setPdfViewerUrl(doc.fileUrl || "");
                          setPdfViewerName(doc.fileName || doc.docType);
                          setPdfViewerOpen(true);
                        }}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    {selectedDocs.some(d => d.id === doc.id) && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-white border-t border-slate-200 gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-6 rounded-xl border-slate-200 text-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isForwarding || selectedDocs.length === 0}
            className="px-8 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2"
          >
            {isForwarding ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send to Client
          </Button>
        </DialogFooter>
      </DialogContent>

      <PDFViewer
        fileUrl={pdfViewerUrl}
        fileName={pdfViewerName}
        isOpen={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        showDownload={true}
        showZoomControls={true}
        showRotationControls={true}
        showFullscreenToggle={true}
      />

      <MergeVerifiedModal
        isOpen={isMergeModalOpen}
        onOpenChange={setIsMergeModalOpen}
        candidateId={candidateId}
        projectId={projectId}
        roleCatalogId={roleCatalogId || ""}
        onViewDocument={(url: string, name: string) => {
          setPdfViewerUrl(url);
          setPdfViewerName(name);
          setPdfViewerOpen(true);
        }}
        onMergeEnd={() => {
          refetchMerged?.();
        }}
      />

      <ClientForwardHistoryModal
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        candidateId={candidateId}
        projectId={projectId}
        roleCatalogId={roleCatalogId}
        candidateName={candidateName}
      />
    </Dialog>
  );
}
