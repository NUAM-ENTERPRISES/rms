/**
 * Multi-Country Select component - molecule for multiple country selection
 * Following FE_GUIDELINES.md molecules pattern
 */

import { useState } from "react";
import { Check, ChevronDown, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks";
import { FlagIcon } from "@/shared";
import { useCountriesLookup } from "@/shared/hooks/useCountriesLookup";

export interface MultiCountrySelectProps {
  value?: string[];
  onValueChange?: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  pageSize?: number;
  name?: string;
}

export function MultiCountrySelect({
  value = [],
  onValueChange,
  label,
  placeholder = "Select countries...",
  required = false,
  disabled = false,
  error,
  className,
  pageSize = 20,
}: MultiCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { countries, pagination, isLoading } = useCountriesLookup({
    search: debouncedSearch,
    page,
    limit: pageSize,
  });

  const selectedValues = Array.isArray(value) ? value : [];

  const handleSelect = (countryCode: string) => {
    const isSelected = selectedValues.includes(countryCode);
    const newValue = isSelected
      ? selectedValues.filter((v) => v !== countryCode)
      : [...selectedValues, countryCode];

    onValueChange?.(newValue);
  };

  const removeCountry = (countryCode: string) => {
    const current = Array.isArray(value) ? value : [];
    onValueChange?.(current.filter((v) => v !== countryCode));
  };

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
              !disabled && "cursor-pointer hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20",
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
                    className="bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1 pr-1"
                  >
                    <FlagIcon countryCode={v} size="xs" />
                    <span>{v}</span>
                    <button
                      type="button"
                      disabled={disabled}
                      className="relative z-10 rounded-sm p-0.5 hover:bg-blue-100/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 disabled:pointer-events-none"
                      aria-label={`Remove ${v}`}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        removeCountry(v);
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
            className="z-[100] w-[320px] p-0 shadow-xl border-slate-200 rounded-xl pointer-events-auto"
            align="start"
            onWheel={(e) => e.stopPropagation()}
          >
          <div className="flex max-h-[min(320px,50vh)] flex-col">
            <div className="shrink-0 p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search countries..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-10 text-sm border-slate-200 focus:ring-blue-500 rounded-lg"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 pr-1 space-y-0.5 [scrollbar-color:rgb(203_213_225)_rgb(248_250_252)] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100">
              {isLoading ? (
                <div className="py-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                  <div className="h-4 w-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                  Loading...
                </div>
              ) : countries.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No countries found
                </div>
              ) : (
                <>
                  {countries.map((country) => (
                    <div
                      key={country.code}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
                        selectedValues.includes(country.code)
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "hover:bg-slate-50 text-slate-600"
                      )}
                      onClick={() => handleSelect(country.code)}
                    >
                      <div className={cn(
                        "h-4 w-4 border border-slate-300 rounded flex items-center justify-center transition-colors",
                        selectedValues.includes(country.code) ? "bg-blue-600 border-blue-600" : "bg-white"
                      )}>
                        {selectedValues.includes(country.code) && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <FlagIcon countryCode={country.code} size="sm" className="shrink-0" />
                      <span className="truncate flex-1">{country.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{country.code}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 px-1">
                <span className="text-[10px] font-medium text-slate-400">
                  {page} / {pagination.totalPages}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="h-7 w-7 p-0 rounded-md border-slate-200 hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-7 w-7 p-0 rounded-md border-slate-200 hover:bg-slate-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export default MultiCountrySelect;
