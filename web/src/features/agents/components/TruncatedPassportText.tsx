import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const PASSPORT_DISPLAY_MAX = 10;

export function formatPassportDisplay(value?: string | null): {
  display: string;
  full: string | null;
} {
  const full = value?.trim() || null;
  if (!full) return { display: "—", full: null };
  if (full.length <= PASSPORT_DISPLAY_MAX) return { display: full, full };
  return { display: `${full.slice(0, PASSPORT_DISPLAY_MAX)}…`, full };
}

type TruncatedPassportTextProps = {
  passportNumber?: string | null;
  className?: string;
};

export function TruncatedPassportText({
  passportNumber,
  className,
}: TruncatedPassportTextProps) {
  const { display, full } = formatPassportDisplay(passportNumber);

  if (!full || display === full) {
    return (
      <span
        className={cn("inline-block text-xs text-foreground font-mono tabular-nums", className)}
        title={full ?? undefined}
      >
        {display}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-block cursor-default text-xs text-foreground font-mono tabular-nums",
              className,
            )}
            title={full}
            tabIndex={0}
          >
            {display}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="font-mono text-xs max-w-xs break-all"
        >
          {full}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
