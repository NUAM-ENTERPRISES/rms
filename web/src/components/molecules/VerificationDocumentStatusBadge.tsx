import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerificationDocumentStatusBadgeProps {
  status?: string;
  rejectionReason?: string | null;
}

export function getVerificationStatusBadge(status: string) {
  switch (status) {
    case "verified":
      return (
        <Badge className="bg-green-500 text-white font-semibold whitespace-nowrap">
          Verified
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-500 text-white font-semibold whitespace-nowrap">
          Rejected
        </Badge>
      );
    case "resubmission_required":
      return (
        <Badge className="bg-amber-500 text-white font-semibold text-center leading-tight py-1">
          Waiting for re-submission
        </Badge>
      );
    case "resubmitted":
      return (
        <Badge className="bg-blue-500 text-white font-semibold whitespace-nowrap">
          Resubmitted
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="whitespace-nowrap">
          Pending
        </Badge>
      );
    case "client_revision_requested":
      return (
        <Badge className="bg-orange-500 text-white font-semibold whitespace-nowrap">
          Revision Req.
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="whitespace-nowrap">
          Unknown
        </Badge>
      );
  }
}

export function VerificationDocumentStatusBadge({
  status,
  rejectionReason,
}: VerificationDocumentStatusBadgeProps) {
  if (!status) {
    return <Badge variant="outline">Not Submitted</Badge>;
  }

  const showReason =
    rejectionReason &&
    (status === "resubmission_required" || status === "rejected");

  return (
    <div className="space-y-1">
      {getVerificationStatusBadge(status)}
      {showReason ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-red-600 font-medium italic mt-1 truncate max-w-[200px] cursor-help">
                Reason: {rejectionReason}
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">Reason: {rejectionReason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}

export default VerificationDocumentStatusBadge;
