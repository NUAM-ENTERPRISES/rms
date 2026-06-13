import VerifyAllDocumentsButton from "./VerifyAllDocumentsButton";
import VerifyAllProcessingDocumentsModal from "./VerifyAllProcessingDocumentsModal";
import {
  useProcessingVerifyAll,
  type UseProcessingVerifyAllOptions,
} from "../hooks/useProcessingVerifyAll";

type VerifyAllDocumentsControlProps = UseProcessingVerifyAllOptions & {
  disabled?: boolean;
};

export default function VerifyAllDocumentsControl({
  disabled = false,
  ...hookOptions
}: VerifyAllDocumentsControlProps) {
  const {
    pendingVerificationDocs,
    pendingVerificationCount,
    isVerifyingAll,
    verifyAllModalOpen,
    openVerifyAllModal,
    closeVerifyAllModal,
    handleConfirmVerifyAll,
  } = useProcessingVerifyAll(hookOptions);

  return (
    <>
      <VerifyAllDocumentsButton
        pendingCount={pendingVerificationCount}
        isVerifyingAll={isVerifyingAll}
        onVerifyAll={openVerifyAllModal}
        disabled={disabled}
      />
      <VerifyAllProcessingDocumentsModal
        isOpen={verifyAllModalOpen}
        onClose={closeVerifyAllModal}
        documents={pendingVerificationDocs}
        onConfirm={handleConfirmVerifyAll}
        isVerifying={isVerifyingAll}
      />
    </>
  );
}
