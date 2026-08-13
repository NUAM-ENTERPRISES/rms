import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetProfessionTypesQuery } from "@/features/candidates/api";
import { isProfessionCoverageWildcard } from "@/features/candidates/constants/profession-coverage";

const ADD_ROLE_VALUE = "__add_role_catalog__";

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
  triggerClassName?: string;
  sector?: "HEALTHCARE" | "NON_HEALTH_CARE";
  /** When set, shows an Add role action at the bottom of the dropdown. */
  onAddRole?: () => void;
  addRoleLabel?: string;
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
  triggerClassName,
  sector,
  onAddRole,
  addRoleLabel = "Add role",
}: ProfessionTypeSelectProps) {
  const { data: allData, isLoading: isLoadingAll } = useGetProfessionTypesQuery();
  const { data: filteredData, isLoading: isLoadingFiltered } =
    useGetProfessionTypesQuery(sector ? { sector } : undefined, {
      skip: !sector,
    });

  const allProfessionTypes = (allData?.professionTypes ?? []).filter(
    (type) => !isProfessionCoverageWildcard(type.name),
  );
  const professionTypes = (
    sector ? (filteredData?.professionTypes ?? []) : allProfessionTypes
  ).filter((type) => !isProfessionCoverageWildcard(type.name));
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
        onValueChange={(next) => {
          if (next === ADD_ROLE_VALUE) {
            onAddRole?.();
            return;
          }
          onValueChange?.(next);
        }}
        disabled={disabled || isLoading}
      >
        <SelectTrigger
          className={cn(
            "h-11 border-border bg-card",
            error && "border-red-500",
            triggerClassName,
          )}
          aria-invalid={!!error}
        >
          {isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
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
          {onAddRole ? (
            <>
              <SelectSeparator />
              <SelectItem
                value={ADD_ROLE_VALUE}
                className="text-indigo-600 focus:text-indigo-700"
              >
                <span className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {addRoleLabel}
                </span>
              </SelectItem>
            </>
          ) : null}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
