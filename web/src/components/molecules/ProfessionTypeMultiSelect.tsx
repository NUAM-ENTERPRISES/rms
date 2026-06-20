import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/molecules/MultiSelect";
import { useGetProfessionTypesQuery } from "@/features/candidates/api";

export interface ProfessionTypeMultiSelectProps {
  value?: string[];
  onValueChange?: (value: string[]) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function ProfessionTypeMultiSelect({
  value = [],
  onValueChange,
  label = "Profession Coverage",
  description = "Which candidate profession types does this user handle?",
  placeholder = "Select profession types...",
  required = false,
  disabled = false,
  error,
  className,
}: ProfessionTypeMultiSelectProps) {
  const { data, isLoading } = useGetProfessionTypesQuery();
  const professionTypes = data?.professionTypes ?? [];

  const options = useMemo(
    () =>
      professionTypes.map((type) => ({
        value: type.id,
        label: type.label,
      })),
    [professionTypes],
  );

  if (isLoading && options.length === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        {label ? (
          <Label className="text-sm font-medium text-slate-700">{label}</Label>
        ) : null}
        <div className="flex items-center gap-2 text-sm text-slate-500 h-11">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading profession types...
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <div>
          <Label className="text-sm font-medium text-slate-700">
            {label}
            {required ? <span className="text-destructive ml-1">*</span> : null}
          </Label>
          {description ? (
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          ) : null}
        </div>
      ) : null}
      <MultiSelect
        value={value}
        onValueChange={onValueChange}
        options={options}
        placeholder={placeholder}
        required={required}
        disabled={disabled || isLoading}
        error={error}
      />
    </div>
  );
}
