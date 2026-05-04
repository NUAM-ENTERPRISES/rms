/**
 * State Select component - molecule for state/province selection
 * Following FE_GUIDELINES.md molecules pattern
 */

import { useState, useMemo } from "react";
import { Check, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks";
import { useGetStatesByCountryCodeQuery } from "@/shared/hooks/useCountriesLookup";

export interface StateSelectProps {
  value?: string;
  onValueChange?: (id: string) => void;
  countryCode?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  allowEmpty?: boolean;
  pageSize?: number;
  name?: string;
}

export function StateSelect({
  value = "",
  onValueChange,
  countryCode,
  label,
  placeholder = "Select a state...",
  required = false,
  disabled = false,
  error,
  className,
  allowEmpty = true,
  pageSize = 20,
}: StateSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const normalizedCountry = countryCode?.trim() ?? "";
  const { data, isFetching } = useGetStatesByCountryCodeQuery(normalizedCountry, {
    skip: !normalizedCountry,
  });

  const allStates = data?.states ?? [];

  // Client-side search and pagination
  const filteredStates = useMemo(() => {
    if (!debouncedSearch) return allStates;
    const lowerSearch = debouncedSearch.toLowerCase();
    return allStates.filter(
      (state) =>
        state.name.toLowerCase().includes(lowerSearch) ||
        state.code.toLowerCase().includes(lowerSearch)
    );
  }, [allStates, debouncedSearch]);

  const totalPages = Math.ceil(filteredStates.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedStates = filteredStates.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSelect = (stateId: string) => {
    onValueChange?.(stateId === value ? "" : stateId);
    setOpen(false);
  };

  const selectedState = allStates.find((s) => s.id === value);
  const displayState = selectedState;

  const isDisabled = disabled || !normalizedCountry || isFetching;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between h-11 bg-white border-slate-200 hover:bg-slate-50 text-left font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive focus:ring-destructive",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={isDisabled}
          >
            <span className="truncate">
              {displayState ? displayState.name : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="flex flex-col h-full max-h-[300px]">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Search states..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-1">
              {allowEmpty && (
                <Button
                  variant="ghost"
                  className="w-full justify-start font-normal text-muted-foreground h-9 px-2"
                  onClick={() => handleSelect("")}
                >
                  None
                </Button>
              )}

              {paginatedStates.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {isFetching ? "Loading states..." : "No state found."}
                </div>
              ) : (
                paginatedStates.map((state) => (
                  <Button
                    key={state.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start font-normal h-9 px-2 mb-1 last:mb-0",
                      value === state.id && "bg-slate-100 text-slate-900 font-medium"
                    )}
                    onClick={() => handleSelect(state.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === state.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{state.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {state.code}
                    </span>
                  </Button>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-2 bg-slate-50/50">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-[0.8rem] font-medium text-destructive">{error}</p>}
    </div>
  );
}
