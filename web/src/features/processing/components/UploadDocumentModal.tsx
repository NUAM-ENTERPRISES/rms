import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileCheck, Upload, Loader2, File, X, AlertCircle, Edit2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  getAllowedFormatsString,
  getDocumentTypeConfig,
  isPassportDocumentType,
  type DocumentType,
} from "@/constants/document-types";
import {
  buildAcceptAttribute,
  effectiveMaxMB,
  validateDocumentFile,
  prepareDocumentFileForUpload,
} from "@/lib/document-upload";

interface UploadMeta {
  documentNumber?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  docType: string;
  docLabel: string;
  roleCatalog?: string | undefined;
  roleLabel?: string | undefined;
  onUpload: (file: File, meta?: UploadMeta) => Promise<void>;
  isUploading: boolean;
  initialDocumentNumber?: string;
  /** When true, only PDF files are accepted (e.g. courier attestation re-upload). */
  pdfOnly?: boolean;
}

export default function UploadDocumentModal({ 
  isOpen, 
  onClose, 
  docType, 
  docLabel, 
  roleCatalog, 
  roleLabel, 
  onUpload, 
  isUploading,
  initialDocumentNumber,
  pdfOnly = false,
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  
  const [documentNumber, setDocumentNumber] = useState("");
  const [isEditingPassport, setIsEditingPassport] = useState(false);

  // Only real passport docs (copy/original/cover) — not passport_photo / "Passport Size Photo"
  const isPassportDoc = useMemo(() => isPassportDocumentType(docType), [docType]);

  useEffect(() => {
    if (isOpen) {
      setDocumentNumber(initialDocumentNumber || "");
      setIsEditingPassport(!initialDocumentNumber);
    }
  }, [isOpen, initialDocumentNumber]);

  const docConfig = docType
    ? getDocumentTypeConfig(docType as DocumentType)
    : undefined;
  const maxMb = pdfOnly ? 20 : docType ? effectiveMaxMB(docType) : 10;
  const allowedFormatsStr = pdfOnly
    ? "PDF"
    : docType
      ? getAllowedFormatsString(docType as DocumentType)
      : "PDF, JPG, PNG";
  const acceptAttr = pdfOnly
    ? ".pdf,application/pdf"
    : docType
      ? buildAcceptAttribute(docType)
      : ".pdf,.jpg,.jpeg,.png";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }
    if (!docType && !pdfOnly) {
      toast.error("Document type is missing");
      return;
    }
    if (pdfOnly) {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setSelectedFile(null);
        setFileError("Only PDF files are allowed");
        toast.error("Only PDF files are allowed");
        return;
      }
    } else {
      const result = validateDocumentFile(file, docType!);
      if (!result.ok) {
        setSelectedFile(null);
        setFileError(result.message ?? "Invalid file");
        if (result.message) toast.error(result.message);
        return;
      }
    }
    setFileError(null);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }
    if (!docType && !pdfOnly) {
      toast.error("Document type is missing");
      return;
    }
    setIsPreparing(true);
    try {
      if (pdfOnly) {
        await onUpload(selectedFile);
      } else {
        const { file: prepared } = await prepareDocumentFileForUpload(
          selectedFile,
          docType!
        );
        await onUpload(prepared, isPassportDoc ? {
          documentNumber: documentNumber.trim() || undefined,
        } : undefined);
      }
      setSelectedFile(null);
      setFileError(null);
      setDocumentNumber("");
    } catch {
      // prepareDocumentFileForUpload toasts errors
    } finally {
      setIsPreparing(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setFileError(null);
    setDocumentNumber("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="flex w-[min(100%,calc(100vw-1.5rem))] flex-col gap-4 overflow-hidden p-6 sm:max-w-md">
        <DialogHeader className="min-w-0 shrink-0 space-y-1.5 pr-6 text-left">
          <DialogTitle className="flex min-w-0 items-center gap-2">
            <Upload className="h-5 w-5 shrink-0 text-blue-600" />
            <span className="min-w-0 truncate">Upload Document</span>
          </DialogTitle>
          <DialogDescription>
            Upload a file for the selected document type
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 py-1">
          <div className="min-w-0 space-y-2">
            <Label>Document Type</Label>
            <div className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-lg border bg-muted p-3">
              <FileCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help truncate text-sm font-semibold text-foreground">{docLabel}</div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] p-2">
                    <p className="text-xs font-medium">{docLabel}</p>
                  </TooltipContent>
                </Tooltip>
                {roleLabel ? (
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">Role: {roleLabel}</div>
                ) : (
                  roleCatalog && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">Role id: {roleCatalog}</div>
                )}
              </div>
            </div>
          </div>

          {isPassportDoc && (
            <div className="grid min-w-0 gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Passport Information
                </Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
                  onClick={() => setIsEditingPassport(!isEditingPassport)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="grid min-w-0 gap-1.5">
                <Label className="text-[10px] font-semibold uppercase text-muted-foreground/80">Passport Number</Label>
                {isEditingPassport ? (
                  <Input
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Enter passport number"
                    className="h-8 w-full min-w-0 max-w-full text-xs"
                  />
                ) : (
                  <p className="truncate text-xs font-medium">{documentNumber || "Not provided"}</p>
                )}
              </div>
            </div>
          )}

          <div className="min-w-0 space-y-2">
            <Label>Select File *</Label>
            <Input 
              type="file" 
              onChange={handleFileChange}
              accept={acceptAttr}
              className="max-w-full cursor-pointer"
            />
            <p className="break-words text-xs text-muted-foreground">
              Allowed: {allowedFormatsStr} · Max {maxMb} MB
              {docConfig ? ` for ${docConfig.displayName}` : ""}
            </p>
            {fileError ? (
              <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{fileError}</span>
              </p>
            ) : null}
          </div>

          {selectedFile && (
            <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-lg border border-blue-100 bg-blue-50 p-3">
              <File className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 shrink-0 p-0"
                onClick={() => {
                  setSelectedFile(null);
                  setFileError(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="min-w-0 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isUploading || isPreparing}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading || isPreparing || !!fileError}>
            {isUploading || isPreparing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
