import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetProfessionTypesQuery } from "@/features/candidates/api";

export interface ProfessionTypeSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function ProfessionTypeSelect({
  value = "",
  onValueChange,
  label = "Profession",
  description = "What type of jobs is this candidate looking for?",
  placeholder = "Select profession",
  required = false,
  disabled = false,
  error,
  className,
}: ProfessionTypeSelectProps) {
  const { data, isLoading } = useGetProfessionTypesQuery();
  const professionTypes = data?.professionTypes ?? [];

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div>
          <Label className="text-slate-700 font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {description ? (
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          ) : null}
        </div>
      )}
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger
          className={cn(
            "h-11 bg-white border-slate-200",
            error && "border-red-500",
          )}
          aria-invalid={!!error}
        >
          {isLoading ? (
            <span className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {professionTypes.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
