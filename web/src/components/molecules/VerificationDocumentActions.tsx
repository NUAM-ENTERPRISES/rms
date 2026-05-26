import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VerificationRecord {
  id: string;
  status?: string;
  document?: { id: string; docType?: string; fileName?: string; fileUrl?: string };
  candidateProjectMapId?: string;
  rejectionReason?: string | null;
}

export interface VerificationDocumentActionsProps {
  verification: VerificationRecord | null | undefined;
  displayedStatus?: string;
  canVerifyDocuments: boolean;
  canRequestResubmission: boolean;
  isDocumentationReviewed?: boolean;
  documentationStatus?: string;
  isClientRevisionRequested?: boolean;
  onVerify: (verification: VerificationRecord) => void;
  onReject: (verification: VerificationRecord) => void;
  onRequestResubmission: (verification: VerificationRecord) => void;
  /** Shown when no verification exists yet (regular docs only) */
  emptyActions?: React.ReactNode;
}

export function VerificationDocumentActions({
  verification,
  displayedStatus,
  canVerifyDocuments,
  canRequestResubmission,
  isDocumentationReviewed = false,
  documentationStatus,
  isClientRevisionRequested = false,
  onVerify,
  onReject,
  onRequestResubmission,
  emptyActions,
}: VerificationDocumentActionsProps) {
  if (isDocumentationReviewed && !isClientRevisionRequested) {
    return (
      <Badge
        className={cn(
          "font-semibold text-xs",
          documentationStatus === "Documents Verified" ||
            documentationStatus === "Document verified"
            ? "bg-green-500 text-white"
            : documentationStatus === "Documents Rejected" ||
                documentationStatus === "Document rejected"
              ? "bg-red-500 text-white"
              : "bg-slate-100 text-slate-700"
        )}
      >
        {documentationStatus || "Reviewed"}
      </Badge>
    );
  }

  if (!verification) {
    return emptyActions ? <>{emptyActions}</> : null;
  }

  if (!canVerifyDocuments || !displayedStatus) {
    return null;
  }

  if (displayedStatus === "pending") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-3"
          onClick={() => onVerify(verification)}
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Verify
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-red-600 text-red-600 hover:bg-red-50 px-3"
          onClick={() => onReject(verification)}
        >
          <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
        </Button>
      </div>
    );
  }

  if (displayedStatus === "verified") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-8 border-red-600 text-red-600 hover:bg-red-50 px-3"
        onClick={() => onReject(verification)}
      >
        <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
      </Button>
    );
  }

  if (
    displayedStatus === "rejected" ||
    displayedStatus === "resubmission_required" ||
    displayedStatus === "resubmitted"
  ) {
    if (displayedStatus === "resubmission_required") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-3"
                  disabled
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Verify
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-red-600 text-red-600 hover:bg-red-50 px-3"
                  disabled
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Please wait for resubmission of the document</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-3"
          onClick={() => onVerify(verification)}
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Verify
        </Button>
        {displayedStatus === "resubmitted" && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-red-600 text-red-600 hover:bg-red-50 px-3"
            onClick={() => onReject(verification)}
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
          </Button>
        )}
        {canRequestResubmission && displayedStatus === "rejected" && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-blue-600 text-blue-600 hover:bg-blue-50 px-3"
            onClick={() => onRequestResubmission(verification)}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Resubmit
          </Button>
        )}
      </div>
    );
  }

  return null;
}

export default VerificationDocumentActions;
