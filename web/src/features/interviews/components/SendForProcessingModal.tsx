import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Briefcase, Eye, FileText, Loader2, Send, Upload, User, Users } from "lucide-react";
import { OfferLetterBadge } from "./OfferLetterBadge";
import { OfferLetterUploadModal } from "@/features/documents/components/OfferLetterUploadModal";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { useCan, useHasRole } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import {
  canShowOfferLetterUploadButton,
  getOfferLetterUrlFromUpload,
} from "../utils/offerLetter";

export type SendForProcessingCandidate = {
  interviewId: string;
  candidateId: string;
  candidateName: string;
  projectId: string;
  projectTitle: string;
  roleCatalogId: string;
  roleDesignation: string;
  recruiterName?: string | null;
  hasOfferLetter?: boolean;
  offerLetterUploadedBy?: string | null;
  existingFileUrl?: string;
};

interface SendForProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  mode: "single" | "bulk";
  candidates: SendForProcessingCandidate[];
  onOfferLetterUploaded?: (interviewId: string, fileUrl: string) => void;
}

type OfferLetterModalTarget = SendForProcessingCandidate;

export function SendForProcessingModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  mode,
  candidates,
  onOfferLetterUploaded,
}: SendForProcessingModalProps) {
  const canUploadDocuments = useCan("write:documents");
  const canUploadInterviews = useCan("write:interviews");
  const canWriteCandidates = useCan("write:candidates");
  const isInterviewCoordinator = useHasRole("Interview Coordinator");
  const isRecruiter = useHasRole("Recruiter");
  const canUploadOfferLetter =
    canUploadDocuments ||
    canWriteCandidates ||
    isRecruiter ||
    (isInterviewCoordinator && canUploadInterviews);

  const [offerLetterOverrides, setOfferLetterOverrides] = useState<Record<string, string>>({});
  const [uploadTarget, setUploadTarget] = useState<OfferLetterModalTarget | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({ isOpen: false, fileUrl: "", fileName: "" });

  const count = candidates.length;

  useEffect(() => {
    if (!isOpen) {
      setOfferLetterOverrides({});
      setUploadTarget(null);
    }
  }, [isOpen]);

  const getCandidateOfferState = (candidate: SendForProcessingCandidate) => {
    const overrideUrl = offerLetterOverrides[candidate.interviewId];
    const fileUrl = overrideUrl || candidate.existingFileUrl;
    const hasOfferLetter = candidate.hasOfferLetter || !!overrideUrl;
    return { fileUrl, hasOfferLetter };
  };

  const activePdfUrl = useMemo(() => {
    if (!pdfViewer.isOpen || !pdfViewer.fileUrl) return "";
    return `${pdfViewer.fileUrl}${pdfViewer.fileUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }, [pdfViewer.isOpen, pdfViewer.fileUrl]);

  const handleUploadSuccess = (uploadData?: Parameters<typeof getOfferLetterUrlFromUpload>[0]) => {
    const fileUrl = getOfferLetterUrlFromUpload(uploadData);
    if (uploadTarget && fileUrl) {
      setOfferLetterOverrides((prev) => ({
        ...prev,
        [uploadTarget.interviewId]: fileUrl,
      }));
      onOfferLetterUploaded?.(uploadTarget.interviewId, fileUrl);
    }
    setUploadTarget(null);
  };

  const renderOfferLetterActions = (candidate: SendForProcessingCandidate, compact = false) => {
    const { fileUrl, hasOfferLetter } = getCandidateOfferState(candidate);

    return (
      <div className={cn("flex items-center gap-2", compact ? "shrink-0" : "flex-wrap")}>
        {hasOfferLetter ? (
          <OfferLetterBadge
            size={compact ? "xs" : "sm"}
            align={compact ? "end" : "start"}
            uploaderName={candidate.offerLetterUploadedBy}
          />
        ) : (
          <Badge
            variant="secondary"
            className={cn(
              "uppercase font-bold border-none bg-amber-100 text-amber-700",
              compact ? "text-[9px]" : "text-[10px]",
            )}
          >
            Not uploaded
          </Badge>
        )}
        {hasOfferLetter && fileUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={compact ? "h-7 w-7 p-0" : "h-8 gap-1.5"}
            onClick={() =>
              setPdfViewer({
                isOpen: true,
                fileUrl,
                fileName: `Offer Letter - ${candidate.candidateName}`,
              })
            }
            title="View offer letter"
          >
            <Eye className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            {!compact && "View"}
          </Button>
        )}
        {canShowOfferLetterUploadButton({
          isRecruiter,
          hasOfferLetter,
          canUpload: canUploadOfferLetter,
        }) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              compact ? "h-7 w-7 p-0" : "h-8 gap-1.5",
              "text-indigo-700 border-indigo-200 hover:bg-indigo-50",
            )}
            onClick={() => setUploadTarget(candidate)}
            title="Upload offer letter"
          >
            <Upload className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            {!compact && "Upload"}
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  Send for Processing
                </DialogTitle>
                <DialogDescription className="text-slate-500 mt-1">
                  {mode === "single"
                    ? "This candidate will appear on the Ready for Processing queue for the processing team."
                    : `${count} candidate${count === 1 ? "" : "s"} will be sent to the Ready for Processing queue.`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {mode === "single" && candidates[0] ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{candidates[0].candidateName}</p>
                    <p className="text-sm text-slate-500">{candidates[0].roleDesignation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{candidates[0].projectTitle}</span>
                </div>
                {candidates[0].recruiterName && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="text-slate-500">Recruiter:</span>
                    <span className="font-medium text-slate-800 truncate">
                      {candidates[0].recruiterName}
                    </span>
                  </div>
                )}
                <div className="rounded-xl border border-slate-100 bg-white p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-700">Offer letter</span>
                  </div>
                  {renderOfferLetterActions(candidates[0])}
                </div>
              </div>
            ) : (
              <ScrollArea className="max-h-56 rounded-2xl border border-slate-100 bg-slate-50/80">
                <div className="divide-y divide-slate-100 p-1">
                  {candidates.map((item) => (
                    <div key={item.interviewId} className="px-3 py-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {item.candidateName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {item.projectTitle} · {item.roleDesignation}
                          </p>
                          {item.recruiterName && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              Recruiter:{" "}
                              <span className="font-medium text-slate-700">{item.recruiterName}</span>
                            </p>
                          )}
                        </div>
                        {renderOfferLetterActions(item, true)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              Managers and the processing team will be notified once you confirm. Offer letter upload is optional before sending.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onConfirm}
              disabled={isLoading || count === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send for Processing
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {uploadTarget && (
        <OfferLetterUploadModal
          isOpen={!!uploadTarget}
          onClose={() => setUploadTarget(null)}
          candidateId={uploadTarget.candidateId}
          candidateName={uploadTarget.candidateName}
          projectId={uploadTarget.projectId}
          projectTitle={uploadTarget.projectTitle}
          roleCatalogId={uploadTarget.roleCatalogId}
          roleDesignation={uploadTarget.roleDesignation}
          isAlreadyUploaded={
            !isRecruiter && getCandidateOfferState(uploadTarget).hasOfferLetter
          }
          existingFileUrl={getCandidateOfferState(uploadTarget).fileUrl}
          onSuccess={handleUploadSuccess}
        />
      )}

      <PDFViewer
        isOpen={pdfViewer.isOpen}
        onClose={() => setPdfViewer({ isOpen: false, fileUrl: "", fileName: "" })}
        fileUrl={activePdfUrl}
        fileName={pdfViewer.fileName}
      />
    </>
  );
}
