import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHIPMENT_STATUS } from "../constants";

function routeActionLabel(status?: string) {
  if (status === SHIPMENT_STATUS.RECEIVED) {
    return "Delivered to";
  }
  if (status === SHIPMENT_STATUS.IN_TRANSIT) {
    return "Sent to";
  }
  return "To";
}

export interface CourierRouteDisplayProps {
  fromLabel?: string | null;
  toLabel?: string | null;
  status?: string;
  variant?: "card" | "inline";
  className?: string;
}

export function CourierRouteDisplay({
  fromLabel,
  toLabel,
  status,
  variant = "card",
  className,
}: CourierRouteDisplayProps) {
  const from = fromLabel?.trim() || "—";
  const to = toLabel?.trim() || "—";
  const actionLabel = routeActionLabel(status);

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm",
          className,
        )}
        aria-label={`${from} sent to ${to}`}
      >
        <span className="truncate font-semibold text-foreground">{from}</span>
        <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          <span className="text-[10px] font-medium uppercase tracking-wide">
            {actionLabel}
          </span>
        </span>
        <span className="truncate font-semibold text-foreground">{to}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[1fr_auto_1fr] overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm",
        className,
      )}
      aria-label={`${from} ${actionLabel.toLowerCase()} ${to}`}
    >
      <div className="min-w-0 border-r border-border/50 bg-teal-50/60 px-3 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-teal-700/80">
          From
        </p>
        <p className="truncate text-sm font-semibold text-teal-950">{from}</p>
      </div>

      <div className="flex min-w-[4.5rem] flex-col items-center justify-center gap-0.5 bg-muted/25 px-2 py-2">
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="whitespace-nowrap text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
          {actionLabel}
        </span>
      </div>

      <div className="min-w-0 border-l border-border/50 bg-emerald-50/60 px-3 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700/80">
          Destination
        </p>
        <p className="truncate text-sm font-semibold text-emerald-950">{to}</p>
      </div>
    </div>
  );
}
