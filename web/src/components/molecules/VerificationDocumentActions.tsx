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
  canRejectDocuments: boolean;
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

function NoDocumentPermissionBadge({ message }: { message: string }) {
  return (
    <Badge
      variant="outline"
      className="max-w-[220px] whitespace-normal text-left text-[11px] font-medium leading-snug text-amber-800 border-amber-200 bg-amber-50"
    >
      {message}
    </Badge>
  );
}

function getNoPermissionMessage(
  displayedStatus: string,
  canVerifyDocuments: boolean,
  canRejectDocuments: boolean,
  canRequestResubmission: boolean,
): string | null {
  if (displayedStatus === "pending") {
    if (!canVerifyDocuments && !canRejectDocuments) {
      return "No permission to verify or reject documents";
    }
    return null;
  }

  if (displayedStatus === "verified") {
    if (!canRejectDocuments) {
      return "No permission to reject documents";
    }
    return null;
  }

  if (displayedStatus === "resubmission_required") {
    if (!canVerifyDocuments && !canRejectDocuments) {
      return "No permission to verify or reject documents";
    }
    return null;
  }

  if (
    displayedStatus === "rejected" ||
    displayedStatus === "resubmitted"
  ) {
    const canAct =
      canVerifyDocuments ||
      (canRejectDocuments && displayedStatus === "resubmitted") ||
      (canRequestResubmission && displayedStatus === "rejected");
    if (!canAct) {
      return "No permission to verify or reject documents";
    }
  }

  return null;
}

export function VerificationDocumentActions({
  verification,
  displayedStatus,
  canVerifyDocuments,
  canRejectDocuments,
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
              : "bg-muted text-foreground"
        )}
      >
        {documentationStatus || "Reviewed"}
      </Badge>
    );
  }

  if (!verification) {
    return emptyActions ? <>{emptyActions}</> : null;
  }

  if (!displayedStatus) {
    return null;
  }

  const noPermissionMessage = getNoPermissionMessage(
    displayedStatus,
    canVerifyDocuments,
    canRejectDocuments,
    canRequestResubmission,
  );

  if (noPermissionMessage) {
    return <NoDocumentPermissionBadge message={noPermissionMessage} />;
  }

  if (!canVerifyDocuments && !canRejectDocuments && !canRequestResubmission) {
    return (
      <NoDocumentPermissionBadge message="No permission to verify or reject documents" />
    );
  }

  if (displayedStatus === "pending") {
    return (
      <div className="flex gap-2">
        {canVerifyDocuments ? (
          <Button
            size="sm"
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-3"
            onClick={() => onVerify(verification)}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Verify
          </Button>
        ) : null}
        {canRejectDocuments ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-red-600 text-red-600 hover:bg-red-50 px-3"
            onClick={() => onReject(verification)}
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
          </Button>
        ) : null}
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
                {canVerifyDocuments ? (
                  <Button
                    size="sm"
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-3"
                    disabled
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Verify
                  </Button>
                ) : null}
                {canRejectDocuments ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-red-600 text-red-600 hover:bg-red-50 px-3"
                    disabled
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                  </Button>
                ) : null}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Please wait for resubmission of the document</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    const showVerify = canVerifyDocuments;
    const showReject =
      canRejectDocuments && displayedStatus === "resubmitted";
    const showResubmit =
      canRequestResubmission && displayedStatus === "rejected";

    return (
      <div className="flex gap-2">
        {showVerify ? (
          <Button
            size="sm"
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-3"
            onClick={() => onVerify(verification)}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Verify
          </Button>
        ) : null}
        {showReject ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-red-600 text-red-600 hover:bg-red-50 px-3"
            onClick={() => onReject(verification)}
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
          </Button>
        ) : null}
        {showResubmit ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-blue-600 text-blue-600 hover:bg-blue-50 px-3"
            onClick={() => onRequestResubmission(verification)}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Resubmit
          </Button>
        ) : null}
      </div>
    );
  }

  return null;
}

export default VerificationDocumentActions;
