import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PendingStatusChangeRequest } from "@/features/candidates/api";
import {
  getProcessingActionLock,
  type ProcessingActionLockState,
} from "../utils/processingActionLock";

const ProcessingActionLockContext = createContext<ProcessingActionLockState>({
  isLocked: false,
  reason: null,
  tooltip: null,
  pendingRequest: null,
  submittedAtLabel: null,
});

interface ProcessingActionLockProviderProps {
  pendingRequest?: PendingStatusChangeRequest | null;
  processingStatus?: string;
  children: ReactNode;
}

export function ProcessingActionLockProvider({
  pendingRequest,
  processingStatus,
  children,
}: ProcessingActionLockProviderProps) {
  const value = useMemo(
    () => getProcessingActionLock({ pendingRequest, processingStatus }),
    [pendingRequest, processingStatus],
  );

  return (
    <ProcessingActionLockContext.Provider value={value}>
      {children}
    </ProcessingActionLockContext.Provider>
  );
}

export function useProcessingActionLock(): ProcessingActionLockState {
  return useContext(ProcessingActionLockContext);
}
