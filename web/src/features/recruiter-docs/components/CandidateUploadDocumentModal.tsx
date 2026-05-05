import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DepartmentSelect, JobTitleSelect } from "@/components/molecules";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { DOCUMENT_TYPE, DOCUMENT_TYPE_CONFIG, isValidFileExtension, isValidFileSize, getAllowedFormatsString } from "@/constants/document-types";
import { Plus, Briefcase } from "lucide-react";
import { toast } from "sonner";
import type { WorkExperience } from "@/features/candidates/api";

const EMPLOYMENT_DOC_TYPES = new Set([
  DOCUMENT_TYPE.EXPERIENCE_LETTERS,
  DOCUMENT_TYPE.EXPERIENCE_LETTER,
  DOCUMENT_TYPE.RELIEVING_LETTER,
  DOCUMENT_TYPE.SALARY_SLIP,
  DOCUMENT_TYPE.APPOINTMENT_LETTER,
]);

const HIDDEN_DOCUMENT_TYPES = new Set<string>([
  DOCUMENT_TYPE.EXPERIENCE_LETTER,
]);

interface Props {
  isOpen: boolean;
  initialDocType?: string;
  initialWorkExperienceId?: string;
  onClose: () => void;
  onUpload: (file: File, meta: {
    docType: string;
    roleCatalogId?: string;
    workExperienceId?: string;
    docName?: string;
    documentNumber?: string;
    expiryDate?: string;
    notes?: string;
  }) => Promise<void> | void;
  isUploading?: boolean;
  workExperiences?: WorkExperience[];
}

