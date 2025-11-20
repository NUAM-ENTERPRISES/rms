/**
 * Country Select component - molecule for country selection
 * Following FE_GUIDELINES.md molecules pattern
 */

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FlagIcon } from "@/shared";
import { useCountriesLookup, Country } from "@/shared/hooks/useCountriesLookup";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";

export interface CountrySelectProps {
  /** Current selected country code */
  value?: string;
  /** Callback when country changes */
  onValueChange?: (countryCode: string) => void;
  /** Input name for forms */
  name?: string;
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show "No country" option */
  allowEmpty?: boolean;
  /** Group countries by region */
  groupByRegion?: boolean;
}

/**
 * CountrySelect component for selecting countries in forms
 */
export function CountrySelect({
  value,
  onValueChange,
  name,
  label,
  placeholder = "Select a country",
  required = false,
  disabled = false,
  error,
  className,
  allowEmpty = true,
  groupByRegion = false,
}: CountrySelectProps) {
  const { countries, isLoading, error: apiError } = useCountriesLookup();

  // Group countries by region if requested
  const countryGroups = React.useMemo(() => {
    if (!groupByRegion) {
      return { "All Countries": countries };
    }

    return countries.reduce(
      (groups: Record<string, Country[]>, country: Country) => {
        const region = country.region || "Other";
        if (!groups[region]) {
          groups[region] = [];
        }
        groups[region].push(country);
        return groups;
      },
      {} as Record<string, Country[]>
    );
  }, [countries, groupByRegion]);

  const handleValueChange = (newValue: string) => {
    if (newValue === "__empty__") {
      onValueChange?.("");
    } else {
      onValueChange?.(newValue);
    }
  };

  const selectedCountry = countries.find((c: Country) => c.code === value);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={name} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <Select
        value={value || (allowEmpty ? "__empty__" : "")}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
        name={name}
      >
        <SelectTrigger
          className={cn(
            "w-full",
            error && "border-destructive focus:ring-destructive"
          )}
        >
          <SelectValue placeholder={placeholder}>
            {value && selectedCountry ? (
              <div className="flex items-center gap-2">
                <FlagIcon countryCode={value} size="sm" />
                <span>{selectedCountry.name}</span>
              </div>
            ) : (
              placeholder
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading countries...
              </span>
            </div>
          ) : apiError ? (
            <div className="px-3 py-2 text-sm text-destructive">
              Failed to load countries
            </div>
          ) : (
            <>
              {allowEmpty && (
                <SelectItem value="__empty__">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-muted rounded border" />
                    <span className="text-muted-foreground">No country</span>
                  </div>
                </SelectItem>
              )}

              {Object.entries(countryGroups).map(
                ([regionName, regionCountries]) => (
                  <div key={regionName}>
                    {groupByRegion && Object.keys(countryGroups).length > 1 && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {regionName}
                      </div>
                    )}
                    {(regionCountries as Country[]).map((country: Country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <div className="flex items-center gap-2">
                          <FlagIcon countryCode={country.code} size="sm" />
                          <span>{country.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {country.code}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </SelectContent>
      </Select>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export default CountrySelect;
