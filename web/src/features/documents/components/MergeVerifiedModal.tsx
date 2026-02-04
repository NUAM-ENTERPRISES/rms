import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, FileText, RefreshCw, CheckCircle, FileX, Download, Calendar, HardDrive, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/app/hooks";
import { useGetMergedDocumentQuery } from "../api";
import { formatDistanceToNow } from "date-fns";

interface MergeVerifiedModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  projectId: string;
  roleCatalogId?: string;
  documents: any[]; // List of verified documents passed from parent
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
  documents,
  onViewDocument,
  onMergeStart,
  onMergeEnd,
}: MergeVerifiedModalProps) {
  const [isMerging, setIsMerging] = useState(false);
  const token = useAppSelector((state) => state.auth.accessToken);

  // Check for existing merged document using Redux
  const { data: mergedDocResponse, isLoading: isCheckingMerged, refetch: refetchMerged } = useGetMergedDocumentQuery(
    { candidateId, projectId, roleCatalogId },
    { skip: !isOpen || !candidateId || !projectId }
  );

  const existingMergedDoc = mergedDocResponse?.data;

  // Download existing merged document
  const handleDownloadExisting = () => {
    if (!existingMergedDoc?.fileUrl) return;
    
    const link = document.createElement('a');
    link.href = existingMergedDoc.fileUrl;
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
    if (documents.length === 0) {
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
      if (roleCatalogId) {
        params.append("roleCatalogId", roleCatalogId);
      }

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
        <DialogHeader className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>
            Generate Unified PDF
          </DialogTitle>
          <p className="text-blue-100 text-sm mt-1">
            {existingMergedDoc 
              ? "A merged document already exists. Download it or regenerate with latest documents."
              : `Review the ${documents.length} verified documents that will be combined into a single PDF.`
            }
          </p>
        </DialogHeader>

        <div className="p-6">
          {/* Loading State */}
          {isCheckingMerged && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
              <span className="text-slate-600">Checking for existing merged document...</span>
            </div>
          )}

          {/* Existing Merged Document Card */}
          {!isCheckingMerged && existingMergedDoc && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-emerald-800 mb-1">Merged Document Available</h4>
                  <p className="text-sm text-emerald-700 mb-3">
                    A previously generated merged PDF is ready for download.
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-emerald-600">
                    <div className="flex items-center gap-1 max-w-[60%]">
                      <FileText className="h-3.5 w-3.5" />
                      <span title={existingMergedDoc.fileName} className="max-w-[520px] truncate block">{abbreviateFileName(existingMergedDoc.fileName)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3.5 w-3.5" />
                      <span>{formatFileSize(existingMergedDoc.fileSize)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Generated {formatDistanceToNow(new Date(existingMergedDoc.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleDownloadExisting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}

          {/* Documents Table */}
          {!isCheckingMerged && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-medium text-slate-700">Source Documents</h4>
                {existingMergedDoc && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {documents.length} verified documents
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50 max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-100/50 sticky top-0">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-700">Document Type</TableHead>
                      <TableHead className="font-semibold text-slate-700">File Name</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <FileX className="h-10 w-10 opacity-20" />
                            <p>No verified documents available</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      documents.map((doc, idx) => (
                        <TableRow key={idx} className="hover:bg-white transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="font-medium text-slate-900">{doc.docType}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 max-w-[640px] truncate">
                            <span title={doc.fileName} className="block max-w-[520px] truncate">{abbreviateFileName(doc.fileName)}</span>
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => onViewDocument(doc.fileUrl, doc.fileName)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Regenerate Warning */}
          {!isCheckingMerged && existingMergedDoc && documents.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>Note:</strong> Regenerating will create a new merged PDF with the current verified documents, 
                replacing the existing file. Use this if documents have been updated since the last merge.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200 gap-3">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            disabled={isMerging}
            className="hover:bg-slate-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMergeAll}
            disabled={isMerging || documents.length === 0 || isCheckingMerged}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 rounded-lg px-8 py-2 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isMerging ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Processing Merger...
              </>
            ) : existingMergedDoc ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate PDF
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Merge & Download All PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