const CandidateUploadDocumentModal: React.FC<Props> = ({ isOpen, initialDocType, initialWorkExperienceId, onClose, onUpload, isUploading, workExperiences }) => {
  const [docType, setDocType] = React.useState<string>("");
  const [docTypeFilter, setDocTypeFilter] = React.useState<string>("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = React.useState<string>("");
  const [previewName, setPreviewName] = React.useState<string>("");
  const [previewType, setPreviewType] = React.useState<string>("");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [documentNumber, setDocumentNumber] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [docName, setDocName] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState<string | undefined>(undefined);
  const [roleCatalogId, setRoleCatalogId] = React.useState<string | undefined>(undefined);
  const [roleLabel, setRoleLabel] = React.useState<string>("");
  const [selectedWorkExperienceId, setSelectedWorkExperienceId] = React.useState<string | undefined>(undefined);

  const showWorkExperienceSelector =
    EMPLOYMENT_DOC_TYPES.has(docType as any) && workExperiences && workExperiences.length > 0;

  const filteredDocTypes = React.useMemo(() => {
    const q = docTypeFilter.trim().toLowerCase();
    return Object.entries(DOCUMENT_TYPE_CONFIG)
      .filter(([type]) => !HIDDEN_DOCUMENT_TYPES.has(type))
      .filter(([type, cfg]) =>
        !q || cfg.displayName.toLowerCase().includes(q) || type.toLowerCase().includes(q)
      );
  }, [docTypeFilter]);

  React.useEffect(() => {
    if (!isOpen) {
      setDocType("");
      setDocTypeFilter("");
      setSelectedFile(null);
      setPreviewSrc("");
      setPreviewName("");
      setPreviewType("");
      setPreviewOpen(false);
      setDocumentNumber("");
      setExpiryDate("");
      setNotes("");
      setDocName("");
      setDepartmentId(undefined);
      setRoleCatalogId(undefined);
      setRoleLabel("");
      setSelectedWorkExperienceId(undefined);
    } else if (initialDocType) {
      setDocType(initialDocType);
    }
  }, [isOpen, initialDocType]);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedWorkExperienceId(initialWorkExperienceId);
    }
  }, [isOpen, initialWorkExperienceId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    // cleanup previous preview URL
    if (previewSrc) {
      URL.revokeObjectURL(previewSrc);
      setPreviewSrc("");
      setPreviewName("");
      setPreviewType("");
    }

    if (f) {
      const url = URL.createObjectURL(f);
      setSelectedFile(f);
      setPreviewSrc(url);
      setPreviewName(f.name);
      setPreviewType(f.type || "");
    } else {
      setSelectedFile(null);
    }
  };

  const handleUploadClick = async () => {
    if (!docType) {
      toast.error("Please select a document type");
      return;
    }
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    const config = DOCUMENT_TYPE_CONFIG[docType as keyof typeof DOCUMENT_TYPE_CONFIG];
    if (!config) {
      toast.error("Unknown document type");
      return;
    }

    // Validate extension and size
    if (!isValidFileExtension(docType as any, selectedFile.name)) {
      toast.error(`Invalid file format. Allowed: ${getAllowedFormatsString(docType as any)}`);
      return;
    }

    const sizeMB = Number((selectedFile.size / (1024 * 1024)).toFixed(2));
    if (!isValidFileSize(docType as any, sizeMB)) {
      toast.error(`File too large. Max size: ${config.maxSizeMB} MB`);
      return;
    }

    // Role-scoped documents: ensure roleCatalogId selected
    if (
      (docType === DOCUMENT_TYPE.RESUME ||
        docType === DOCUMENT_TYPE.EXPERIENCE_LETTERS) &&
      !roleCatalogId
    ) {
      toast.error("Please select a role for this document");
      return;
    }

    try {
      await onUpload(selectedFile, {
        docType,
        roleCatalogId,
        workExperienceId: selectedWorkExperienceId ?? initialWorkExperienceId,
        docName: docName || undefined,
        documentNumber: documentNumber || undefined,
        expiryDate: expiryDate || undefined,
        notes: notes || undefined,
      });
      // Close handled by parent on success in most flows, but keep safe
      setTimeout(() => onClose(), 200);
    } catch (err) {
      // parent will usually toast, but provide fallback
      console.error(err);
      toast.error("Upload failed");
    }
  };

  React.useEffect(() => {
    if (docType !== DOCUMENT_TYPE.EXPERIENCE_LETTERS) return;
    if (!selectedWorkExperienceId || !workExperiences?.length) return;
    const exp = workExperiences.find((we) => we.id === selectedWorkExperienceId);
    if (exp?.roleCatalogId) {
      setRoleCatalogId(exp.roleCatalogId);
      // We don't always have role label available here; keep existing label if set.
    }
  }, [docType, selectedWorkExperienceId, workExperiences]);

  const docTypeConfig = docType
    ? DOCUMENT_TYPE_CONFIG[docType as keyof typeof DOCUMENT_TYPE_CONFIG]
    : undefined;

  const allowedFormats = docTypeConfig
    ? docTypeConfig.allowedFormats.map((f) => `.${f}`).join(",")
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xl gap-3 p-5 sm:p-6">
        <DialogHeader className="gap-1 space-y-0 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="h-5 w-5 shrink-0 text-green-600" />
            Upload Candidate Document
          </DialogTitle>
          <DialogDescription className="text-xs leading-snug">
            Select type, add optional details, then choose a file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 sm:gap-y-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Document Type *</Label>
              <Select value={docType} onValueChange={(v) => { setDocType(v); setDocTypeFilter(""); setDepartmentId(undefined); setRoleCatalogId(undefined); setRoleLabel(""); }}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <div className="p-2">
                    <Input
                      placeholder="Search document types..."
                      value={docTypeFilter}
                      onChange={(e) => setDocTypeFilter(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-9"
                    />
                  </div>
                  <div className="p-1">
                    {filteredDocTypes.length > 0 ? (
                      filteredDocTypes.map(([type, cfg]) => (
                        <SelectItem key={type} value={type}>
                          {cfg.displayName}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No document types match your search.</div>
                    )}
                  </div>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Document Name</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g., Aster (shown as Document Name : Document Type)"
                className="h-9"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
            <Label className="text-xs font-medium">File</Label>
            <div className="flex w-full flex-col gap-1.5">
              <Input
                type="file"
                onChange={handleFileChange}
                accept={allowedFormats || undefined}
                className="h-9 cursor-pointer bg-background"
              />
              {docTypeConfig && (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Allowed: {getAllowedFormatsString(docType as any)} · Max{" "}
                  {docTypeConfig.maxSizeMB} MB
                </p>
              )}
              {selectedFile && (
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-2">
                  <span className="text-xs font-medium truncate max-w-[240px] text-slate-800">{selectedFile.name}</span>
                  <Button variant="ghost" size="sm" type="button" onClick={() => setPreviewOpen(true)}>View</Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => {
                    setSelectedFile(null);
                    if (previewSrc) {
                      URL.revokeObjectURL(previewSrc);
                      setPreviewSrc("");
                      setPreviewName("");
                      setPreviewType("");
                    }
                  }}>Remove</Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 sm:gap-y-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Document Number</Label>
              <Input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Optional"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-9" />
            </div>
          </div>

          {(docType === DOCUMENT_TYPE.RESUME ||
            docType === DOCUMENT_TYPE.EXPERIENCE_LETTERS) && (
            <div className="grid grid-cols-1 gap-x-3 gap-y-3 md:grid-cols-2 md:gap-y-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Department</Label>
                <DepartmentSelect
                  value={departmentId}
                  onValueChange={(value) => {
                    setDepartmentId(value);
                    setRoleCatalogId(undefined);
                    setRoleLabel("");
                  }}
                  placeholder="Select department"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Role</Label>
                <JobTitleSelect
                  value={roleLabel}
                  onRoleChange={(role) => {
                    if (role) {
                      setRoleCatalogId(role.id);
                      setRoleLabel(role.label || role.name || "");
                    } else {
                      setRoleCatalogId(undefined);
                      setRoleLabel("");
                    }
                  }}
                  departmentId={departmentId}
                  placeholder="Select a role"
                  disabled={
                    (docType === DOCUMENT_TYPE.RESUME ||
                      docType === DOCUMENT_TYPE.EXPERIENCE_LETTERS) &&
                    !departmentId
                  }
                  required={
                    docType === DOCUMENT_TYPE.RESUME ||
                    docType === DOCUMENT_TYPE.EXPERIENCE_LETTERS
                  }
                />
              </div>
            </div>
          )}

          {/* Employment docs: link work experience */}
          {showWorkExperienceSelector && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium">
                <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                Link to work experience <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Select
                value={selectedWorkExperienceId ?? "__none__"}
                onValueChange={(v) => setSelectedWorkExperienceId(v === "__none__" ? undefined : v)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select a work experience entry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Not linked to a specific experience —</SelectItem>
                  {workExperiences!.map((exp) => (
                    <SelectItem key={exp.id} value={exp.id}>
                      {exp.jobTitle}{exp.companyName ? ` @ ${exp.companyName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Shows this document with the matching experience entry.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="min-h-[68px] resize-y text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 sm:pt-3">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Button>
          {/* Only show upload button when user has selected a type and a file. For resumes, require role selection (button disabled until role chosen). */}
          {docType && selectedFile ? (
            <Button
              onClick={handleUploadClick}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={
                isUploading ||
                ((docType === DOCUMENT_TYPE.RESUME ||
                  docType === DOCUMENT_TYPE.EXPERIENCE_LETTERS) &&
                  !roleCatalogId)
              }
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          ) : null}
        </DialogFooter>

        {/* File preview modal */}
        {previewSrc && previewType.startsWith("application/pdf") ? (
          <PDFViewer
            fileUrl={previewSrc}
            fileName={previewName || "Preview"}
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
            showDownload={true}
            showZoomControls={true}
            showRotationControls={true}
            showFullscreenToggle={true}
          />
        ) : (
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Preview: {previewName}</DialogTitle>
                <DialogDescription>
                  {previewType || "File preview"}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {previewSrc ? (
                  <img src={previewSrc} alt={previewName} className="w-full max-h-[70vh] object-contain" />
                ) : (
                  <div className="py-10 text-center text-muted-foreground">No preview available</div>
                )}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CandidateUploadDocumentModal;
