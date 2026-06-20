import VerifyAllDocumentsButton from "./VerifyAllDocumentsButton";
import VerifyAllProcessingDocumentsModal from "./VerifyAllProcessingDocumentsModal";
import { LockedProcessingActionButton } from "./LockedProcessingActionButton";
import { useProcessingActionLock } from "../context/ProcessingActionLockContext";
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
  const { isLocked } = useProcessingActionLock();
  const {
    pendingVerificationDocs,
    pendingVerificationCount,
    isVerifyingAll,
    verifyAllModalOpen,
    openVerifyAllModal,
    closeVerifyAllModal,
    handleConfirmVerifyAll,
  } = useProcessingVerifyAll(hookOptions);

  const isDisabled = disabled || isLocked;

  return (
    <>
      <LockedProcessingActionButton forceDisabled={isDisabled}>
        <VerifyAllDocumentsButton
          pendingCount={pendingVerificationCount}
          isVerifyingAll={isVerifyingAll}
          onVerifyAll={openVerifyAllModal}
          disabled={isDisabled}
        />
      </LockedProcessingActionButton>
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
