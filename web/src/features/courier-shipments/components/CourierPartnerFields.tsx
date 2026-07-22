import { Hash, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { COURIER_PARTNERS } from "../constants";

interface CourierPartnerFieldsProps {
  trackingId: string;
  courierPartner: string;
  onTrackingIdChange: (value: string) => void;
  onCourierPartnerChange: (value: string) => void;
  className?: string;
  tone?: "default" | "accent";
}

export function CourierPartnerFields({
  trackingId,
  courierPartner,
  onTrackingIdChange,
  onCourierPartnerChange,
  className,
  tone = "default",
}: CourierPartnerFieldsProps) {
  const isAccent = tone === "accent";

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <div
        className={cn(
          "rounded-xl p-3",
          isAccent && "border border-sky-200/80 bg-sky-50/60",
        )}
      >
        <Label
          htmlFor="courier-tracking-id"
          className={cn(
            "flex items-center gap-1.5 text-xs",
            isAccent && "font-medium text-sky-900",
          )}
        >
          <Hash
            className={cn(
              "h-3.5 w-3.5",
              isAccent ? "text-sky-600" : "text-muted-foreground",
            )}
          />
          Tracking ID{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="courier-tracking-id"
          value={trackingId}
          onChange={(e) => onTrackingIdChange(e.target.value)}
          placeholder="Add later if not available yet"
          className={cn(
            "mt-1.5 h-9 rounded-lg",
            isAccent &&
              "border-sky-200 bg-card focus-visible:ring-sky-300/50",
          )}
        />
      </div>
      <div
        className={cn(
          "rounded-xl p-3",
          isAccent && "border border-amber-200/80 bg-amber-50/60",
        )}
      >
        <Label
          className={cn(
            "flex items-center gap-1.5 text-xs",
            isAccent && "font-medium text-amber-900",
          )}
        >
          <Truck
            className={cn(
              "h-3.5 w-3.5",
              isAccent ? "text-amber-600" : "text-muted-foreground",
            )}
          />
          Courier partner{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Select value={courierPartner} onValueChange={onCourierPartnerChange}>
          <SelectTrigger
            className={cn(
              "mt-1.5 h-9 rounded-lg",
              isAccent &&
                "border-amber-200 bg-card focus:ring-amber-300/50",
            )}
          >
            <SelectValue placeholder="Select courier partner" />
          </SelectTrigger>
          <SelectContent>
            {COURIER_PARTNERS.map((partner) => (
              <SelectItem key={partner} value={partner}>
                {partner}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
