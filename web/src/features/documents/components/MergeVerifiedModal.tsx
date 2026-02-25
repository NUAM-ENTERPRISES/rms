import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, FileText, RefreshCw, CheckCircle, FileX, Download, Calendar, HardDrive, AlertCircle, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/app/hooks";
import { useGetMergedDocumentQuery, useGetCandidateProjectVerificationsQuery } from "../api";
import { PDFViewer } from "@/components/molecules";
import { formatDistanceToNow } from "date-fns";
import { Reorder } from "framer-motion";

interface MergeVerifiedModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  projectId: string;
  roleCatalogId: string;
  onViewDocument: (url: string, name: string) => void;
  onMergeStart?: () => void;
  onMergeEnd?: () => void;
}

export function MergeVerifiedModal({
  isOpen,
  onOpenChange,
  candidateId,
  projectId,
  roleCatalogId,
  onViewDocument,
  onMergeStart,
  onMergeEnd,
}: MergeVerifiedModalProps) {
  const [isMerging, setIsMerging] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string>("");
  const [selectedPdfName, setSelectedPdfName] = useState<string>("");
  const [orderedDocs, setOrderedDocs] = useState<any[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const token = useAppSelector((state) => state.auth.accessToken);

  // Fetch candidate project verifications with documents
  const { data: verificationsResponse, isLoading: isLoadingVerifications, error: verificationsError } = useGetCandidateProjectVerificationsQuery(
    { candidateId, projectId, roleCatalogId, status: 'verified' },
    { skip: !isOpen || !candidateId || !projectId || !roleCatalogId }
  );

  // Extract verified documents
  const { verifiedDocuments, activeRoleCatalogId, candidateProjectMapId } = useMemo(() => {
    if (!verificationsResponse?.data) {
      return { verifiedDocuments: [], activeRoleCatalogId: roleCatalogId, candidateProjectMapId: undefined };
    }

    const docs = verificationsResponse.data.verifications
      .filter(v => v.status === 'verified')
      .map(v => v.document);

    // Get the roleCatalogId from the first verification if available, 
    // fall back to the one from the candidateProject, then the prop
    const roleId = verificationsResponse.data.verifications?.[0]?.roleCatalogId || 
                   verificationsResponse.data.roleNeeded?.roleCatalogId || 
                   roleCatalogId;

    return { 
      verifiedDocuments: docs, 
      activeRoleCatalogId: roleId,
      candidateProjectMapId: verificationsResponse.data.candidateProject?.id
    };
  }, [verificationsResponse, roleCatalogId]);

  // Sync orderedDocs and selectedDocIds with verifiedDocuments when they are loaded or change
  useEffect(() => {
    if (verifiedDocuments.length > 0) {
      // Small check to see if we already have the documents (to avoid resetting order on re-renders)
      // but if the count changed, we definitely want to reset or update
      const currentIds = orderedDocs.map(d => d.id).sort().join(',');
      const newIds = verifiedDocuments.map(d => d.id).sort().join(',');
      
      if (currentIds !== newIds) {
        setOrderedDocs(verifiedDocuments);
        setSelectedDocIds(new Set(verifiedDocuments.map(d => d.id)));
      }
    } else {
      setOrderedDocs([]);
      setSelectedDocIds(new Set());
    }
  }, [verifiedDocuments]);

  // Check for existing merged document using Redux
  const { data: mergedDocResponse, isLoading: isCheckingMerged, refetch: refetchMerged } = useGetMergedDocumentQuery(
    { 
      candidateId, 
      projectId, 
      roleCatalogId: activeRoleCatalogId 
    },
    { skip: !isOpen || !candidateId || !projectId, refetchOnMountOrArgChange: true }
  );

  useEffect(() => {
    if (isOpen) {
      refetchMerged();
    }
  }, [isOpen, refetchMerged, activeRoleCatalogId]);

  const existingMergedDoc = mergedDocResponse?.data;

  // Download existing merged document
  const handleDownloadExisting = () => {
    if (!existingMergedDoc?.fileUrl) return;
    
    const url = existingMergedDoc.fileUrl;
    const cacheBuster = existingMergedDoc.updatedAt ? (url.includes('?') ? '&' : '?') + `t=${new Date(existingMergedDoc.updatedAt).getTime()}` : "";
    
    const link = document.createElement('a');
    link.href = url + cacheBuster;
    link.setAttribute('download', existingMergedDoc.fileName || 'Merged_Documents.pdf');
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    toast.success("Download started!");
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Abbreviate long file names
  const abbreviateFileName = (name?: string, segmentsToKeep = 3) => {
    if (!name) return "unnamed_file";
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot) : '';
    const base = dot >= 0 ? name.slice(0, dot) : name;

    // If it's a long ID-based filename
    if (base.length > 30) {
      return `${base.slice(0, 25)}.....${ext}`;
    }

    const parts = base.split('-');
    if (parts.length <= segmentsToKeep) return name;
    const prefix = parts.slice(0, segmentsToKeep).join('-');
    return `${prefix}-.....${ext}`;
  };

  const handleMergeAll = async () => {
    if (verifiedDocuments.length === 0) {
      toast.error("No verified documents found to merge");
      return;
    }

    setIsMerging(true);
    onMergeStart?.();
    const toastId = toast.loading("Processing document merger on server...");

    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      const params = new URLSearchParams({
        candidateId,
        projectId,
      });
      
      if (activeRoleCatalogId) {
        params.append("roleCatalogId", activeRoleCatalogId);
      }
      
      if (candidateProjectMapId) {
        params.append("candidateProjectMapId", candidateProjectMapId);
      }

      // Add ordered and selected document IDs for specific merging order and selection
      const selectionToMerge = orderedDocs
        .filter(doc => selectedDocIds.has(doc.id))
        .map(doc => doc.id);

      if (selectionToMerge.length > 0) {
        params.append("documentIds", selectionToMerge.join(','));
      } else {
        toast.error("Please select at least one document to merge");
        setIsMerging(false);
        onMergeEnd?.();
        return;
      }

      // Explicitly request only verified documents
      params.append("status", "verified");

      const url = `${baseUrl}/documents/merge-verified?${params.toString()}`;
      
      const headers: any = {
        'Accept': 'application/pdf',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Try to get filename from content-disposition
      const disposition = response.headers.get('content-disposition');
      let filename = 'Merged_Documents.pdf';
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Documents merged and downloaded successfully!", { id: toastId });
      
      // Refetch to update the existing merged doc status
      refetchMerged();
    } catch (error: any) {
      console.error("Merge failed:", error);
      toast.error(error.message || "Failed to merge documents", { id: toastId });
    } finally {
      setIsMerging(false);
      onMergeEnd?.();
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    const newSelected = new Set(selectedDocIds);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocIds(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedDocIds.size === orderedDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(orderedDocs.map(doc => doc.id)));
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl md:max-w-5xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-3">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="h-4 w-4 text-white" />
            </div>
            Generate Unified PDF
          </DialogTitle>
          <p className="text-blue-100 text-xs mt-0.5">
            {existingMergedDoc 
              ? "A merged document already exists. Download it or regenerate with latest documents."
              : `Review the ${verifiedDocuments.length} verified documents that will be combined into a single PDF.`
            }
          </p>
        </DialogHeader>

        <div className="px-6 py-4">
          {/* Loading State */}
          {(isLoadingVerifications || isCheckingMerged) && (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-500 mr-2" />
              <span className="text-slate-600 text-sm">
                {isLoadingVerifications ? "Loading verified documents..." : "Checking for existing merged document..."}
              </span>
            </div>
          )}

          {/* Error State */}
          {verificationsError && !isLoadingVerifications && (
            <div className="flex items-center justify-center py-6 px-4">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-slate-600 text-sm">Failed to load verified documents</p>
              </div>
            </div>
          )}

          {/* Existing Merged Document Card */}
          {!isLoadingVerifications && !isCheckingMerged && !verificationsError && existingMergedDoc && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-emerald-800 text-sm">Merged Document Available</h4>
                  <div className="flex flex-wrap gap-3 text-[11px] text-emerald-600 mt-0.5">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span title={existingMergedDoc.fileName} className="max-w-[300px] truncate">{abbreviateFileName(existingMergedDoc.fileName)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(existingMergedDoc.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleDownloadExisting}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-8"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </Button>
              </div>
            </div>
          )}

          {/* Documents Reorderable List */}
          {!isLoadingVerifications && !verificationsError && (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-700 text-sm">Source Documents</h4>
                  {verifiedDocuments.length > 0 && (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {verifiedDocuments.length} files
                    </span>
                  )}
                </div>
                {orderedDocs.length > 1 && (
                  <span className="text-[9px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-1">
                    <GripVertical className="h-2.5 w-2.5" />
                    Drag to reorder
                  </span>
                )}
              </div>
              
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50 max-h-[420px] overflow-y-auto custom-scrollbar">
                <div className="min-w-full">
                  {/* Header */}
                  <div className="bg-slate-100/80 sticky top-0 flex border-b border-slate-200 z-10 backdrop-blur-sm">
                    <div className="w-10 py-2 px-3 flex items-center justify-center">
                      <Checkbox 
                        checked={selectedDocIds.size === orderedDocs.length && orderedDocs.length > 0}
                        onCheckedChange={toggleAllSelection}
                        className="h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>
                    <div className="w-10 py-2 px-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider text-center">Pos</div>
                    <div className="flex-[2] py-2 px-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider">Document Type</div>
                    <div className="flex-[3] py-2 px-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider">File Name</div>
                    <div className="w-20 py-2 px-3 text-right font-semibold text-slate-700 text-[10px] uppercase tracking-wider">Preview</div>
                  </div>
                  
                  {orderedDocs.length === 0 ? (
                    <div className="text-center py-8 bg-white">
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <FileX className="h-8 w-8 opacity-20" />
                        <p className="text-xs">No verified documents available</p>
                      </div>
                    </div>
                  ) : (
                    <Reorder.Group 
                      axis="y" 
                      values={orderedDocs} 
                      onReorder={setOrderedDocs} 
                      className="divide-y divide-slate-100 bg-white"
                    >
                      {orderedDocs.map((doc, idx) => (
                        <Reorder.Item 
                          key={doc.id} 
                          value={doc}
                          className={`hover:bg-blue-50/30 transition-colors flex items-center cursor-grab active:cursor-grabbing group ${!selectedDocIds.has(doc.id) ? 'bg-slate-50/50' : 'bg-white'}`}
                          whileDrag={{ 
                            scale: 1.01, 
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                            zIndex: 50
                          }}
                        >
                          <div className="w-10 py-2.5 px-3 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedDocIds.has(doc.id)}
                              onCheckedChange={() => toggleDocumentSelection(doc.id)}
                              className="h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                          </div>
                          <div className="w-10 py-2.5 px-3 flex items-center justify-center text-slate-300 group-hover:text-blue-400 transition-colors">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div className="flex-[2] py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold border italic ${selectedDocIds.has(doc.id) ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                {idx + 1}
                              </div>
                              <span className={`font-medium text-xs transition-colors ${selectedDocIds.has(doc.id) ? 'text-slate-900' : 'text-slate-400 line-through opacity-50'}`}>
                                {doc.docType}
                              </span>
                            </div>
                          </div>
                          <div className="flex-[3] py-2.5 px-3 text-slate-600">
                            <span title={doc.fileName} className={`block max-w-[350px] truncate text-[11px] italic transition-colors ${selectedDocIds.has(doc.id) ? 'text-slate-600' : 'text-slate-400'}`}>
                                {abbreviateFileName(doc.fileName)}
                            </span>
                          </div>
                          <div className="w-20 py-2.5 px-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPdfUrl(doc.fileUrl);
                                setSelectedPdfName(doc.fileName);
                                setPdfViewerOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Regenerate Warning */}
          {!isCheckingMerged && existingMergedDoc && selectedDocIds.size > 0 && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-amber-700 leading-tight">
                <strong>Note:</strong> Regenerating will replace the existing file with the current selection in your chosen order.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 gap-2 shrink-0">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onOpenChange(false)} 
            disabled={isMerging || isLoadingVerifications || isCheckingMerged}
            className="hover:bg-slate-200 h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMergeAll}
            size="sm"
            disabled={isMerging || selectedDocIds.size === 0 || isCheckingMerged || isLoadingVerifications || !!verificationsError}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md rounded-lg px-6 py-1.5 font-semibold transition-all h-9"
          >
            {isMerging ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                Merging...
              </>
            ) : existingMergedDoc ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Regenerate PDF ({selectedDocIds.size})
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5 mr-2" />
                Merge PDF ({selectedDocIds.size})
              </>
            )}
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
    </>
  );
}
