import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks";
import { useGetRoleDepartmentsQuery } from "@/features/projects";

export interface PreferredRoleMultiSelectProps {
  value?: string[];
  onValueChange?: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  pageSize?: number;
  optionLabels?: Record<string, string>;
  onOptionLabelsChange?: (labels: Record<string, string>) => void;
}

type RoleOption = {
  value: string;
  label: string;
};

function buildRoleLabel(
  role: { label?: string; name?: string },
  department?: { label?: string; name?: string } | null,
): string {
  const roleLabel = role.label || role.name || "Role";
  const deptLabel = department?.label || department?.name;
  return deptLabel ? `${deptLabel} – ${roleLabel}` : roleLabel;
}

export function PreferredRoleMultiSelect({
  value = [],
  onValueChange,
  label = "Department Preferences",
  placeholder = "Select department roles...",
  required = false,
  disabled = false,
  error,
  className,
  pageSize = 20,
  optionLabels,
  onOptionLabelsChange,
}: PreferredRoleMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [labelById, setLabelById] = useState<Record<string, string>>({});
  const [accumulatedDepartments, setAccumulatedDepartments] = useState<
    Array<{ id: string; label?: string; name?: string; roles?: Array<{ id: string; label?: string; name?: string }> }>
  >([]);
  const debouncedSearch = useDebounce(search, 300);

  const queryParams = useMemo(
    () => ({
      includeRoles: true,
      search: debouncedSearch || undefined,
      page,
      limit: pageSize,
    }),
    [debouncedSearch, page, pageSize],
  );

  const { data, isLoading, isFetching } = useGetRoleDepartmentsQuery(queryParams, {
    skip: !open && value.length === 0,
  });

  const pagination = data?.data?.pagination;
  const hasMore = pagination ? page < pagination.totalPages : false;

  useEffect(() => {
    const nextDepartments = data?.data?.departments || [];
    if (!nextDepartments.length) return;
    setAccumulatedDepartments((prev) => {
      if (page === 1) return nextDepartments;
      const byId = new Map(prev.map((dept) => [dept.id, dept]));
      for (const dept of nextDepartments) {
        byId.set(dept.id, dept);
      }
      return Array.from(byId.values());
    });
  }, [data, page]);

  useEffect(() => {
    setAccumulatedDepartments([]);
    setPage(1);
  }, [debouncedSearch]);

  const options = useMemo<RoleOption[]>(() => {
    const seen = new Set<string>();
    const flattened: RoleOption[] = [];

    for (const department of accumulatedDepartments) {
      for (const role of department.roles || []) {
        if (!role.id || seen.has(role.id)) continue;
        seen.add(role.id);
        flattened.push({
          value: role.id,
          label: buildRoleLabel(role, department),
        });
      }
    }

    return flattened.sort((a, b) => a.label.localeCompare(b.label));
  }, [accumulatedDepartments]);

  useEffect(() => {
    if (!optionLabels) return;
    setLabelById((prev) => ({ ...optionLabels, ...prev }));
  }, [optionLabels]);

  useEffect(() => {
    if (!options.length) return;
    setLabelById((prev) => {
      const next = { ...prev };
      for (const option of options) {
        next[option.value] = option.label;
      }
      onOptionLabelsChange?.(next);
      return next;
    });
  }, [options, onOptionLabelsChange]);

  const selectedValues = Array.isArray(value) ? value : [];

  const handleSelect = (optionValue: string) => {
    const current = Array.isArray(value) ? value : [];
    const isSelected = current.includes(optionValue);
    const newValue = isSelected
      ? current.filter((v) => v !== optionValue)
      : [...current, optionValue];
    onValueChange?.(newValue);
  };

  const removeOption = (optionValue: string) => {
    const current = Array.isArray(value) ? value : [];
    onValueChange?.(current.filter((v) => v !== optionValue));
  };

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isFetching]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild disabled={disabled}>
          <div
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            tabIndex={disabled ? -1 : 0}
            className={cn(
              "flex items-start gap-2 p-2 min-h-[44px] w-full bg-white border border-slate-200 rounded-md text-left",
              !disabled &&
                "cursor-pointer hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20",
              disabled && "opacity-50 cursor-not-allowed",
              error && "border-destructive focus-visible:ring-destructive/20",
            )}
          >
            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {selectedValues.length > 0 ? (
                selectedValues.map((v) => (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1 pr-1"
                  >
                    <span>{labelById[v] || v}</span>
                    <button
                      type="button"
                      disabled={disabled}
                      className="relative z-10 rounded-sm p-0.5 hover:bg-indigo-100/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:pointer-events-none"
                      aria-label={`Remove ${labelById[v] || v}`}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        removeOption(v);
                      }}
                    >
                      <X className="h-3 w-3 pointer-events-none" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-slate-400 text-sm py-1 px-1">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50 mt-1" aria-hidden />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="z-[100] w-full min-w-[280px] p-0 shadow-xl border-slate-200 rounded-xl pointer-events-auto"
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="flex max-h-[min(320px,50vh)] flex-col">
            <div className="shrink-0 p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search departments or roles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 text-sm border-slate-200 focus:ring-blue-500 rounded-lg"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 space-y-0.5">
              {isLoading && options.length === 0 ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-500">Loading roles...</p>
                </div>
              ) : options.length === 0 ? (
                <div className="py-4 text-center text-sm text-slate-400">
                  {search ? "No roles found" : "No roles available"}
                </div>
              ) : (
                options.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
                      selectedValues.includes(option.value)
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "hover:bg-slate-50 text-slate-600",
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 border border-slate-300 rounded flex items-center justify-center transition-colors",
                        selectedValues.includes(option.value)
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-white",
                      )}
                    >
                      {selectedValues.includes(option.value) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="truncate flex-1">{option.label}</span>
                  </div>
                ))
              )}
            </div>

            {hasMore && (
              <div className="p-2 border-t bg-slate-50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={isFetching}
                  className="w-full hover:bg-white text-slate-700"
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export default PreferredRoleMultiSelect;
