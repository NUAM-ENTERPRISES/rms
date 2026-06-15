import { Truck, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import { DELIVERY_MODE, DELIVERY_MODE_LABELS, type DeliveryMode } from "../constants";

interface DeliveryModeToggleProps {
  value: DeliveryMode;
  onChange: (value: DeliveryMode) => void;
  disabled?: boolean;
}

export function DeliveryModeToggle({
  value,
  onChange,
  disabled,
}: DeliveryModeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(DELIVERY_MODE.COURIER)}
        className={cn(
          "rounded-xl border p-4 text-left transition-all",
          value === DELIVERY_MODE.COURIER
            ? "border-teal-300 bg-teal-50 ring-2 ring-teal-200"
            : "border-border bg-card hover:border-teal-200",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        aria-pressed={value === DELIVERY_MODE.COURIER}
      >
        <Truck className="h-5 w-5 text-teal-600 mb-2" />
        <p className="font-semibold text-sm">{DELIVERY_MODE_LABELS.courier}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Send via courier partner with tracking ID
        </p>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(DELIVERY_MODE.DIRECT)}
        className={cn(
          "rounded-xl border p-4 text-left transition-all",
          value === DELIVERY_MODE.DIRECT
            ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
            : "border-border bg-card hover:border-indigo-200",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        aria-pressed={value === DELIVERY_MODE.DIRECT}
      >
        <Footprints className="h-5 w-5 text-indigo-600 mb-2" />
        <p className="font-semibold text-sm">{DELIVERY_MODE_LABELS.direct}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Physical handover without courier tracking
        </p>
      </button>
    </div>
  );
}
