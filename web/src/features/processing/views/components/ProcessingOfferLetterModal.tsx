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
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  Eye,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { useUploadOfferLetterMutation } from "@/services/uploadApi";

export interface OfferLetterDocument {
  id: string;
  candidateId: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  verifiedBy: string | null;
  status: "pending" | "verified" | "rejected";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  fileSize: number;
  mimeType: string;
  roleCatalogId: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  verifiedAt: string | null;
}

export interface DocumentVerification {
  id: string;
  candidateProjectMapId: string;
  documentId: string;
  roleCatalogId: string;
  status: "pending" | "verified" | "rejected";
  notes: string | null;
  rejectionReason: string | null;
  resubmissionRequested: boolean;
  document: OfferLetterDocument;
}

interface ProcessingOfferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  projectId: string;
  projectTitle: string;
  roleCatalogId: string;
  roleDesignation: string;
  documentVerification?: DocumentVerification | null;
  onVerify?: (data: { documentId: string; candidateProjectMapId: string; notes: string }) => Promise<void>;
  isVerifying?: boolean;
}

export const ProcessingOfferLetterModal: React.FC<ProcessingOfferLetterModalProps> = ({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  projectId,
  projectTitle,
  roleCatalogId,
  roleDesignation,
  documentVerification,
  onVerify,
  isVerifying = false,
}) => {
  const [notes, setNotes] = useState("");
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [isReuploadMode, setIsReuploadMode] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<DocumentVerification | null>(null);

  const [uploadOfferLetter, { isLoading: isUploading }] = useUploadOfferLetterMutation();

  // Use uploaded document if available, otherwise use the prop
  const activeDocumentVerification = uploadedDocument || documentVerification;
  const offerLetterDoc = activeDocumentVerification?.document;
  const hasOfferLetter = !!offerLetterDoc;
  const isPending = offerLetterDoc?.status === "pending";
  const isVerified = offerLetterDoc?.status === "verified";
  const isRejected = offerLetterDoc?.status === "rejected";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      setNewFile(selectedFile);
    }
  };

  const handleVerify = async () => {
    if (!activeDocumentVerification || !onVerify) return;
    try {
      await onVerify({
        documentId: activeDocumentVerification.documentId,
        candidateProjectMapId: activeDocumentVerification.candidateProjectMapId,
        notes: notes
      });
      setShowVerifyConfirm(false);
      onClose();
    } catch (error: any) {
      // Error handled by parent
    }
  };

  const handleReupload = async () => {
    if (!newFile) return;
    try {
      const response = await uploadOfferLetter({
        candidateId,
        file: newFile,
        projectId,
        roleCatalogId,
      }).unwrap();

      if (response.success && response.data) {
        toast.success("Offer letter re-uploaded successfully");
        
        // Update the component state with the new document verification data
        const newDocumentVerification: DocumentVerification = {
          id: response.data.verification.id,
          candidateProjectMapId: response.data.verification.candidateProjectMapId,
          documentId: response.data.verification.documentId,
          roleCatalogId: response.data.verification.roleCatalogId,
          status: response.data.verification.status,
          notes: response.data.verification.notes,
          rejectionReason: response.data.verification.rejectionReason,
          resubmissionRequested: response.data.verification.resubmissionRequested,
          document: response.data.document,
        };
        
        setUploadedDocument(newDocumentVerification);
        setIsReuploadMode(false);
        setNewFile(null);
        // Keep modal open to show the updated document
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.data?.message || "Failed to re-upload offer letter");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setNotes("");
      setShowPDFViewer(false);
      setShowVerifyConfirm(false);
      setIsReuploadMode(false);
      setNewFile(null);
      setUploadedDocument(null);
    }
  }, [isOpen]);

  const getStatusBadge = () => {
    if (isVerified) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5">
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    if (isRejected) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 gap-1.5">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    }
    if (isPending) {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5 animate-pulse">
          <Clock className="h-3 w-3" />
          Pending Verification
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-100 text-slate-700 border-slate-200 gap-1.5">
        <AlertTriangle className="h-3 w-3" />
        Not Uploaded
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
  <DialogContent className="sm:max-w-[550px] bg-white dark:bg-black border-slate-200 dark:border-slate-800">
    <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
      <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
        <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        Offer Letter Verification
      </DialogTitle>
      <DialogDescription className="text-slate-600 dark:text-slate-400">
        {hasOfferLetter
          ? `Review and verify the offer letter for ${candidateName}`
          : `No offer letter uploaded for ${candidateName}`}
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-5 py-4">
      {/* Project & Role Info */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
        <div className="space-y-1">
          <span className="text-muted-foreground dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Project
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 text-xs">
            {projectTitle}
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Role
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
            {roleDesignation}
          </span>
        </div>
        <div className="space-y-1 col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="text-muted-foreground dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Document Status
          </span>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
          </div>
        </div>
      </div>

      {/* Document Details or No Document State */}
      {hasOfferLetter && !isReuploadMode ? (
        <div className="space-y-4">
          {/* Document Info Card */}
          <div className="border-2 border-dashed rounded-xl p-5 bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800/50">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-950/50 rounded-lg shrink-0">
                <FileText className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {offerLetterDoc.fileName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatFileSize(offerLetterDoc.fileSize)} • Uploaded {formatDate(offerLetterDoc.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => setShowPDFViewer(true)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Document
                  </Button>
                  {isPending && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      onClick={() => setIsReuploadMode(true)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Re-upload
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Show verification info if verified */}
            {isVerified && offerLetterDoc.verifiedAt && (
              <div className="mt-4 pt-3 border-t border-orange-200 dark:border-orange-800/50">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">
                    Verified on {formatDate(offerLetterDoc.verifiedAt)}
                  </span>
                </div>
              </div>
            )}

            {/* Show rejection info if rejected */}
            {isRejected && offerLetterDoc.rejectionReason && (
              <div className="mt-4 pt-3 border-t border-orange-200 dark:border-orange-800/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-xs">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">Rejected</span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded">
                    {offerLetterDoc.rejectionReason}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Verification Notes (only for pending) */}
          {isPending && (
            <div className="space-y-2">
              <Label htmlFor="verification-notes" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Verification Notes (Optional)
              </Label>
              <Textarea
                id="verification-notes"
                placeholder="Add any notes about this verification..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] text-sm resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-orange-500/20 dark:focus:ring-orange-500/20"
              />
            </div>
          )}
        </div>
      ) : !hasOfferLetter || isReuploadMode ? (
        <div className="space-y-3">
          {isReuploadMode && (
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Upload New Offer Letter</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                onClick={() => {
                  setIsReuploadMode(false);
                  setNewFile(null);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
              newFile
                ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20"
                : "border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-600 bg-slate-50/30 dark:bg-slate-900/30 hover:bg-orange-50/30 dark:hover:bg-orange-950/20"
            )}
            onClick={() => document.getElementById("processing-offer-letter-file")?.click()}
          >
            <input
              id="processing-offer-letter-file"
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={handleFileChange}
            />
            {newFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-sm text-emerald-800 dark:text-emerald-200 truncate max-w-[250px] mx-auto">
                    {newFile.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {formatFileSize(newFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewFile(null);
                  }}
                >
                  Change File
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <Upload className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-sm text-slate-700 dark:text-slate-300">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">PDF file only (Max 10MB)</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>

    <DialogFooter className="flex items-center gap-2 flex-wrap border-t border-slate-200 dark:border-slate-800 pt-4">
      <Button 
        variant="outline" 
        onClick={onClose} 
        className="text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        Close
      </Button>

      {/* Upload button for initial upload (when no existing offer letter) */}
      {!isReuploadMode && newFile && (
        <Button
          onClick={handleReupload}
          disabled={isUploading}
          className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white text-xs gap-1.5"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Offer Letter
            </>
          )}
        </Button>
      )}

      {/* Re-upload button when in reupload mode */}
      {isReuploadMode && newFile && (
        <Button
          onClick={handleReupload}
          disabled={isUploading}
          className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white text-xs gap-1.5"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload New Version
            </>
          )}
        </Button>
      )}

      {/* Verification actions (only for pending status) */}
      {isPending && !isReuploadMode && (
        <Button
          onClick={() => setShowVerifyConfirm(true)}
          disabled={isVerifying}
          className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs gap-1.5"
        >
          <ShieldCheck className="h-4 w-4" />
          Verify Offer Letter
        </Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* Verify Confirmation Dialog */}
      <ConfirmDialog
        open={showVerifyConfirm}
        onOpenChange={setShowVerifyConfirm}
        onConfirm={handleVerify}
        title="Verify Offer Letter"
        description="Are you sure you want to verify this offer letter? This will mark the document as verified and proceed to the next processing step."
        confirmText={isVerifying ? "Verifying..." : "Confirm Verification"}
        cancelText="Cancel"
        variant="default"
      />

      {/* PDF Viewer - Show uploaded file or existing document */}
      {offerLetterDoc?.fileUrl && (
        <PDFViewer
          fileUrl={`${offerLetterDoc.fileUrl}${offerLetterDoc.fileUrl.includes("?") ? "&" : "?"}t=${Date.now()}`}
          fileName={`Offer Letter - ${candidateName}`}
          isOpen={showPDFViewer}
          onClose={() => setShowPDFViewer(false)}
        />
      )}
    </>
  );
};
