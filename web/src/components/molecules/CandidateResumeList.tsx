/**
 * Candidate Resume List component - molecule for displaying candidate resumes
 * Shows a scrollable list of resumes uploaded for a candidate
 * Following FE_GUIDELINES.md molecules pattern
 */

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Calendar, Download, Eye, Plus, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useGetDocumentsQuery } from "@/features/documents";
import { useUploadResumeMutation } from "@/services/uploadApi";
import { PDFViewer } from "./PDFViewer";
import { toast } from "sonner";

export interface CandidateResumeListProps {
  /** Candidate ID to fetch resumes for */
  candidateId: string;
  /** Role Catalog ID to link to the resume */
  roleCatalogId?: string;
  /** Whether the component is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function CandidateResumeList({
  candidateId,
  roleCatalogId,
  isLoading = false,
  className = "",
}: CandidateResumeListProps) {
  const [selectedResume, setSelectedResume] = useState<any>(null);
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents for this candidate, filtering for resume type
  const { data: documentsData, isLoading: documentsLoading } =
    useGetDocumentsQuery({
      candidateId,
      docType: "resume",
      limit: 10, // Get more resumes
    });

  // Upload mutation
  const [uploadResume] = useUploadResumeMutation();

  const resumes = documentsData?.data?.documents || [];

  const handleResumeClick = (resume: any) => {
    setSelectedResume(resume);
    setIsPDFViewerOpen(true);
  };

  const handleDownload = (resume: any) => {
    // Open the file URL in a new tab for download
    window.open(resume.fileUrl, "_blank");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== "application/pdf") {
        toast.error("Please select a PDF file");
        return;
      }
      // No file size limitation for resumes
      setSelectedFile(file);
      setIsPreviewOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await uploadResume({
        candidateId,
        file: selectedFile,
        roleCatalogId,
      }).unwrap();

      toast.success("Resume uploaded successfully!");
      setSelectedFile(null);
      setIsPreviewOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error?.data?.message || "Failed to upload resume");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setIsPreviewOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (isLoading || documentsLoading) {
    return (
      <Card
        className={`border-0 shadow-lg bg-white/80 backdrop-blur-sm ${className}`}
      >
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <FileText className="h-5 w-5 text-blue-600" />
            Resumes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={`border-0 shadow-lg bg-white/80 backdrop-blur-sm ${className}`}
      >
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <FileText className="h-5 w-5 text-blue-600" />
              Resumes ({resumes.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Resume
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4">
          {resumes.length > 0 ? (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 truncate text-sm">
                          {resume.fileName}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(resume.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          {resume.fileSize && (
                            <span>
                              {(resume.fileSize / 1024 / 1024).toFixed(1)} MB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResumeClick(resume)}
                        className="h-7 w-7"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(resume)}
                        className="h-7 w-7"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 text-sm mb-1">
                No resumes uploaded yet
              </p>
              <p className="text-xs text-slate-500">
                Upload resumes to view them here
              </p>
            </div>
          )}

          {/* Upload Preview */}
          {selectedFile && (
            <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviewOpen(true)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelUpload}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {isUploading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Resume
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Viewer for existing resumes */}
      <PDFViewer
        fileUrl={selectedResume?.fileUrl || ""}
        fileName={selectedResume?.fileName || "Resume"}
        isOpen={isPDFViewerOpen}
        onClose={() => setIsPDFViewerOpen(false)}
        showDownload={true}
        showZoomControls={true}
        showRotationControls={true}
        showFullscreenToggle={true}
      />

      {/* PDF Preview for new uploads */}
      {selectedFile && (
        <PDFViewer
          fileUrl={URL.createObjectURL(selectedFile)}
          fileName={selectedFile.name}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          showDownload={false}
          showZoomControls={true}
          showRotationControls={true}
          showFullscreenToggle={true}
        />
      )}
    </>
  );
}
