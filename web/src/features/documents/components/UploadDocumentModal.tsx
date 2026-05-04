import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, RefreshCw, Replace } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  projectTitle: string;
  roleDesignation: string;
  docType: string;
  /** Catalog display name for doc type (shown instead of raw docType when provided) */
  docTypeLabel?: string;
  isMandatory?: boolean;
  isUploading?: boolean;
  /** When set, UI switches to re-upload styling (same API flow as project docs). */
  variant?: "upload" | "reupload";
  /** Current file name being replaced (re-upload only). */
  previousFileName?: string | null;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  projectTitle,
  roleDesignation,
  docType,
  docTypeLabel,
  isMandatory = false,
  isUploading = false,
  variant = "upload",
  previousFileName,
}) => {
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const isReupload = variant === "reupload";
  const typeDisplay = docTypeLabel?.trim() || docType;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadFile(e.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    await onUpload(uploadFile);
  };

  React.useEffect(() => {
    if (!isOpen) {
      setUploadFile(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90dvh,720px)] w-[min(100%,calc(100vw-1.5rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[500px]",
          isReupload && "border-amber-200/80 shadow-md shadow-amber-950/5"
        )}
      >
        <div
          className={cn(
            "shrink-0 border-b px-4 pb-3 pt-5 pr-12 sm:px-6 sm:pb-2 sm:pt-6",
            isReupload ? "bg-gradient-to-br from-amber-50/90 to-background border-amber-100" : "border-border/60"
          )}
        >
          <DialogHeader className="space-y-2 text-left sm:space-y-1">
            <DialogTitle
              className={cn(
                "flex flex-col gap-2 text-base leading-snug sm:flex-row sm:items-center sm:gap-2 sm:text-lg",
                isReupload && "text-amber-950"
              )}
            >
              {isReupload ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 ring-1 ring-amber-200/80 sm:self-start">
                  <Replace className="h-5 w-5" aria-hidden />
                </span>
              ) : (
                <Upload className="h-5 w-5 shrink-0 text-primary sm:mt-0.5" aria-hidden />
              )}
              <span className="min-w-0 break-words">
                {isReupload ? "Replace document" : "Upload document"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-pretty text-sm text-muted-foreground">
              {isReupload
                ? "Upload a new file. The previous version stays in history; verification follows your project workflow."
                : "Choose a file to attach for this project requirement."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <div className="grid gap-5 sm:gap-6">
          <div
            className={cn(
              "grid grid-cols-1 gap-3 rounded-xl border p-3 text-sm sm:grid-cols-2 sm:gap-4 sm:p-4",
              isReupload
                ? "bg-background border-amber-100/90 ring-1 ring-amber-100/60"
                : "bg-muted/30 border-border/60"
            )}
          >
            <div className="min-w-0 space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                Project
              </span>
              <span className="font-semibold text-foreground break-words line-clamp-3 sm:line-clamp-2">
                {projectTitle}
              </span>
            </div>
            <div className="min-w-0 space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                Role
              </span>
              <span className="font-semibold text-foreground break-words line-clamp-3 sm:line-clamp-2">
                {roleDesignation}
              </span>
            </div>
            <div className="min-w-0 space-y-1 border-t border-border/50 pt-3 sm:col-span-2 sm:pt-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                Document type
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 max-w-full font-semibold text-foreground break-words">
                  {typeDisplay}
                </span>
                <span className="max-w-full break-all text-[11px] font-mono text-muted-foreground rounded-md bg-muted/80 px-1.5 py-0.5">
                  {docType}
                </span>
                {isMandatory && (
                  <Badge
                    variant="destructive"
                    className="h-5 shrink-0 px-1.5 text-[9px] uppercase font-bold tracking-tighter"
                  >
                    Mandatory
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {isReupload && previousFileName ? (
            <div className="rounded-lg border border-dashed border-amber-200/90 bg-amber-50/50 px-3 py-2.5 text-sm">
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-900/70">
                Current file
              </p>
              <p className="font-medium text-amber-950 break-all line-clamp-4 sm:line-clamp-2" title={previousFileName}>
                {previousFileName}
              </p>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label
              htmlFor="recruiter-doc-upload-file"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              {isReupload ? "New file" : "Select file"}
            </Label>
            <div className="relative min-w-0">
              <Input
                id="recruiter-doc-upload-file"
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="recruiter-doc-upload-file"
                className={cn(
                  "flex min-h-[7.5rem] w-full max-w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-4 transition-all sm:min-h-[8.5rem]",
                  uploadFile
                    ? isReupload
                      ? "border-amber-400/50 bg-amber-50/40"
                      : "border-primary/50 bg-primary/5"
                    : isReupload
                      ? "border-amber-200 hover:border-amber-300/80 hover:bg-amber-50/30"
                      : "border-muted-foreground/20 hover:border-primary/30 hover:bg-muted/40"
                )}
              >
                {uploadFile ? (
                  <div className="flex w-full max-w-full flex-col items-center gap-2 px-1">
                    <div
                      className={cn(
                        "shrink-0 rounded-full p-2",
                        isReupload ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary"
                      )}
                    >
                      <FileText className={cn("h-6 w-6", isReupload && "text-amber-800")} />
                    </div>
                    <span className="w-full max-w-full text-center text-sm font-medium text-foreground break-all">
                      {uploadFile.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 px-2 py-2 text-center">
                    <div
                      className={cn(
                        "shrink-0 rounded-full p-2",
                        isReupload ? "bg-amber-100/80" : "bg-muted"
                      )}
                    >
                      {isReupload ? (
                        <RefreshCw className="h-6 w-6 text-amber-700/80" />
                      ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <span className="max-w-[20rem] text-sm font-medium leading-snug text-foreground">
                      {isReupload ? "Drop replacement file or browse" : "Click to browse or drag and drop"}
                    </span>
                    <span className="max-w-[18rem] text-xs leading-relaxed text-muted-foreground">
                      PDF, JPG, PNG (max size per document type)
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 bg-muted/20 px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto sm:min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!uploadFile || isUploading}
            className={cn(
              "w-full sm:w-auto sm:min-w-[140px]",
              isReupload && "bg-amber-600 text-white hover:bg-amber-700"
            )}
          >
            {isUploading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {isReupload ? "Replacing…" : "Uploading…"}
              </>
            ) : isReupload ? (
              <>
                <Replace className="mr-2 h-4 w-4" />
                Replace document
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
