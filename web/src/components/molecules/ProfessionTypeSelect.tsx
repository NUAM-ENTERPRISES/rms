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
  sector?: "HEALTHCARE" | "NON_HEALTH_CARE";
}

function sectorSuffix(sector: string | null | undefined): string {
  if (sector === "HEALTHCARE") return " · Healthcare";
  if (sector === "NON_HEALTH_CARE") return " · Non-healthcare";
  return "";
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
  sector,
}: ProfessionTypeSelectProps) {
  const { data: allData, isLoading: isLoadingAll } = useGetProfessionTypesQuery();
  const { data: filteredData, isLoading: isLoadingFiltered } =
    useGetProfessionTypesQuery(sector ? { sector } : undefined, {
      skip: !sector,
    });

  const allProfessionTypes = allData?.professionTypes ?? [];
  const professionTypes = sector
    ? (filteredData?.professionTypes ?? [])
    : allProfessionTypes;
  const isLoading = isLoadingAll || (Boolean(sector) && isLoadingFiltered);

  const selectedOutsideFilter =
    value &&
    sector &&
    !professionTypes.some((type) => type.id === value)
      ? allProfessionTypes.find((type) => type.id === value)
      : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div>
          <Label className="font-medium text-slate-700">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </Label>
          {description ? (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
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
            "h-11 border-slate-200 bg-white",
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
          {selectedOutsideFilter ? (
            <SelectItem value={selectedOutsideFilter.id}>
              {selectedOutsideFilter.label}
              {sectorSuffix(selectedOutsideFilter.sector)}
            </SelectItem>
          ) : null}
          {professionTypes.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.label}
              {sectorSuffix(type.sector)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
