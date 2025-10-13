/**
 * Shared FlagIcon component - displays country flags
 * Following FE_GUIDELINES.md shared pattern
 */

import React from "react";
import { cn } from "@/lib/utils";
import "flag-icons/css/flag-icons.min.css";

export interface FlagIconProps {
  /** ISO-2 country code (e.g., "US", "GB", "IN") */
  countryCode?: string | null;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** Additional CSS classes */
  className?: string;
  /** Show fallback when no country code */
  showFallback?: boolean;
  /** Fallback content when no country code */
  fallback?: React.ReactNode;
  /** Accessibility label */
  "aria-label"?: string;
}

const sizeClasses = {
  sm: "w-4 h-3",
  md: "w-6 h-4",
  lg: "w-8 h-6",
  xl: "w-12 h-9",
  "2xl": "w-16 h-12",
  "3xl": "w-20 h-16",
};

/**
 * FlagIcon component for displaying country flags
 * Uses flag-icons library for consistent flag display
 */
export function FlagIcon({
  countryCode,
  size = "md",
  className,
  showFallback = true,
  fallback,
  "aria-label": ariaLabel,
}: FlagIconProps) {
  // Normalize country code
  const normalizedCode = countryCode?.toLowerCase();

  // If no country code and fallback is disabled, return null
  if (!normalizedCode && !showFallback) {
    return null;
  }

  // If no country code but fallback is enabled
  if (!normalizedCode) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default fallback - globe icon
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded border border-border bg-muted text-muted-foreground",
          sizeClasses[size],
          className
        )}
        aria-label={ariaLabel || "No country specified"}
        role="img"
      >
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    );
  }

  return (
    <span
      className={cn(
        `fi fi-${normalizedCode} inline-block rounded border border-border`,
        `text-${size}`,
        className
      )}
      aria-label={ariaLabel || `Flag of ${countryCode?.toUpperCase()}`}
      role="img"
      title={countryCode?.toUpperCase()}
    />
  );
}

/**
 * FlagIcon with country name component
 */
export interface FlagWithNameProps extends Omit<FlagIconProps, "aria-label"> {
  /** Country name to display */
  countryName?: string;
  /** Show country code in parentheses */
  showCode?: boolean;
  /** Layout direction */
  layout?: "horizontal" | "vertical";
}

export function FlagWithName({
  countryCode,
  countryName,
  showCode = false,
  layout = "horizontal",
  size = "md",
  className,
  ...flagProps
}: FlagWithNameProps) {
  const displayName = countryName || countryCode?.toUpperCase() || "Unknown";
  const codeText =
    showCode && countryCode ? ` (${countryCode.toUpperCase()})` : "";

  if (layout === "vertical") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-1 text-center",
          className
        )}
      >
        <FlagIcon
          countryCode={countryCode}
          size={size}
          aria-label={`Flag of ${displayName}`}
          {...flagProps}
        />
        <span className="text-sm text-foreground">
          {displayName}
          {codeText}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <FlagIcon
        countryCode={countryCode}
        size={size}
        aria-label={`Flag of ${displayName}`}
        {...flagProps}
      />
      <span className="text-sm text-foreground">
        {displayName}
        {codeText}
      </span>
    </div>
  );
}

export default FlagIcon;
