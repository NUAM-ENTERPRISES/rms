import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { TransferToRecruiterPayload } from "@/components/molecules/TransferCandidateModal";
import {
  useLogOperationsCallMutation,
  useMarkOperationsNotInterestedMutation,
  useTransferCandidateToRecruiterMutation,
} from "@/services/candidatesApi";
import {
  canLogOperationsCall,
  getOperationsCallAttempts,
  getOperationsFollowUpStage,
  getOperationsHandlerAssignment,
  getPrimaryRecruiterName,
  type OperationsFollowUpAssignment,
  type OperationsFollowUpStage,
} from "@/features/candidates/utils/operations-follow-up.util";

type OperationsCallCandidate = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  currentStatus?: { statusName?: string };
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
  const [transferCandidateToRecruiter, { isLoading: isTransferring }] =
    useTransferCandidateToRecruiterMutation();
  const [markOperationsNotInterested, { isLoading: isMarkingNotInterested }] =
    useMarkOperationsNotInterestedMutation();

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
    async (payload: {
      note: string;
      usedPhone: boolean;
      usedWhatsapp: boolean;
    }) => {
      if (!callModalState?.candidate.id) {
        return;
      }

      try {
        const result = await logOperationsCall({
          id: callModalState.candidate.id,
          ...payload,
        }).unwrap();

        if (result.data?.markedJunk) {
          toast.success("Call logged — candidate marked as junk");
        } else if (result.data?.autoAdvancedToWeekOne) {
          toast.success("Call logged — moved to 1 Week follow-up automatically");
        } else {
          toast.success("Call logged successfully");
        }
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

  const handleInterestedReassign = useCallback(
    async (
      callPayload: {
        note: string;
        usedPhone: boolean;
        usedWhatsapp: boolean;
      },
      transferPayload: TransferToRecruiterPayload,
    ) => {
      if (!callModalState?.candidate.id) {
        return;
      }

      try {
        const reason = callPayload.note.trim()
          ? `${transferPayload.reason.trim()}\n\nContact note: ${callPayload.note.trim()}`
          : transferPayload.reason.trim();

        await transferCandidateToRecruiter({
          id: callModalState.candidate.id,
          ...transferPayload,
          reason,
        }).unwrap();

        toast.success("Candidate reassigned to recruiter");
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
            : "Failed to reassign candidate";
        toast.error(message);
      }
    },
    [
      callModalState,
      closeCallModal,
      onLogged,
      transferCandidateToRecruiter,
    ],
  );

  const handleNotInterestedJunk = useCallback(
    async (payload: {
      note: string;
      usedPhone: boolean;
      usedWhatsapp: boolean;
    }) => {
      if (!callModalState?.candidate.id) {
        return;
      }

      try {
        await markOperationsNotInterested({
          id: callModalState.candidate.id,
          ...payload,
        }).unwrap();

        toast.success("Candidate marked as not interested (junk)");
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
            : "Failed to mark candidate as junk";
        toast.error(message);
      }
    },
    [callModalState, closeCallModal, markOperationsNotInterested, onLogged],
  );

  const callModalCandidate = callModalState?.candidate;
  const assignment = callModalCandidate
    ? resolveAssignment(callModalCandidate)
    : undefined;
  const logCallAttempts = getOperationsCallAttempts(assignment);
  const logCallFollowUpStage: OperationsFollowUpStage =
    getOperationsFollowUpStage(assignment);
  const followUpStage = logCallFollowUpStage;
  const canSubmitCallLog =
    callModalState?.mode === "log" &&
    canLogOperationsCall(followUpStage, logCallAttempts);
  const logCallCandidateName = callModalCandidate
    ? `${callModalCandidate.firstName || ""} ${callModalCandidate.lastName || ""}`.trim() ||
      "Selected candidate"
    : "";
  const logCallRecruiterName = callModalCandidate
    ? getPrimaryRecruiterName(callModalCandidate.recruiterAssignments)
    : "Unassigned";
  const logCallCurrentStatus =
    callModalCandidate?.currentStatus?.statusName || "Unknown";

  return {
    callModalState,
    openLogCall,
    openCallHistory,
    closeCallModal,
    resolveAssignment,
    isLoggingCall,
    isTransferring,
    isMarkingNotInterested,
    handleLogOperationsCall,
    handleInterestedReassign,
    handleNotInterestedJunk,
    callModalCandidate,
    logCallAttempts,
    logCallNextAttempt: logCallAttempts + 1,
    logCallFollowUpStage,
    canSubmitCallLog,
    logCallCandidateName,
    logCallRecruiterName,
    logCallCurrentStatus,
  };
}
