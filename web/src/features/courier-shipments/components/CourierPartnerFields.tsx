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
}

export function CourierPartnerFields({
  trackingId,
  courierPartner,
  onTrackingIdChange,
  onCourierPartnerChange,
  className,
}: CourierPartnerFieldsProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <div>
        <Label
          htmlFor="courier-tracking-id"
          className="flex items-center gap-1.5 text-xs"
        >
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          Tracking ID
        </Label>
        <Input
          id="courier-tracking-id"
          value={trackingId}
          onChange={(e) => onTrackingIdChange(e.target.value)}
          placeholder="Courier tracking number"
          className="mt-1.5 h-9 rounded-lg"
        />
      </div>
      <div>
        <Label className="flex items-center gap-1.5 text-xs">
          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
          Courier partner
        </Label>
        <Select value={courierPartner} onValueChange={onCourierPartnerChange}>
          <SelectTrigger className="mt-1.5 h-9 rounded-lg">
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
