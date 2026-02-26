import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  User,
  Phone,
  FileText,
  CheckCircle2,
  FileCheck,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PDFViewer } from "@/components/molecules";
import { useGetCandidateProjectVerificationsQuery, useGetMergedDocumentQuery } from "../api";
import { MergeVerifiedModal } from "./MergeVerifiedModal";
import { formatDistanceToNow } from "date-fns";

export interface SelectedDoc {
  id: string;
  name: string;
  size: number;
}

interface BulkViewDocumentsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  projectId: string;
  roleCatalogId: string;
  candidateName: string;
  candidateData: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    profileImage?: string;
  };
  projectTitle: string;
  roleLabel: string;
  selectedDocs?: SelectedDoc[];
  onSelectedDocsChange?: (docs: SelectedDoc[]) => void;
}

export function BulkViewDocumentsModal({
  isOpen,
  onOpenChange,
  candidateId,
  projectId,
  roleCatalogId,
  candidateName,
  candidateData,
  projectTitle,
  roleLabel,
  selectedDocs = [],
  onSelectedDocsChange,
}: BulkViewDocumentsModalProps) {
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string>("");
  const [selectedPdfName, setSelectedPdfName] = useState<string>("");
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const docsPerPage = 5;

  // Fetch verified documents with limit
  const { data: verificationsResponse, isLoading: isLoadingVerifications } =
    useGetCandidateProjectVerificationsQuery(
      { candidateId, projectId, roleCatalogId, limit: 10 },
      { skip: !isOpen || !candidateId || !projectId }
    );

  // Call merged document API
  const { data: mergedDocResponse, isLoading: isCheckingMerged, refetch: refetchMerged } = useGetMergedDocumentQuery(
    { candidateId, projectId, roleCatalogId },
    { skip: !isOpen || !candidateId || !projectId, refetchOnMountOrArgChange: true }
  );

  useEffect(() => {
    if (isOpen) {
      refetchMerged();
    }
  }, [isOpen, refetchMerged, roleCatalogId]);

  // Handle different response structures
  let verifiedDocuments: any[] = [];

  if (verificationsResponse) {
    // Extract verifications array from nested response structure
    if (verificationsResponse.data?.verifications && Array.isArray(verificationsResponse.data.verifications)) {
      // Map verifications to documents format
      verifiedDocuments = verificationsResponse.data.verifications.map((verification: any) => ({
        id: verification.documentId || verification.id,
        fileName: verification.document?.fileName || "",
        fileSize: verification.document?.fileSize || 0,
        fileUrl: verification.document?.fileUrl || "",
        docType: verification.document?.docType || "document",
        status: verification.status,
        verifiedAt: verification.updatedAt,
      }));
    } else if (Array.isArray(verificationsResponse.data)) {
      // Fallback: if data is directly an array
      verifiedDocuments = verificationsResponse.data;
    } else if (Array.isArray(verificationsResponse)) {
      // Fallback: if response is directly an array
      verifiedDocuments = verificationsResponse;
    }
  }

  const mergedDoc = mergedDocResponse?.data;

  // Pagination calculations for individual documents
  const totalDocPages = Math.ceil(verifiedDocuments.length / docsPerPage);
  const docStartIndex = (currentPage - 1) * docsPerPage;
  const docEndIndex = docStartIndex + docsPerPage;
  const paginatedDocs = verifiedDocuments.slice(docStartIndex, docEndIndex);

  const handleNextPage = () => {
    if (currentPage < totalDocPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Handle document selection with exclusivity
  const toggleDoc = (docId: string) => {
    if (!onSelectedDocsChange) return;

    let newSelected: SelectedDoc[] = [];
    // If selecting merged, clear individual docs
    if (docId === "merged") {
      const isCurrentlySelected = selectedDocs.some((d) => d.id === "merged");
      if (isCurrentlySelected) {
        newSelected = [];
      } else if (mergedDoc) {
        newSelected = [
          {
            id: "merged",
            name: mergedDoc.fileName || "merged_documents.pdf",
            size: mergedDoc.fileSize || 0,
          },
        ];
      }
    } else {
      // If selecting individual doc, ensure merged is NOT selected
      const doc = verifiedDocuments.find((d) => d.id === docId);
      if (!doc) return;

      const withoutMerged = selectedDocs.filter((d) => d.id !== "merged");
      const isCurrentlySelected = withoutMerged.some((d) => d.id === docId);

      if (isCurrentlySelected) {
        newSelected = withoutMerged.filter((d) => d.id !== docId);
      } else {
        newSelected = [
          ...withoutMerged,
          {
            id: doc.id,
            name: doc.fileName,
            size: doc.fileSize,
          },
        ];
      }
    }
    onSelectedDocsChange(newSelected);
  };

  const hasIndividualSelected = selectedDocs.some((d) => d.id !== "merged");
  const hasMergedSelected = selectedDocs.some((d) => d.id === "merged");

  const abbreviateFileName = (name?: string, segmentsToKeep = 3) => {
    if (!name) return "unnamed_file";
    const dot = name.lastIndexOf(".");
    const ext = dot >= 0 ? name.slice(dot) : "";
    const base = dot >= 0 ? name.slice(0, dot) : name;

    if (base.length > 30) {
      return `${base.slice(0, 25)}.....${ext}`;
    }

    const parts = base.split("-");
    if (parts.length <= segmentsToKeep) return name;
    const prefix = parts.slice(0, segmentsToKeep).join("-");
    return `${prefix}-.....${ext}`;
  };

  const handleViewDocument = () => {
    if (selectedDocs.length === 0) {
      toast.error("Please select at least one document to view");
      return;
    }

    onOpenChange(false);
    toast.success(`${selectedDocs.length === 1 && selectedDocs.includes('merged') ? 'Unified PDF' : selectedDocs.length + ' document(s)'} attached for ${candidateName}`);
  };

  const handleDownloadDocument = (url: string, fileName: string) => {
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${abbreviateFileName(fileName)}`);
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-slate-50">
          {/* Header */}
          <DialogHeader className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileText className="h-5 w-5 text-white" />
              </div>
              Review Documents
            </DialogTitle>
            <p className="text-blue-100 text-sm mt-1">
              View and select documents for {candidateName}
            </p>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Candidate Information */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-slate-800">Candidate Details</h3>
              </div>

              <div className="space-y-3">
                {/* Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                      Full Name
                    </p>
                    <p className="text-slate-900 font-semibold">{candidateName}</p>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                      Email
                    </p>
                    <a
                      href={`mailto:${candidateData.email}`}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      {candidateData.email}
                    </a>
                  </div>

                  {/* Phone */}
                  {candidateData.mobileNumber && (
                    <div className="space-y-1">
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                        Phone
                      </p>
                      <a
                        href={`tel:${candidateData.mobileNumber}`}
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        {candidateData.mobileNumber}
                      </a>
                    </div>
                  )}

                  {/* Project */}
                  <div className="space-y-1">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                      Project
                    </p>
                    <p className="text-slate-900 font-semibold">{projectTitle}</p>
                  </div>

                  {/* Role */}
                  <div className="space-y-1">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                      Position
                    </p>
                    <p className="text-slate-900 font-semibold">{roleLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {(isLoadingVerifications || isCheckingMerged) && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mr-2" />
                <span className="text-slate-600">Loading documents...</span>
              </div>
            )}

            {/* Document Selection Section */}
            {!isLoadingVerifications && !isCheckingMerged && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-blue-600" />
                    <h3 className="font-semibold text-slate-800">Documents</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedDocs.length} selected
                  </p>
                </div>

                {/* Merged Document (if exists) */}
                {mergedDoc ? (
                  <div className={`p-4 rounded-xl flex items-center justify-between group transition-colors border ${
                    hasIndividualSelected
                      ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed"
                      : "bg-emerald-50/50 border-emerald-100 hover:border-emerald-200"
                  }`}>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="merged-doc"
                        checked={selectedDocs.some((d) => d.id === "merged")}
                        onCheckedChange={() => toggleDoc("merged")}
                        disabled={hasIndividualSelected}
                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <div>
                        <Label
                          htmlFor="merged-doc"
                          className={`font-bold flex items-center gap-2 ${
                            hasIndividualSelected
                              ? "text-slate-400 cursor-not-allowed"
                              : "text-emerald-900 cursor-pointer"
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                          Unified PDF (All Documents Merged)
                        </Label>
                        <p className={`text-xs mt-0.5 ${hasIndividualSelected ? "text-slate-400" : "text-emerald-700"}`}>
                          {mergedDoc.fileName ? abbreviateFileName(mergedDoc.fileName) : "merged_documents.pdf"}
                          <span className="mx-2">•</span>
                          {mergedDoc.fileSize ? `${(mergedDoc.fileSize / (1024 * 1024)).toFixed(2)} MB` : ""}
                          {mergedDoc.updatedAt ? ` • Generated ${formatDistanceToNow(new Date(mergedDoc.updatedAt))} ago` : ' • Ready'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">Already generated — you can re-generate to include any recent updates.</p>
                      </div>
                    </div>

                    {/* View merged PDF + Re-generate */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          const url = mergedDoc.fileUrl;
                          const cacheBuster = mergedDoc.updatedAt ? (url.includes('?') ? '&' : '?') + `t=${new Date(mergedDoc.updatedAt).getTime()}` : "";
                          setSelectedPdfUrl(url + cacheBuster);
                          setSelectedPdfName(mergedDoc.fileName || "merged.pdf");
                          setPdfViewerOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
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
                )}

                {/* Individual Documents */}
                <div
                  className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${
                    hasMergedSelected ? "opacity-60" : ""
                  }`}
                >
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        hasMergedSelected ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Individual Verified Files
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={hasMergedSelected}
                      className="h-6 text-[10px] uppercase font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:text-slate-400"
                      onClick={() => {
                        if (hasMergedSelected || !onSelectedDocsChange) return;
                        
                        const individualDocs = selectedDocs.filter((d) => d.id !== "merged");
                        
                        if (individualDocs.length === verifiedDocuments.length) {
                          onSelectedDocsChange([]);
                        } else {
                          const allSelected = verifiedDocuments.map((doc) => ({
                            id: doc.id,
                            name: doc.fileName,
                            size: doc.fileSize || 0,
                          }));
                          onSelectedDocsChange(allSelected);
                        }
                      }}
                    >
                      {selectedDocs.filter((d) => d.id !== "merged").length ===
                      verifiedDocuments.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {verifiedDocuments.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">
                        <FileText className="h-10 w-10 opacity-20 mx-auto mb-2" />
                        <p className="text-sm">No verified documents</p>
                      </div>
                    ) : (
                      paginatedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                            hasMergedSelected
                              ? "cursor-not-allowed"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Checkbox
                              id={`doc-${doc.id}`}
                              checked={selectedDocs.some((d) => d.id === doc.id)}
                              onCheckedChange={() => toggleDoc(doc.id)}
                              disabled={hasMergedSelected}
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={`doc-${doc.id}`}
                                className={`text-sm font-semibold block truncate ${
                                  hasMergedSelected
                                    ? "text-slate-400 cursor-not-allowed"
                                    : "text-slate-700 cursor-pointer"
                                }`}
                              >
                                {abbreviateFileName(doc.fileName)}
                              </Label>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                  {doc.docType.toUpperCase()}
                                </span>
                                {doc.fileSize > 0 && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedPdfUrl(doc.fileUrl);
                                setSelectedPdfName(doc.fileName);
                                setPdfViewerOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                              onClick={() =>
                                handleDownloadDocument(doc.fileUrl, doc.fileName)
                              }
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                          {selectedDocs.includes(doc.id) && (
                            <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Pagination Controls for Documents */}
                  {verifiedDocuments.length > docsPerPage && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                      <div className="text-xs text-slate-500 font-medium">
                        Showing {docStartIndex + 1}-{Math.min(docEndIndex, verifiedDocuments.length)} of {verifiedDocuments.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          className="h-8 px-2 gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="text-[10px] font-bold">Prev</span>
                        </Button>
                        <div className="text-xs text-slate-600 font-medium px-2">
                          Page {currentPage} of {totalDocPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage === totalDocPages}
                          className="h-8 px-2 gap-1"
                        >
                          <span className="text-[10px] font-bold">Next</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-white border-t border-slate-200 gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6 rounded-xl border-slate-200 text-slate-600"
            >
              Close
            </Button>
            <Button
              onClick={handleViewDocument}
              disabled={selectedDocs.length === 0}
              className="px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
             Select Documents ({selectedDocs.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <MergeVerifiedModal
        isOpen={isMergeModalOpen}
        onOpenChange={setIsMergeModalOpen}
        candidateId={candidateId}
        projectId={projectId}
        roleCatalogId={roleCatalogId || ""}
        onViewDocument={(url: string, name: string) => {
          const cacheBuster = url.includes('?') ? '&' : '?';
          setSelectedPdfUrl(url + cacheBuster + `t=${Date.now()}`);
          setSelectedPdfName(name);
          setPdfViewerOpen(true);
        }}
        onMergeEnd={() => {
          refetchMerged?.();
        }}
      />
    </>
  );
}
