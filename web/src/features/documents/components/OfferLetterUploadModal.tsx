import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Upload, FileText, Loader2, CheckCircle2, Eye } from "lucide-react";
import { useUploadOfferLetterMutation, UploadResult } from "@/services/uploadApi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PDFViewer } from "@/components/molecules/PDFViewer";

interface OfferLetterUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  projectId: string;
  projectTitle: string;
  roleCatalogId: string;
  roleDesignation: string;
  onSuccess?: (uploadData?: UploadResult) => void,
  isAlreadyUploaded?: boolean;
  existingFileUrl?: string;
}

export const OfferLetterUploadModal: React.FC<OfferLetterUploadModalProps> = ({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  projectId,
  projectTitle,
  roleCatalogId,
  roleDesignation,
  onSuccess,
  isAlreadyUploaded,
  existingFileUrl,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReuploading, setIsReuploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);

  const [uploadOfferLetter] = useUploadOfferLetterMutation();

  const handleConfirmReupload = () => {
    setIsReuploading(true);
    setShowConfirm(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await uploadOfferLetter({
        candidateId,
        file,
        projectId,
        roleCatalogId,
      }).unwrap();

      if (response.success) {
        toast.success("Offer letter uploaded successfully");
        if (onSuccess) onSuccess(response.data);
        onClose();
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.data?.message || "Failed to upload offer letter");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setIsReuploading(false);
      setShowConfirm(false);
      setShowPDFViewer(false);
    }
  }, [isOpen]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <FileText className="h-6 w-6 text-indigo-600" />
              Upload Offer Letter
            </DialogTitle>
            <DialogDescription>
              Upload the signed offer letter for <strong>{candidateName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                  Project
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 text-xs">
                  {projectTitle}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                  Role
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                  {roleDesignation}
                </span>
              </div>
              <div className="space-y-1 col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                  Document Type
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-xs">OFFER LETTER</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-letter-file">
                {isAlreadyUploaded && !isReuploading ? "Current Offer Letter" : "Choose File (PDF only)"}
              </Label>

              {isAlreadyUploaded && !isReuploading ? (
                <div className="border-2 border-dashed rounded-xl p-8 text-center bg-emerald-50/20 border-emerald-200">
                  <div className="flex flex-col items-center gap-3">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider">
                      Offer Letter Uploaded
                    </Badge>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        An offer letter has already been successfully uploaded for this candidate.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => existingFileUrl && setShowPDFViewer(true)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Document
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => setShowConfirm(true)}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload New Version
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                    file ? "border-emerald-300 bg-emerald-50/30 dark:bg-emerald-900/10" : "border-slate-200 hover:border-indigo-400 bg-slate-50/30 hover:bg-slate-50"
                  )}
                  onClick={() => document.getElementById("offer-letter-file")?.click()}
                >
                  <input
                    id="offer-letter-file"
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={handleFileChange}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm text-emerald-800 dark:text-emerald-400 truncate max-w-[250px] mx-auto text-xs">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2) } MB
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <Upload className="h-8 w-8 text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm text-slate-700 dark:text-slate-300">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PDF file only (Max 10MB)</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center gap-3">
            {isReuploading && !file && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReuploading(false)}
                className="text-xs mr-auto"
              >
                Back to Current
              </Button>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <Button variant="outline" onClick={onClose} disabled={isUploading} className="text-xs">
                {(isAlreadyUploaded && !isReuploading) ? "Close" : "Cancel"}
              </Button>
              {(!isAlreadyUploaded || isReuploading) && (
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || isUploading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] text-xs"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {isReuploading ? "Upload New PDF" : "Upload PDF"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleConfirmReupload}
        title="Are you sure?"
        description="Are you sure you want to re-upload? The existing offer letter will be removed."
        confirmText="Confirm Re-upload"
        cancelText="Cancel"
        variant="destructive"
      />

      {existingFileUrl && (
        <PDFViewer
          fileUrl={`${existingFileUrl}${existingFileUrl.includes('?') ? '&' : '?'}t=${Date.now()}`}
          fileName={`Offer Letter - ${candidateName}`}
          isOpen={showPDFViewer}
          onClose={() => setShowPDFViewer(false)}
        />
      )}
    </>
  );
};
