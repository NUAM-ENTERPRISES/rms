import { useState, useEffect } from "react";
import { BellRing, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReviewStatusChangeRequestModal } from "./ReviewStatusChangeRequestModal";
import type { PendingStatusChangeRequest } from "@/features/candidates/api";
import { getStatusChangeRequestDisplay } from "@/features/candidates/utils/statusChangeRequestDisplay";
import { resolveCountryRestrictionFromRequest } from "@/features/processing/utils/countryRestrictionDisplay";

interface PendingStatusChangeRequestBannerProps {
  request: PendingStatusChangeRequest;
  candidateId: string;
  projectId: string;
  candidateProjectMapId?: string;
  projectTitle?: string;
  countryName?: string;
  projectCountryCode?: string;
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
  projectTitle,
  countryName,
  projectCountryCode,
  currentStatus,
  previousStatus,
  defaultExpanded = false,
  onReviewed,
}: PendingStatusChangeRequestBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(defaultExpanded);
  const { headline } = getStatusChangeRequestDisplay(request);
  const countryRestriction = resolveCountryRestrictionFromRequest(request, {
    code: projectCountryCode,
    name: countryName,
  });

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
                Pending {headline.toLowerCase()} from{" "}
                {request.requester?.name ?? "recruiter"}
              </p>
              {countryRestriction ? (
                <p className="mt-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-100/80 px-3 py-2 text-xs font-medium text-amber-950">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    Includes a country restriction for{" "}
                    <span className="font-semibold">
                      {countryRestriction.countryName}
                    </span>
                    . Review carefully before approving.
                  </span>
                </p>
              ) : null}
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
        projectTitle={projectTitle}
        countryName={countryName}
        projectCountryCode={projectCountryCode}
        stepKey={request.stepKey}
        currentStatus={currentStatus}
        previousStatus={previousStatus}
        onReviewed={onReviewed}
      />
    </>
  );
}
