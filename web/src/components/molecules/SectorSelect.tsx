import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type SectorValue = "HEALTHCARE" | "NON_HEALTH_CARE";

export interface SectorSelectProps {
  value?: string;
  onValueChange?: (value: SectorValue) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  triggerClassName?: string;
}

const SECTOR_OPTIONS: { value: SectorValue; label: string }[] = [
  { value: "HEALTHCARE", label: "Healthcare" },
  { value: "NON_HEALTH_CARE", label: "Non-healthcare" },
];

export function SectorSelect({
  value = "",
  onValueChange,
  label = "Sector",
  description,
  placeholder = "Select sector",
  required = false,
  disabled = false,
  error,
  className,
  triggerClassName,
}: SectorSelectProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div>
          <Label className="font-medium text-foreground">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </Label>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      )}
      <Select
        value={value}
        onValueChange={(v) => onValueChange?.(v as SectorValue)}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "h-11 border-border bg-card",
            error && "border-red-500",
            triggerClassName,
          )}
          aria-invalid={!!error}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {SECTOR_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
