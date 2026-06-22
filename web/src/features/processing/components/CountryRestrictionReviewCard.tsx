import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FlagIcon } from "@/shared";
import { cn } from "@/lib/utils";
import { formatProcessingStepLabel } from "@/features/processing/utils/formatProcessingStepLabel";

interface CountryRestrictionReviewCardProps {
  countryCode: string;
  countryName: string;
  stepKey?: string | null;
  className?: string;
  compact?: boolean;
}

export function CountryRestrictionReviewCard({
  countryCode,
  countryName,
  stepKey,
  className,
  compact = false,
}: CountryRestrictionReviewCardProps) {
  const stepLabel = stepKey ? formatProcessingStepLabel(stepKey) : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-300 bg-gradient-to-br from-amber-50 via-amber-50/80 to-orange-50/40",
        compact ? "p-3 space-y-2" : "p-4 space-y-3",
        className,
      )}
      role="note"
      aria-label={`Country restriction requested for ${countryName}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldAlert
          className="h-4 w-4 shrink-0 text-amber-800"
          aria-hidden
        />
        <span className="text-sm font-semibold text-amber-950">
          Country restriction requested
        </span>
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-100 text-[10px] font-semibold uppercase tracking-wide text-amber-900"
        >
          Applies on approval
        </Badge>
      </div>

      <p className="text-xs leading-relaxed text-amber-950/80">
        The requester asked to block this candidate from all future projects in
        the destination country below.
        {stepLabel ? ` Triggered from ${stepLabel} cancellation.` : null}
      </p>

      <div className="flex items-center gap-3 rounded-md border border-amber-200/90 bg-white px-3 py-2.5 shadow-sm">
        <FlagIcon
          countryCode={countryCode}
          size="lg"
          className="shrink-0 rounded shadow-sm"
          aria-label={`Flag of ${countryName}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-slate-900 break-words">
            {countryName}
          </p>
          <p className="text-xs text-slate-500">
            {countryCode.toUpperCase()}
            {stepLabel ? ` · ${stepLabel}` : " · Project destination"}
          </p>
        </div>
      </div>

      <p className="text-xs font-medium leading-relaxed text-amber-950">
        Approving this request will cancel processing and restrict the candidate
        from all{" "}
        <span className="font-semibold">{countryName}</span> projects.
      </p>
    </div>
  );
}
