import { Check, Copy, ExternalLink, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildCourierTrackingUrl } from "@/shared/utils/courier-tracking";

interface CourierTrackingDisplayProps {
  courierPartner?: string | null;
  trackingId?: string | null;
  className?: string;
  variant?: "default" | "success";
}

export function CourierTrackingDisplay({
  courierPartner,
  trackingId,
  className,
  variant = "default",
}: CourierTrackingDisplayProps) {
  const [copied, setCopied] = useState(false);
  const partner = courierPartner?.trim();
  const id = trackingId?.trim();

  if (!id) {
    return null;
  }

  const trackingUrl = buildCourierTrackingUrl(partner, id);
  const trackAriaLabel = partner
    ? `Track shipment on ${partner} (opens in new tab)`
    : "Track shipment (opens in new tab)";
  const partnerLabel = partner ?? "Courier";

  const copyTracking = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success("Tracking ID copied");
    window.setTimeout(() => setCopied(false), 1600);
  };

  const isSuccess = variant === "success";

  return (
    <TooltipProvider delayDuration={250}>
      <div
        className={cn(
          "group inline-flex min-w-[11rem] max-w-full flex-col gap-1 rounded-lg border border-border/70 bg-background/90 p-1.5 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md",
          isSuccess &&
            "mt-2 min-w-[14rem] rounded-xl border-teal-200/70 bg-gradient-to-r from-teal-50/90 via-white to-emerald-50/50 shadow-[0_8px_24px_-12px_rgba(13,148,136,0.35)]",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex min-w-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold text-teal-800",
              isSuccess ? "bg-teal-100/80" : "bg-teal-500/10",
            )}
          >
            <Truck className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{partnerLabel}</span>
          </span>

          <div className="flex shrink-0 items-center">
            {trackingUrl ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={trackAriaLabel}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-semibold text-teal-700 transition-colors",
                      "hover:bg-teal-500/10 active:scale-[0.98]",
                      isSuccess &&
                        "bg-teal-600 text-white hover:bg-teal-700 hover:text-white",
                    )}
                  >
                    Track
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Open {partnerLabel} tracking
                </TooltipContent>
              </Tooltip>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Copy tracking ID"
                  onClick={() => void copyTracking()}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors",
                    "hover:bg-muted hover:text-foreground active:scale-[0.98]",
                    copied && "text-emerald-600 hover:text-emerald-600",
                  )}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {copied ? "Copied" : "Copy tracking ID"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <code className="block w-full break-all font-mono text-[11px] font-medium leading-snug text-foreground">
          {id}
        </code>
      </div>
    </TooltipProvider>
  );
}
