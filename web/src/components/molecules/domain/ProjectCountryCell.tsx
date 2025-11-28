/**
 * ProjectCountryCell component - domain-specific molecule for project country display
 * Following FE_GUIDELINES.md molecules pattern
 */

import React from "react";
import { FlagWithName, useCountryValidation } from "@/shared";
import { cn } from "@/lib/utils";

export interface ProjectCountryCellProps {
  /** Country code (ISO-2) */
  countryCode?: string | null;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** Layout direction */
  layout?: "horizontal" | "vertical";
  /** Show country code in parentheses */
  showCode?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Fallback text when no country */
  fallbackText?: string;
}

/**
 * ProjectCountryCell component for displaying project country with flag
 * Used in project lists, details, and cards
 */
export function ProjectCountryCell({
  countryCode,
  size = "sm",
  layout = "horizontal",
  showCode = false,
  className,
  fallbackText = "Not specified",
}: ProjectCountryCellProps) {
  const { getCountryName } = useCountryValidation();

  if (!countryCode) {
    return (
      <span className={cn("text-muted-foreground text-sm", className)}>
        {fallbackText}
      </span>
    );
  }

  const countryName = getCountryName(countryCode);

  return (
    <div className={cn("flex items-center", className)}>
      <FlagWithName
        countryCode={countryCode}
        countryName={countryName || undefined}
        size={size}
        layout={layout}
        showCode={showCode}
      />
    </div>
  );
}

export default ProjectCountryCell;
