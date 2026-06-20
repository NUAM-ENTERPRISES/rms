import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getPendingVerificationDocuments,
  verifyAllPendingProcessingDocuments,
  type ProcessingDocumentMap,
} from "../utils/processingDocumentVerifyAll";

export interface UseProcessingVerifyAllOptions {
  processingStepId?: string;
  requiredDocuments: Array<{ docType: string; label?: string }>;
  candidateDocsByDocType: ProcessingDocumentMap;
  processingDocsByDocType: ProcessingDocumentMap;
  verifyProcessingDocument: (args: {
    documentId: string;
    processingStepId: string;
    notes?: string;
  }) => { unwrap: () => Promise<unknown> };
  refetch: () => void | Promise<unknown>;
  stepLabel?: string;
}

export function useProcessingVerifyAll({
  processingStepId,
  requiredDocuments,
  candidateDocsByDocType,
  processingDocsByDocType,
  verifyProcessingDocument,
  refetch,
  stepLabel,
}: UseProcessingVerifyAllOptions) {
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [verifyAllModalOpen, setVerifyAllModalOpen] = useState(false);

  const pendingVerificationDocs = useMemo(
    () =>
      getPendingVerificationDocuments(
        requiredDocuments,
        candidateDocsByDocType,
        processingDocsByDocType,
      ),
    [requiredDocuments, candidateDocsByDocType, processingDocsByDocType],
  );

  const openVerifyAllModal = () => {
    if (!processingStepId || pendingVerificationDocs.length === 0) {
      toast("No documents available to verify. Upload documents first.");
      return;
    }

    setVerifyAllModalOpen(true);
  };

  const closeVerifyAllModal = () => {
    if (!isVerifyingAll) {
      setVerifyAllModalOpen(false);
    }
  };

  const handleConfirmVerifyAll = async (notes: string) => {
    if (!processingStepId || pendingVerificationDocs.length === 0) {
      toast("No documents available to verify. Upload documents first.");
      return;
    }

    setIsVerifyingAll(true);
    try {
      const { verifiedCount, failedCount } =
        await verifyAllPendingProcessingDocuments({
          pendingDocs: pendingVerificationDocs,
          processingStepId,
          verifyDocument: (args) => verifyProcessingDocument(args).unwrap(),
          notesPrefix: stepLabel,
          sharedNotes: notes,
        });

      if (verifiedCount > 0) {
        toast.success(
          `Verified ${verifiedCount} document${verifiedCount === 1 ? "" : "s"}`,
        );
      }

      if (failedCount > 0) {
        toast.error(
          `Failed to verify ${failedCount} document${failedCount === 1 ? "" : "s"}`,
        );
      }

      setVerifyAllModalOpen(false);
      await refetch();
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data &&
        typeof err.data.message === "string"
          ? err.data.message
          : "Failed to verify documents";
      toast.error(message);
    } finally {
      setIsVerifyingAll(false);
    }
  };

  return {
    pendingVerificationDocs,
    pendingVerificationCount: pendingVerificationDocs.length,
    isVerifyingAll,
    verifyAllModalOpen,
    openVerifyAllModal,
    closeVerifyAllModal,
    handleConfirmVerifyAll,
  };
}
