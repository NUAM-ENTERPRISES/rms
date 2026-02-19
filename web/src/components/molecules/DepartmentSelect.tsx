import { useState, useEffect, useMemo, useCallback } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks";
import { useGetRoleDepartmentsQuery } from "@/features/projects";

export interface DepartmentSelectProps {
  value?: string;
  onValueChange?: (id: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  allowEmpty?: boolean;
  pageSize?: number;
  includeRoles?: boolean;
}

export function DepartmentSelect({
  value = "",
  onValueChange,
  label,
  placeholder = "Select a department...",
  required = false,
  disabled = false,
  error,
  className,
  allowEmpty = true,
  pageSize = 20,
  includeRoles = false,
}: DepartmentSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const queryParams = useMemo(() => {
    const params: any = { page, limit: pageSize, includeRoles };
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [page, pageSize, debouncedSearch, includeRoles]);

  const { data, isLoading, isFetching } = useGetRoleDepartmentsQuery(queryParams);
  const departments = data?.data?.departments || [];
  const pagination = data?.data?.pagination;
  const hasMore = pagination ? page < pagination.totalPages : false;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) setPage((p) => p + 1);
  }, [hasMore, isFetching]);

  const selected = departments.find((d) => d.id === value);

  const handleSelect = (id?: string) => {
    if (!id) {
      if (allowEmpty) onValueChange?.("");
    } else {
      onValueChange?.(id);
    }
    setOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20",
              !value && "text-muted-foreground",
              error && "border-red-500"
            )}
          >
            {selected ? selected.label || selected.name : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="flex flex-col max-h-[400px]">
            <div className="p-2 border-b bg-white sticky top-0 z-10">
              <Input
                placeholder="Search departments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto">
              {isLoading && !departments.length ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-500">Loading departments...</p>
                </div>
              ) : departments.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">{search ? "No departments found." : "No departments available."}</p>
                </div>
              ) : (
                <div className="p-1">
                  {allowEmpty && (
                    <>
                      <button
                        onClick={() => handleSelect("")}
                        className="flex w-full items-center rounded-md px-3 py-2.5 text-sm hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                      >
                        <Check className={cn("mr-3 h-4 w-4 flex-shrink-0", value === "" ? "opacity-100 text-blue-600" : "opacity-0")} />
                        <span className="text-slate-500 italic">Please select a department</span>
                      </button>
                      <div className="my-1 mx-2 h-px bg-slate-200" />
                    </>
                  )}
                  {departments.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleSelect(d.id)}
                      className="flex w-full items-center rounded-md px-3 py-2.5 text-sm hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 text-left"
                    >
                      <Check className={cn("mr-3 h-4 w-4 flex-shrink-0", value === d.id ? "opacity-100 text-blue-600" : "opacity-0")} />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="truncate flex-1 text-slate-700 font-medium">{d.label || d.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {hasMore && (
                <div className="p-2 border-t bg-slate-50 sticky bottom-0">
                  <Button variant="ghost" size="sm" onClick={loadMore} disabled={isFetching} className="w-full hover:bg-white text-slate-700">
                    {isFetching ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      `Load more`
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default DepartmentSelect;
