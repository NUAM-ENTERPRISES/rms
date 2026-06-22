import { ShieldBan } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FlagIcon } from "@/shared";
import { cn } from "@/lib/utils";
import { formatProcessingStepLabel } from "@/features/processing/utils/formatProcessingStepLabel";

interface CountryRestrictionAppliedNoteProps {
  countryCode: string;
  countryName: string;
  stepKey?: string | null;
  className?: string;
}

export function CountryRestrictionAppliedNote({
  countryCode,
  countryName,
  stepKey,
  className,
}: CountryRestrictionAppliedNoteProps) {
  const stepLabel = stepKey ? formatProcessingStepLabel(stepKey) : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50/80 p-3 shadow-sm",
        className,
      )}
      role="note"
      aria-label={`Country restriction applied for ${countryName}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldBan className="h-4 w-4 shrink-0 text-red-700" aria-hidden />
        <span className="text-sm font-semibold text-red-950">
          Country restriction applied
        </span>
        <Badge
          variant="outline"
          className="border-red-200 bg-red-100 text-[10px] font-semibold uppercase tracking-wide text-red-900"
        >
          Active
        </Badge>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-red-900/80">
        This candidate is now blocked from all future projects in the destination
        country below.
        {stepLabel ? ` Applied when ${stepLabel} cancellation was approved.` : null}
      </p>

      <div className="mt-3 flex items-center gap-3 rounded-md border border-red-200/80 bg-white px-3 py-2.5">
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
    </div>
  );
}
