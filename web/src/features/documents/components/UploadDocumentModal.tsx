import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  projectTitle: string;
  roleDesignation: string;
  docType: string;
  isMandatory?: boolean;
  isUploading?: boolean;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  projectTitle,
  roleDesignation,
  docType,
  isMandatory = false,
  isUploading = false,
}) => {
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadFile(e.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    await onUpload(uploadFile);
    // Reset state after successful upload is usually handled by the parent closing the modal,
    // but we can clear it here if needed when the modal closes.
  };

  // Reset file when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setUploadFile(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Document
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Context Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                Project
              </span>
              <span className="font-semibold text-slate-900 line-clamp-1">
                {projectTitle}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                Role
              </span>
              <span className="font-semibold text-slate-900">
                {roleDesignation}
              </span>
            </div>
            <div className="space-y-1 col-span-2 pt-2 border-t border-slate-200/60">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                Document Type
              </span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">{docType}</span>
                {isMandatory && (
                  <Badge
                    variant="destructive"
                    className="h-4 px-1.5 text-[9px] uppercase font-bold tracking-tighter"
                  >
                    Mandatory
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="file"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Select File
            </Label>
            <div className="relative">
              <Input
                id="file"
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                  uploadFile
                    ? "border-primary/50 bg-primary/5"
                    : "border-slate-200 hover:border-primary/30 hover:bg-slate-50"
                )}
              >
                {uploadFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-slate-900">
                      {uploadFile.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-2 bg-slate-100 rounded-full">
                      <Upload className="h-6 w-6 text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">
                      Click to browse or drag and drop
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PDF, JPG, PNG (Max 10MB)
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!uploadFile || isUploading}
            className="flex-1 sm:flex-none min-w-[120px]"
          >
            {isUploading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Document"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
