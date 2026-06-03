import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { PassportLookupResult } from "@/features/candidates/api";

interface PassportLookupHintProps {
  passportInput: string;
  debouncedPassport: string;
  isFetching: boolean;
  lookup?: PassportLookupResult;
  isError?: boolean;
}

export function PassportLookupHint({
  passportInput,
  debouncedPassport,
  isFetching,
  lookup,
  isError,
}: PassportLookupHintProps) {
  const trimmed = passportInput.trim();

  if (trimmed.length < 3) {
    return null;
  }

  // Typing or debounce hasn't settled yet
  if (isFetching || trimmed !== debouncedPassport.trim()) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
        Checking…
      </p>
    );
  }

  // Network error — don't block the user, just skip silently.
  // The backend will still reject a duplicate on submit.
  if (isError || !lookup) {
    return null;
  }

  // No duplicate — this is a new candidate, good to go
  if (!lookup.found || !lookup.candidate) {
    return (
      <p className="text-sm text-emerald-600 flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Passport not found in system — new candidate.
      </p>
    );
  }

  // Duplicate found — show the existing candidate details
  const c = lookup.candidate;
  const fullName = `${c.firstName} ${c.lastName}`.trim();
  const hasPhone = Boolean(c.countryCode?.trim() && c.mobileNumber?.trim());

  return (
    <Alert variant="destructive" role="alert" aria-live="assertive">
      <AlertTriangle className="h-4 w-4" aria-hidden />
      <AlertTitle>Passport already registered</AlertTitle>
      <AlertDescription className="space-y-0.5 mt-1">
        <p>
          <span className="font-semibold">{fullName}</span>
          {c.candidateCode ? (
            <span className="text-muted-foreground">
              {" "}· <span className="font-mono">{c.candidateCode}</span>
            </span>
          ) : null}
        </p>
        {c.email ? (
          <p className="text-xs">{c.email}</p>
        ) : null}
        {hasPhone ? (
          <p className="text-xs">
            {c.countryCode} {c.mobileNumber}
          </p>
        ) : null}
        <p className="text-xs mt-1 font-medium">
          A candidate with this passport already exists. Please use the existing record.
        </p>
      </AlertDescription>
    </Alert>
  );
}
