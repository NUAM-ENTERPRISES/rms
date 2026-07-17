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
  /** When set, only professions in this sector are selectable. Selected labels still resolve from the full catalog. */
  sector?: "HEALTHCARE" | "NON_HEALTH_CARE";
}

function sectorSuffix(sector: string | null | undefined): string {
  if (sector === "HEALTHCARE") return " · Healthcare";
  if (sector === "NON_HEALTH_CARE") return " · Non-healthcare";
  return "";
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
  sector,
}: ProfessionTypeMultiSelectProps) {
  // Always load the full active catalog so selected chips keep correct labels
  // even when the selectable list is filtered by sector.
  const { data: allData, isLoading: isLoadingAll } = useGetProfessionTypesQuery();
  const { data: filteredData, isLoading: isLoadingFiltered } =
    useGetProfessionTypesQuery(sector ? { sector } : undefined, {
      skip: !sector,
    });

  const allProfessionTypes = allData?.professionTypes ?? [];
  const selectableTypes = sector
    ? (filteredData?.professionTypes ?? [])
    : allProfessionTypes;

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of allProfessionTypes) {
      map.set(type.id, `${type.label}${sectorSuffix(type.sector)}`);
    }
    return map;
  }, [allProfessionTypes]);

  const options = useMemo(() => {
    const selectableIds = new Set(selectableTypes.map((t) => t.id));
    const fromCatalog = selectableTypes.map((type) => ({
      value: type.id,
      label: labelById.get(type.id) ?? type.label,
    }));

    // Keep any currently selected values visible/resolvable even if outside
    // the active sector filter (e.g. while the user is changing sector scope).
    const selected = Array.isArray(value) ? value : [];
    for (const id of selected) {
      if (selectableIds.has(id)) continue;
      const resolved = labelById.get(id);
      if (resolved) {
        fromCatalog.push({ value: id, label: resolved });
      }
    }
    return fromCatalog;
  }, [selectableTypes, labelById, value]);

  const isLoading = isLoadingAll || (Boolean(sector) && isLoadingFiltered);

  if (isLoading && allProfessionTypes.length === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        {label ? (
          <Label className="text-sm font-medium text-slate-700">{label}</Label>
        ) : null}
        <div className="flex h-11 items-center gap-2 text-sm text-slate-500">
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
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
      ) : null}
      <MultiSelect
        value={value}
        onValueChange={onValueChange}
        options={options}
        placeholder={
          options.length === 0
            ? "No profession types available for this sector"
            : placeholder
        }
        required={required}
        disabled={disabled || isLoading}
        error={error}
      />
    </div>
  );
}
