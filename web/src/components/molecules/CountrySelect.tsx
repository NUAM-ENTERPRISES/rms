/**
 * Country Select component - molecule for country selection
 * Following FE_GUIDELINES.md molecules pattern
 */

import { useState } from "react";
import { Check, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks";
import { FlagIcon } from "@/shared";
import { useCountriesLookup, useGetCountryByCodeQuery } from "@/shared/hooks/useCountriesLookup";

export interface CountrySelectProps {
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
  /** @deprecated handled by pagination now */
  groupByRegion?: boolean;
  name?: string;
  skip?: boolean;
  /** Optional initial country data to avoid extra fetch */
  initialCountryData?: { code: string; name: string };
  /** Pin a virtual GCC group option at the top of the list */
  includeGccOption?: boolean;
}

const GCC_OPTION = { code: "GCC", name: "GCC (all GCC countries)" } as const;
const GCC_COUNTRY_CODES = ["SA", "AE", "QA", "OM", "BH", "KW"] as const;

function GccFlags({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-0.5", className)}
      aria-hidden
    >
      {GCC_COUNTRY_CODES.map((code) => (
        <FlagIcon key={code} countryCode={code} size="sm" className="shrink-0" />
      ))}
    </span>
  );
}

export function CountrySelect({
  value = "",
  onValueChange,
  label,
  placeholder = "Select a country...",
  required = false,
  disabled = false,
  error,
  className,
  allowEmpty = true,
  pageSize = 20,
  skip = false,
  initialCountryData,
  includeGccOption = false,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Use the updated hook with pagination params
  const { countries, pagination, isLoading } = useCountriesLookup(
    {
      search: debouncedSearch,
      page,
      limit: pageSize,
    },
    { skip }
  );

  const handleSelect = (countryCode: string) => {
    onValueChange?.(countryCode === value ? "" : countryCode);
    setOpen(false);
  };

  const selectedCountry = countries.find((c) => c.code === value);
  const showGccOption =
    includeGccOption &&
    (!debouncedSearch.trim() ||
      "gcc".includes(debouncedSearch.trim().toLowerCase()) ||
      debouncedSearch.trim().toLowerCase().includes("gcc"));

  // if the current page of countries doesn't include the selected value,
  // fetch it explicitly so the button can show its name.
  // We SKIP this if initialCountryData is provided and matches, or value is GCC.
  const shouldSkipFetch =
    !value ||
    value === GCC_OPTION.code ||
    !!selectedCountry ||
    (initialCountryData?.code === value);
  const { data: fetchedCountry } = useGetCountryByCodeQuery(value, {
    skip: shouldSkipFetch,
  });

  const displayCountry =
    value === GCC_OPTION.code
      ? GCC_OPTION
      : selectedCountry ||
        (initialCountryData?.code === value
          ? initialCountryData
          : fetchedCountry);

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
              "w-full justify-between bg-white border-slate-200 hover:bg-slate-50 text-left font-normal",
              value === GCC_OPTION.code ? "h-auto min-h-11 py-2" : "h-11",
              !value && "text-muted-foreground",
              error && "border-destructive focus:ring-destructive"
            )}
            disabled={disabled}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
              {value && displayCountry ? (
                value === GCC_OPTION.code ? (
                  <>
                    <GccFlags className="shrink-0" />
                    <span className="truncate font-medium text-slate-800">
                      GCC
                    </span>
                    <span className="hidden truncate text-xs text-slate-500 sm:inline">
                      SA · AE · QA · OM · BH · KW
                    </span>
                  </>
                ) : (
                  <>
                    <FlagIcon countryCode={value} size="sm" className="shrink-0" />
                    <span className="truncate">{displayCountry.name}</span>
                  </>
                )
              ) : (
                <span className="text-slate-400">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 shadow-xl border-slate-200 rounded-xl" align="start">
          <div className="p-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search countries..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // Reset to page 1 on search
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
              ) : (
                <>
                  {allowEmpty && !search && (
                    <div
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm hover:bg-slate-50",
                        !value && "bg-blue-50 text-blue-700 font-medium"
                      )}
                      onClick={() => handleSelect("")}
                    >
                      <Check className={cn("h-4 w-4 shrink-0", !value ? "opacity-100" : "opacity-0")} />
                      <div className="w-4 h-3 bg-slate-100 rounded border border-slate-200" />
                      <span>No country</span>
                    </div>
                  )}
                  {showGccOption && (
                    <div
                      className={cn(
                        "flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm",
                        value === GCC_OPTION.code
                          ? "bg-teal-50 text-teal-800 font-medium"
                          : "hover:bg-slate-50 text-slate-600"
                      )}
                      onClick={() => handleSelect(GCC_OPTION.code)}
                      role="option"
                      aria-selected={value === GCC_OPTION.code}
                      aria-label="GCC, all GCC countries: Saudi Arabia, UAE, Qatar, Oman, Bahrain, Kuwait"
                    >
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          value === GCC_OPTION.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800">
                            GCC
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            6 countries
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {GCC_COUNTRY_CODES.map((code) => (
                            <span
                              key={code}
                              className="inline-flex items-center gap-1 rounded border border-teal-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-teal-800"
                            >
                              <FlagIcon countryCode={code} size="sm" />
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {countries.length === 0 && !showGccOption ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      No countries found
                    </div>
                  ) : (
                    countries.map((country) => (
                      <div
                        key={country.code}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
                          value === country.code
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "hover:bg-slate-50 text-slate-600"
                        )}
                        onClick={() => handleSelect(country.code)}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            value === country.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <FlagIcon countryCode={country.code} size="sm" className="shrink-0" />
                        <span className="truncate flex-1">{country.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{country.code}</span>
                      </div>
                    ))
                  )}
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

export default CountrySelect;
