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
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, meta: {
    docType: string;
    roleCatalogId?: string;
    documentNumber?: string;
    expiryDate?: string;
    notes?: string;
  }) => Promise<void> | void;
  isUploading?: boolean;
}

const CandidateUploadDocumentModal: React.FC<Props> = ({ isOpen, onClose, onUpload, isUploading }) => {
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
  const [departmentId, setDepartmentId] = React.useState<string | undefined>(undefined);
  const [roleCatalogId, setRoleCatalogId] = React.useState<string | undefined>(undefined);
  const [roleLabel, setRoleLabel] = React.useState<string>("");

  const filteredDocTypes = React.useMemo(() => {
    const q = docTypeFilter.trim().toLowerCase();
    return Object.entries(DOCUMENT_TYPE_CONFIG).filter(([type, cfg]) =>
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
      setDepartmentId(undefined);
      setRoleCatalogId(undefined);
      setRoleLabel("");
    }
  }, [isOpen]);

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

    // If resume, ensure roleCatalogId selected
    if (docType === DOCUMENT_TYPE.RESUME && !roleCatalogId) {
      toast.error("Please select a role for Resume uploads");
      return;
    }

    try {
      await onUpload(selectedFile, {
        docType,
        roleCatalogId,
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

  const allowedFormats = docType ? (DOCUMENT_TYPE_CONFIG[docType as keyof typeof DOCUMENT_TYPE_CONFIG]?.allowedFormats || []).map(f => `.${f}`).join(",") : "";

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600" />
            Upload Candidate Document
          </DialogTitle>
          <DialogDescription>
            Upload a document for this candidate. Select type and provide optional metadata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select value={docType} onValueChange={(v) => { setDocType(v); setDocTypeFilter(""); setDepartmentId(undefined); setRoleCatalogId(undefined); setRoleLabel(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {/* Search input inside dropdown */}
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

            <div className="space-y-2">
              <Label>File</Label>
              <Input type="file" onChange={handleFileChange} accept={allowedFormats || undefined} />
              {docType && (
                <p className="text-xs text-muted-foreground mt-1">Allowed: {getAllowedFormatsString(docType as any)} • Max: {DOCUMENT_TYPE_CONFIG[docType as keyof typeof DOCUMENT_TYPE_CONFIG]?.maxSizeMB} MB</p>
              )}

              {selectedFile && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm truncate max-w-[280px]">{selectedFile.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>View</Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    // remove file and preview
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

            {/* Only for resume: department + role */}
            {docType === DOCUMENT_TYPE.RESUME && (
              <>
                <div className="space-y-2">
                  <Label>Department</Label>
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
                <div className="space-y-2">
                  <Label>Role</Label>
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
                    disabled={docType === DOCUMENT_TYPE.RESUME && !departmentId}
                    required={docType === DOCUMENT_TYPE.RESUME}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Document Number</Label>
              <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Optional" />
            </div>

            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Button>
          {/* Only show upload button when user has selected a type and a file. For resumes, require role selection (button disabled until role chosen). */}
          {docType && selectedFile ? (
            <Button
              onClick={handleUploadClick}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isUploading || (docType === DOCUMENT_TYPE.RESUME && !roleCatalogId)}
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
