import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  SHIPMENT_STATUS,
  SHIPMENT_STATUS_LABELS,
  type ShipmentStatus,
} from "../constants";

const statusStyles: Record<
  ShipmentStatus,
  { badge: string; dot: string; hint: string }
> = {
  draft: {
    badge: "bg-slate-50 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    hint: "Leg created but not yet sent",
  },
  in_transit: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    hint: "Documents are on the way",
  },
  received: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    hint: "Destination confirmed receipt",
  },
};

interface ShipmentStatusBadgeProps {
  status: string;
  className?: string;
}

export function ShipmentStatusBadge({
  status,
  className,
}: ShipmentStatusBadgeProps) {
  const key = (status in SHIPMENT_STATUS_LABELS
    ? status
    : SHIPMENT_STATUS.DRAFT) as ShipmentStatus;
  const style = statusStyles[key];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 font-medium",
              style.badge,
              className,
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", style.dot)}
              aria-hidden
            />
            {SHIPMENT_STATUS_LABELS[key]}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{style.hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
