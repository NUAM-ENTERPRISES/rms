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
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  
  const [documentNumber, setDocumentNumber] = useState("");
  const [isEditingPassport, setIsEditingPassport] = useState(false);

  const isPassportDoc = useMemo(() => isPassportDocumentType(docType), [docType]);
  
  const forceShowPassportFields = useMemo(() => {
    return isPassportDoc || 
           docType?.toLowerCase().includes("passport") || 
           docLabel?.toLowerCase().includes("passport");
  }, [isPassportDoc, docType, docLabel]);

  useEffect(() => {
    if (isOpen) {
      setDocumentNumber(initialDocumentNumber || "");
      setIsEditingPassport(!initialDocumentNumber);
    }
  }, [isOpen, initialDocumentNumber]);

  const docConfig = docType
    ? getDocumentTypeConfig(docType as DocumentType)
    : undefined;
  const maxMb = docType ? effectiveMaxMB(docType) : 10;
  const allowedFormatsStr = docType
    ? getAllowedFormatsString(docType as DocumentType)
    : "PDF, JPG, PNG";
  const acceptAttr = docType ? buildAcceptAttribute(docType) : ".pdf,.jpg,.jpeg,.png";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }
    if (!docType) {
      toast.error("Document type is missing");
      return;
    }
    const result = validateDocumentFile(file, docType);
    if (!result.ok) {
      setSelectedFile(null);
      setFileError(result.message ?? "Invalid file");
      if (result.message) toast.error(result.message);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }
    if (!docType) {
      toast.error("Document type is missing");
      return;
    }
    setIsPreparing(true);
    try {
      const { file: prepared } = await prepareDocumentFileForUpload(
        selectedFile,
        docType
      );
      await onUpload(prepared, forceShowPassportFields ? {
        documentNumber: documentNumber.trim() || undefined,
      } : undefined);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload Document
          </DialogTitle>
          <DialogDescription>
            Upload a file for the selected document type
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 text-balance">
            <Label>Document Type</Label>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border max-w-full overflow-hidden">
              <FileCheck className="h-4 w-4 text-slate-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="font-semibold text-sm truncate cursor-help text-slate-700">{docLabel}</div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] p-2">
                    <p className="text-xs font-medium">{docLabel}</p>
                  </TooltipContent>
                </Tooltip>
                {roleLabel ? (
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">Role: {roleLabel}</div>
                ) : (
                  roleCatalog && <div className="text-[11px] text-slate-500 truncate mt-0.5">Role id: {roleCatalog}</div>
                )}
              </div>
            </div>
          </div>

          {forceShowPassportFields && (
            <div className="grid gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Passport Information
                </Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={() => setIsEditingPassport(!isEditingPassport)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="grid gap-3 sm:grid-cols-1">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground/80">Passport Number</Label>
                  {isEditingPassport ? (
                    <Input
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      placeholder="Enter passport number"
                      className="h-8 text-xs"
                    />
                  ) : (
                    <p className="text-xs font-medium">{documentNumber || "Not provided"}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Select File *</Label>
            <Input 
              type="file" 
              onChange={handleFileChange}
              accept={acceptAttr}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Allowed: {allowedFormatsStr} · Max {maxMb} MB
              {docConfig ? ` for ${docConfig.displayName}` : ""}
            </p>
            {fileError ? (
              <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {fileError}
              </p>
            ) : null}
          </div>

          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <File className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
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

        <DialogFooter>
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
