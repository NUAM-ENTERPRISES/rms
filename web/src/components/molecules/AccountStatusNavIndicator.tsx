import { useAppSelector } from "@/app/hooks";
import { useGetProfileQuery } from "@/features/profile/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AccountStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export function AccountStatusNavIndicator() {
  const sessionAccountStatus = useAppSelector(
    (s) => s.auth.sessionAccountStatus,
  );
  const { data: profileResponse } = useGetProfileQuery();
  const status = (sessionAccountStatus ??
    profileResponse?.data?.accountStatus ??
    "ACTIVE") as AccountStatus;

  if (status === "BLOCKED") {
    return null;
  }

  const isActive = status === "ACTIVE";
  const label = isActive ? "Account active" : "Account inactive";
  const tooltipText = isActive
    ? "Your account is active"
    : "Your account is inactive. Please contact admin.";

  const dot = (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/20",
        isActive ? "bg-emerald-500" : "bg-amber-500",
      )}
      aria-hidden
    />
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium",
              "text-violet-100 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
            )}
            aria-label={label}
          >
            {dot}
            <span className="hidden sm:inline">
              {isActive ? "Active" : "Inactive"}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-center">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
