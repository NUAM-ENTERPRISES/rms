import { ShieldBan } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FlagIcon } from "@/shared";
import { cn } from "@/lib/utils";

interface CountryRestrictionLiftOnApprovalNoteProps {
  countryCode: string;
  countryName: string;
  compact?: boolean;
  className?: string;
}

export function CountryRestrictionLiftOnApprovalNote({
  countryCode,
  countryName,
  compact = false,
  className,
}: CountryRestrictionLiftOnApprovalNoteProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-green-50/80 shadow-sm",
        compact ? "p-3" : "p-4",
        className,
      )}
      role="note"
      aria-label={`Country restriction will be lifted for ${countryName} on approval`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldBan className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
        <span className="text-sm font-semibold text-emerald-950">
          Country restriction will be removed
        </span>
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-100 text-[10px] font-semibold uppercase tracking-wide text-emerald-900"
        >
          On approval
        </Badge>
      </div>

      <p
        className={cn(
          "mt-2 leading-relaxed text-emerald-900/85",
          compact ? "text-xs" : "text-sm",
        )}
      >
        This candidate is currently restricted from all{" "}
        <span className="font-semibold">{countryName}</span> projects. Approving
        this request will lift that restriction automatically.
      </p>

      <div
        className={cn(
          "mt-3 flex items-center gap-3 rounded-md border border-emerald-200/80 bg-white",
          compact ? "px-3 py-2" : "px-3 py-2.5",
        )}
      >
        <FlagIcon
          countryCode={countryCode}
          size={compact ? "md" : "lg"}
          className="shrink-0 rounded shadow-sm"
          aria-label={`Flag of ${countryName}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-slate-900 break-words">
            {countryName}
          </p>
          <p className="text-xs text-slate-500">{countryCode.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}
