import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Upload, Loader2, File, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  docType: string;
  docLabel: string;
  roleCatalog?: string | undefined;
  roleLabel?: string | undefined;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

export default function UploadDocumentModal({ isOpen, onClose, docType, docLabel, roleCatalog, roleLabel, onUpload, isUploading }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }
    await onUpload(selectedFile);
    setSelectedFile(null);
  };

  const handleClose = () => {
    setSelectedFile(null);
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
          {/* Document Type Display */}
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
              {/* <Badge variant="outline" className="ml-2 text-[9px] font-bold uppercase tracking-wider shrink-0 bg-white border-slate-200 text-slate-500">{docType}</Badge> */}
            </div>
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <Label>Select File *</Label>
            <Input 
              type="file" 
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, JPG, PNG, DOC, DOCX
            </p>
          </div>

          {/* Selected File Preview */}
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
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? (
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