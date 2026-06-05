import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { RequestMissingDocumentModal } from "./RequestMissingDocumentModal";

export interface MissingDocumentRequirement {
  docType: string;
  documentName?: string;
  uploadRequested?: boolean;
  uploadRequestReason?: string;
}

export interface MissingDocumentActionsProps {
  requirement: MissingDocumentRequirement;
  candidateProjectMapId: string;
  roleCatalogId?: string;
  canRequest: boolean;
  onRequested?: () => void;
}

export function MissingDocumentActions({
  requirement,
  candidateProjectMapId,
  roleCatalogId,
  canRequest,
  onRequested,
}: MissingDocumentActionsProps) {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const documentLabel =
    requirement.documentName || requirement.docType;
  const requestPending = Boolean(requirement.uploadRequested);

  if (requestPending) {
    return (
      <div className="flex flex-col items-end gap-1.5 max-w-[220px]">
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-semibold"
        >
          Requested from recruiter
        </Badge>
        {requirement.uploadRequestReason ? (
          <p className="text-right text-[10px] leading-snug text-slate-600 italic line-clamp-3">
            {requirement.uploadRequestReason}
          </p>
        ) : null}
      </div>
    );
  }

  if (!canRequest) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 border-blue-300 text-blue-700 hover:bg-blue-50 px-3"
        onClick={() => setIsRequestModalOpen(true)}
      >
        <Send className="h-3.5 w-3.5 mr-1.5" aria-hidden />
        Request for resubmission
      </Button>

      <RequestMissingDocumentModal
        isOpen={isRequestModalOpen}
        onOpenChange={setIsRequestModalOpen}
        candidateProjectMapId={candidateProjectMapId}
        docType={requirement.docType}
        documentLabel={documentLabel}
        roleCatalogId={roleCatalogId}
        onSuccess={onRequested}
      />
    </>
  );
}
