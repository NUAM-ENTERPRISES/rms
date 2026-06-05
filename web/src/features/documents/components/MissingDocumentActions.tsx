import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Send } from "lucide-react";
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
  canUpload: boolean;
  canRequest: boolean;
  onUpload: () => void;
  onRequested?: () => void;
}

export function MissingDocumentActions({
  requirement,
  candidateProjectMapId,
  roleCatalogId,
  canUpload,
  canRequest,
  onUpload,
  onRequested,
}: MissingDocumentActionsProps) {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const documentLabel =
    requirement.documentName || requirement.docType;
  const requestPending = Boolean(requirement.uploadRequested);

  if (requestPending) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-semibold"
        >
          Requested from recruiter
        </Badge>
        {canUpload ? (
          <Button
            size="sm"
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white px-3"
            onClick={onUpload}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" aria-hidden />
            Upload
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canUpload ? (
          <Button
            size="sm"
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white px-3"
            onClick={onUpload}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" aria-hidden />
            Upload
          </Button>
        ) : null}
        {canRequest ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-blue-300 text-blue-700 hover:bg-blue-50 px-3"
            onClick={() => setIsRequestModalOpen(true)}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" aria-hidden />
            Request for resubmission
          </Button>
        ) : null}
      </div>

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
