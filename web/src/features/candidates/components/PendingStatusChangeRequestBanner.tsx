import { useState, useEffect } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReviewStatusChangeRequestModal } from "./ReviewStatusChangeRequestModal";
import type { PendingStatusChangeRequest } from "@/features/candidates/api";
import { getStatusChangeTargetLabel } from "@/features/candidates/utils/candidateProjectPipelineBlocked";

interface PendingStatusChangeRequestBannerProps {
  request: PendingStatusChangeRequest;
  candidateId: string;
  projectId: string;
  candidateProjectMapId?: string;
  currentStatus?: string;
  previousStatus?: { name: string; label: string };
  defaultExpanded?: boolean;
  onReviewed?: () => void;
}

export function PendingStatusChangeRequestBanner({
  request,
  candidateId,
  projectId,
  candidateProjectMapId,
  currentStatus,
  previousStatus,
  defaultExpanded = false,
  onReviewed,
}: PendingStatusChangeRequestBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(defaultExpanded);
  const statusLabel = getStatusChangeTargetLabel(request.requestedStatus);

  useEffect(() => {
    if (defaultExpanded) {
      setIsModalOpen(true);
    }
  }, [defaultExpanded]);

  return (
    <>
      <div
        className={cn(
          "rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm",
          "animate-pulse",
        )}
        role="alert"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white">
              <BellRing className="h-5 w-5 text-amber-600" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Pending {statusLabel} request from{" "}
                {request.requester?.name ?? "recruiter"}
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Click "Review Request" to approve or reject.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="shrink-0 bg-amber-600 hover:bg-amber-700"
          >
            Review Request
          </Button>
        </div>
      </div>

      <ReviewStatusChangeRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        request={request}
        candidateId={candidateId}
        projectId={projectId}
        candidateProjectMapId={candidateProjectMapId}
        currentStatus={currentStatus}
        previousStatus={previousStatus}
        onReviewed={onReviewed}
      />
    </>
  );
}
