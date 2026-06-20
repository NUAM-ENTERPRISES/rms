import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProcessingActionLock } from "../context/ProcessingActionLockContext";

export function ProcessingActionLockBanner() {
  const { isLocked, tooltip, submittedAtLabel, pendingRequest } =
    useProcessingActionLock();

  if (!isLocked || !tooltip) {
    return null;
  }

  return (
    <Alert className="border-orange-300 bg-orange-100">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-900">
        <p>{tooltip}</p>
        {submittedAtLabel && (
          <p className="mt-1 text-xs text-orange-800">
            Request sent {submittedAtLabel}
            {pendingRequest?.requester?.name
              ? ` by ${pendingRequest.requester.name}`
              : ""}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
