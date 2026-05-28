/**
 * Candidate Resume List component - molecule for displaying candidate resumes
 * Shows a scrollable list of resumes uploaded for a candidate
 * Following FE_GUIDELINES.md molecules pattern
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Calendar, Download, Eye, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { useDeleteDocumentMutation, useGetDocumentsQuery } from "@/features/documents";
import {
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
} from "@/features/documents/api";
import { useUploadResumeMutation } from "@/services/uploadApi";
import { PDFViewer } from "./PDFViewer";
import { ResumeUploadRoleModal } from "./ResumeUploadRoleModal";
import type { ResumeRoleSelection } from "./ResumeUploadRoleModal";
import { ResumeReuploadModal } from "./ResumeReuploadModal";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { toast } from "sonner";

export interface CandidateResumeListProps {
  /** Candidate ID to fetch resumes for */
  candidateId: string;
  /** Whether the component is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function CandidateResumeList({
  candidateId,
  isLoading = false,
  className = "",
}: CandidateResumeListProps) {
  const [selectedResume, setSelectedResume] = useState<any>(null);
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [docNameMode, setDocNameMode] = useState<"common" | "individual">(
    "common",
  );
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReuploading, setIsReuploading] = useState(false);
  const [isReuploadModalOpen, setIsReuploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<any>(null);
  const [reuploadTarget, setReuploadTarget] = useState<any>(null);
  const [editingResume, setEditingResume] = useState<any>(null);
  const [roleSelections, setRoleSelections] = useState<ResumeRoleSelection[]>([
    { id: crypto.randomUUID() },
  ]);

  // Fetch documents for this candidate, filtering for resume type
  const { data: documentsData, isLoading: documentsLoading, refetch } =
    useGetDocumentsQuery({
      candidateId,
      docType: "resume",
      limit: 10, // Get more resumes
    });

  // Upload mutation
  const [uploadResume] = useUploadResumeMutation();
  const [deleteDocument] = useDeleteDocumentMutation();
  const [createDocument] = useCreateDocumentMutation();
  const [updateDocument] = useUpdateDocumentMutation();

  const resumes = useMemo(
    () =>
      [...(documentsData?.data?.documents || [])].sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [documentsData?.data?.documents],
  );
  const truncateText = (value: string, max = 60) =>
    value.length > max ? `${value.slice(0, max)}...` : value;

  const handleResumeClick = (resume: any) => {
    setSelectedResume(resume);
    setIsPDFViewerOpen(true);
  };

  const handleDownload = (resume: any) => {
    // Open the file URL in a new tab for download
    window.open(resume.fileUrl, "_blank");
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setDocName("");
    setDocNameMode("common");
    setIsPreviewOpen(false);
    setRoleSelections([{ id: crypto.randomUUID() }]);
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    resetUploadState();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== "application/pdf") {
        toast.error("Please select a PDF file");
        return;
      }
      setSelectedFile(file);
    }
  };

  const addRoleSelection = () => {
    setRoleSelections((prev) => [...prev, { id: crypto.randomUUID() }]);
  };

  const removeRoleSelection = (id: string) => {
    setRoleSelections((prev) =>
      prev.length === 1 ? prev : prev.filter((entry) => entry.id !== id),
    );
  };

  const normalizedRoleIds = useMemo(
    () =>
      Array.from(
        new Set(
          roleSelections
            .map((selection) => selection.roleCatalogId?.trim())
            .filter((roleId): roleId is string => !!roleId),
        ),
      ),
    [roleSelections],
  );

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!normalizedRoleIds.length) {
      toast.error("Please select at least one department and role");
      return;
    }

    setIsUploading(true);
    try {
      await Promise.all(
        normalizedRoleIds.map((selectedRoleCatalogId) => {
          const mappedSelection = roleSelections.find(
            (selection) => selection.roleCatalogId === selectedRoleCatalogId,
          );
          const individualDocName = mappedSelection?.docName?.trim();
          return uploadResume({
            candidateId,
            file: selectedFile,
            roleCatalogId: selectedRoleCatalogId,
            docName:
              docNameMode === "common"
                ? docName.trim() || undefined
                : individualDocName || undefined,
          }).unwrap();
        }),
      );

      toast.success("Resume uploaded successfully!");
      closeUploadModal();
      refetch();
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error?.data?.message || "Failed to upload resume");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!resumeToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteDocument(resumeToDelete.id).unwrap();
      toast.success("Resume deleted successfully");
      setIsDeleteConfirmOpen(false);
      setResumeToDelete(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete resume");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReuploadTrigger = (resume: any) => {
    setReuploadTarget(resume);
    setIsReuploadModalOpen(true);
  };

  const handleEditTrigger = (resume: any) => {
    setEditingResume(resume);
    setDocName(resume?.docName || "");
    setDocNameMode("common");
    setRoleSelections([
      {
        id: crypto.randomUUID(),
        departmentId: resume?.roleCatalog?.roleDepartmentId || undefined,
        roleCatalogId: resume?.roleCatalogId || undefined,
        roleLabel: resume?.roleCatalog?.label || resume?.roleCatalog?.name || "",
        docName: resume?.docName || "",
      },
    ]);
    setIsEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingResume?.id) return;
    const selectedRoleEntries = Array.from(
      new Map(
        roleSelections
          .filter((selection): selection is ResumeRoleSelection & { roleCatalogId: string } =>
            Boolean(selection.roleCatalogId?.trim()),
          )
          .map((selection) => [
            selection.roleCatalogId!.trim(),
            { ...selection, roleCatalogId: selection.roleCatalogId!.trim() },
          ]),
      ).values(),
    );

    if (!selectedRoleEntries.length) {
      toast.error("Please select a role");
      return;
    }

    setIsSavingEdit(true);
    try {
      const [primaryEntry, ...additionalEntries] = selectedRoleEntries;
      const resolvedPrimaryDocName =
        docNameMode === "common"
          ? docName.trim() || undefined
          : primaryEntry.docName?.trim() || undefined;

      await updateDocument({
        id: editingResume.id,
        docName: resolvedPrimaryDocName,
        roleCatalogId: primaryEntry.roleCatalogId,
      }).unwrap();

      if (additionalEntries.length) {
        await Promise.all(
          additionalEntries.map((entry) =>
            createDocument({
              candidateId,
              docType: editingResume.docType || "resume",
              docName:
                docNameMode === "common"
                  ? docName.trim() || undefined
                  : entry.docName?.trim() || undefined,
              fileName: editingResume.fileName,
              fileUrl: editingResume.fileUrl,
              fileSize: editingResume.fileSize,
              mimeType: editingResume.mimeType,
              roleCatalogId: entry.roleCatalogId,
            }).unwrap(),
          ),
        );
      }

      toast.success("Resume details updated successfully");
      setIsEditModalOpen(false);
      setEditingResume(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update resume details");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleReuploadSubmit = async (payload: {
    file: File;
    docName?: string;
    roleCatalogId?: string;
  }) => {
    if (!reuploadTarget) return;
    const file = payload.file;
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    setIsReuploading(true);
    try {
      await uploadResume({
        candidateId,
        file,
        roleCatalogId: payload.roleCatalogId || reuploadTarget?.roleCatalogId || undefined,
        docName: payload.docName || reuploadTarget?.docName || undefined,
      }).unwrap();
      await deleteDocument(reuploadTarget.id).unwrap();
      toast.success("Resume reuploaded successfully");
      setReuploadTarget(null);
      setIsReuploadModalOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to reupload resume");
    } finally {
      setIsReuploading(false);
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Resume
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4">
          {resumes.length > 0 ? (
            <ScrollArea className="h-48">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doc Type</TableHead>
                      <TableHead>Doc Name</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-[210px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumes.map((resume) => {
                      const roleLabel =
                        resume?.roleCatalog?.label ||
                        resume?.roleCatalog?.name ||
                        "N/A";

                      return (
                        <TableRow key={resume.id}>
                          <TableCell className="capitalize">
                            {resume.docType || "resume"}
                          </TableCell>
                          <TableCell>{resume.docName || "—"}</TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-block max-w-[260px] truncate cursor-help align-bottom">
                                  {truncateText(resume.fileName || "", 60)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{resume.fileName}</p>
                              </TooltipContent>
                            </Tooltip>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
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
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-slate-700">{roleLabel}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleResumeClick(resume)}
                                className="h-7 w-7"
                                title="View resume"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(resume)}
                                className="h-7 w-7"
                                title="Download resume"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditTrigger(resume)}
                                className="h-7 w-7"
                                title="Edit resume role/name"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReuploadTrigger(resume)}
                                className="h-7 w-7"
                                title="Reupload resume"
                              >
                                <RefreshCcw className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setResumeToDelete(resume);
                                  setIsDeleteConfirmOpen(true);
                                }}
                                className="h-7 w-7 text-red-600 hover:text-red-700"
                                title="Delete resume"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TooltipProvider>
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

        </CardContent>
      </Card>

      <ResumeUploadRoleModal
        mode="upload"
        isOpen={isUploadModalOpen}
        selectedFile={selectedFile}
        docName={docName}
        docNameMode={docNameMode}
        roleSelections={roleSelections}
        isUploading={isUploading}
        onClose={closeUploadModal}
        onDocNameModeChange={setDocNameMode}
        onDocNameChange={setDocName}
        onFileSelect={handleFileSelect}
        onPreview={() => setIsPreviewOpen(true)}
        onAddRole={addRoleSelection}
        onRemoveRole={removeRoleSelection}
        onRoleSelectionsChange={setRoleSelections}
        onUpload={handleUpload}
      />

      <ResumeUploadRoleModal
        mode="edit"
        isOpen={isEditModalOpen}
        selectedFile={null}
        docName={docName}
        docNameMode={docNameMode}
        roleSelections={roleSelections}
        isUploading={isSavingEdit}
        onClose={() => {
          if (!isSavingEdit) {
            setIsEditModalOpen(false);
            setEditingResume(null);
          }
        }}
        onDocNameModeChange={setDocNameMode}
        onDocNameChange={setDocName}
        onFileSelect={() => undefined}
        onPreview={() => undefined}
        onAddRole={addRoleSelection}
        onRemoveRole={removeRoleSelection}
        onRoleSelectionsChange={setRoleSelections}
        onUpload={handleEditSave}
      />

      <ResumeReuploadModal
        isOpen={isReuploadModalOpen}
        isSubmitting={isReuploading}
        initialDocName={reuploadTarget?.docName}
        initialRoleCatalogId={reuploadTarget?.roleCatalogId}
        initialDepartmentId={reuploadTarget?.roleCatalog?.roleDepartmentId}
        initialRoleLabel={
          reuploadTarget?.roleCatalog?.label || reuploadTarget?.roleCatalog?.name
        }
        onClose={() => {
          if (!isReuploading) {
            setIsReuploadModalOpen(false);
            setReuploadTarget(null);
          }
        }}
        onSubmit={handleReuploadSubmit}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteConfirmOpen(false);
            setResumeToDelete(null);
          }
        }}
        onConfirm={handleDeleteResume}
        title={resumeToDelete?.fileName || "this resume"}
        itemType="resume"
        description="Are you sure you want to remove this resume? It will be soft-deleted and can be tracked in history."
        isLoading={isDeleting}
      />

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
