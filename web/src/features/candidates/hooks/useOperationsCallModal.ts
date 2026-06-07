import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useLogOperationsCallMutation } from "@/services/candidatesApi";
import {
  canLogOperationsCall,
  getOperationsCallAttempts,
  getOperationsFollowUpStage,
  getOperationsHandlerAssignment,
  type OperationsFollowUpAssignment,
} from "@/features/candidates/utils/operations-follow-up.util";

type OperationsCallCandidate = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  recruiterAssignments?: OperationsFollowUpAssignment[];
};

type CallModalState = {
  candidate: OperationsCallCandidate;
  mode: "log" | "history";
} | null;

export function useOperationsCallModal(options: {
  operationsUserId?: string;
  onLogged?: () => void;
}) {
  const { operationsUserId, onLogged } = options;
  const [callModalState, setCallModalState] = useState<CallModalState>(null);
  const [logOperationsCall, { isLoading: isLoggingCall }] =
    useLogOperationsCallMutation();

  const resolveAssignment = useCallback(
    (candidate: OperationsCallCandidate) =>
      getOperationsHandlerAssignment(
        candidate.recruiterAssignments,
        operationsUserId,
      ),
    [operationsUserId],
  );

  const openLogCall = useCallback((candidate: OperationsCallCandidate) => {
    setCallModalState({ candidate, mode: "log" });
  }, []);

  const openCallHistory = useCallback((candidate: OperationsCallCandidate) => {
    setCallModalState({ candidate, mode: "history" });
  }, []);

  const closeCallModal = useCallback(() => {
    setCallModalState(null);
  }, []);

  const handleLogOperationsCall = useCallback(
    async (note: string) => {
      if (!callModalState?.candidate.id) {
        return;
      }

      try {
        await logOperationsCall({ id: callModalState.candidate.id, note }).unwrap();
        toast.success("Call logged successfully");
        closeCallModal();
        onLogged?.();
      } catch (error: unknown) {
        const message =
          error &&
          typeof error === "object" &&
          "data" in error &&
          error.data &&
          typeof error.data === "object" &&
          "message" in error.data &&
          typeof error.data.message === "string"
            ? error.data.message
            : "Failed to log call";
        toast.error(message);
      }
    },
    [callModalState, closeCallModal, logOperationsCall, onLogged],
  );

  const callModalCandidate = callModalState?.candidate;
  const assignment = callModalCandidate
    ? resolveAssignment(callModalCandidate)
    : undefined;
  const logCallAttempts = getOperationsCallAttempts(assignment);
  const followUpStage = getOperationsFollowUpStage(assignment);
  const canSubmitCallLog =
    callModalState?.mode === "log" &&
    canLogOperationsCall(followUpStage, logCallAttempts);
  const logCallCandidateName = callModalCandidate
    ? `${callModalCandidate.firstName || ""} ${callModalCandidate.lastName || ""}`.trim() ||
      "Selected candidate"
    : "";

  return {
    callModalState,
    openLogCall,
    openCallHistory,
    closeCallModal,
    resolveAssignment,
    isLoggingCall,
    handleLogOperationsCall,
    callModalCandidate,
    logCallAttempts,
    logCallNextAttempt: logCallAttempts + 1,
    canSubmitCallLog,
    logCallCandidateName,
  };
}
