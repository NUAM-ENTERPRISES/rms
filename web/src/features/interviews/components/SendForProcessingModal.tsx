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
import { Briefcase, FileText, Loader2, Send, User } from "lucide-react";
import { OfferLetterBadge } from "./OfferLetterBadge";

export type SendForProcessingCandidate = {
  interviewId: string;
  candidateName: string;
  projectTitle: string;
  roleDesignation: string;
  hasOfferLetter?: boolean;
  offerLetterUploadedBy?: string | null;
};

interface SendForProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  mode: "single" | "bulk";
  candidates: SendForProcessingCandidate[];
}

export function SendForProcessingModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  mode,
  candidates,
}: SendForProcessingModalProps) {
  const count = candidates.length;

  return (
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
              <div className="flex items-start gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                {candidates[0].hasOfferLetter ? (
                  <OfferLetterBadge uploaderName={candidates[0].offerLetterUploadedBy} />
                ) : (
                  <>
                    <span className="text-sm text-slate-600">Offer letter</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase font-bold border-none bg-amber-100 text-amber-700"
                    >
                      Not uploaded
                    </Badge>
                  </>
                )}
              </div>
            </div>
          ) : (
            <ScrollArea className="max-h-56 rounded-2xl border border-slate-100 bg-slate-50/80">
              <div className="divide-y divide-slate-100 p-1">
                {candidates.map((item) => (
                  <div key={item.interviewId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{item.candidateName}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {item.projectTitle} · {item.roleDesignation}
                      </p>
                    </div>
                    {item.hasOfferLetter ? (
                      <OfferLetterBadge
                        size="xs"
                        align="end"
                        uploaderName={item.offerLetterUploadedBy}
                      />
                    ) : (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[9px] uppercase font-bold border-none bg-slate-100 text-slate-600"
                      >
                        No OL
                      </Badge>
                    )}
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
  );
}
