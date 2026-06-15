import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { LockerFileNumberAvailability } from "../api";

interface LockerFileNumberAvailabilityHintProps {
  lockerInput: string;
  debouncedLockerFileNumber: string;
  isFetching: boolean;
  availability?: LockerFileNumberAvailability;
  isError?: boolean;
}

export function LockerFileNumberAvailabilityHint({
  lockerInput,
  debouncedLockerFileNumber,
  isFetching,
  availability,
  isError,
}: LockerFileNumberAvailabilityHintProps) {
  const trimmed = lockerInput.trim();

  if (!trimmed) {
    return null;
  }

  if (isFetching || trimmed.toUpperCase() !== debouncedLockerFileNumber) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        Checking locker number…
      </p>
    );
  }

  if (isError || !availability) {
    return null;
  }

  if (availability.available) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Locker file number is available.
      </p>
    );
  }

  const usedBy = availability.usedBy;

  return (
    <Alert variant="destructive" role="alert" aria-live="assertive">
      <AlertTriangle className="h-4 w-4" aria-hidden />
      <AlertTitle>Locker file number already in use</AlertTitle>
      <AlertDescription className="mt-1 space-y-0.5">
        {usedBy?.candidateName ? (
          <p>
            Assigned to{" "}
            <span className="font-semibold">{usedBy.candidateName}</span>
            {usedBy.candidateCode ? (
              <span className="text-muted-foreground">
                {" "}
                · <span className="font-mono">{usedBy.candidateCode}</span>
              </span>
            ) : null}
          </p>
        ) : (
          <p>This locker file number is already assigned to another collection.</p>
        )}
        <p className="mt-1 text-xs font-medium">
          Enter a unique locker file number to continue.
        </p>
      </AlertDescription>
    </Alert>
  );
}
