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

  const handleSelect = (countryCode: string) => {
    const isSelected = value.includes(countryCode);
    let newValue: string[];
    
    if (isSelected) {
      newValue = value.filter((v) => v !== countryCode);
    } else {
      newValue = [...value, countryCode];
    }
    
    onValueChange?.(newValue);
  };

  const removeCountry = (countryCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.(value.filter((v) => v !== countryCode));
  };

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
          <div
            className={cn(
              "flex flex-wrap gap-2 p-2 min-h-[44px] w-full bg-white border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors",
              disabled && "opacity-50 cursor-not-allowed",
              error && "border-destructive focus-within:ring-destructive"
            )}
            onClick={() => !disabled && setOpen(!open)}
          >
            {value.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {value.map((v) => {
                  return (
                    <Badge
                      key={v}
                      variant="secondary"
                      className="bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1 pr-1"
                    >
                      <FlagIcon countryCode={v} size="xs" />
                      <span>{v}</span>
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-blue-900"
                        onClick={(e) => removeCountry(v, e)}
                      />
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <span className="text-slate-400 text-sm py-1 px-1">{placeholder}</span>
            )}
            <div className="ml-auto flex items-center pr-1">
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 shadow-xl border-slate-200 rounded-xl" align="start">
          <div className="p-2 space-y-2">
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

            <div className="max-h-[280px] overflow-y-auto pr-1 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200">
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
                        value.includes(country.code)
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "hover:bg-slate-50 text-slate-600"
                      )}
                      onClick={() => handleSelect(country.code)}
                    >
                      <div className={cn(
                        "h-4 w-4 border border-slate-300 rounded flex items-center justify-center transition-colors",
                        value.includes(country.code) ? "bg-blue-600 border-blue-600" : "bg-white"
                      )}>
                        {value.includes(country.code) && <Check className="h-3 w-3 text-white" />}
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
