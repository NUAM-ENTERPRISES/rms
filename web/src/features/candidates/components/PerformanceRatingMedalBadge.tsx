import { Crown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PERFORMANCE_RATING,
  RATING_MEDAL_CONFIG,
  RATING_STYLES,
  type PerformanceRatingLabel,
} from "../utils/recruiter-performance-rating.util";

export type PerformanceRatingMedalBadgeProps = {
  rating: PerformanceRatingLabel | string;
  size?: "sm" | "md" | "lg";
  showTopTierLabel?: boolean;
  className?: string;
};

const TEXT_SIZE = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-xl sm:text-2xl",
} as const;

const ICON_WRAP_SIZE = {
  sm: "h-5 w-5 rounded-md",
  md: "h-6 w-6 rounded-lg",
  lg: "h-8 w-8 rounded-xl",
} as const;

const ICON_SIZE = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
} as const;

function resolveMedalConfig(rating: PerformanceRatingLabel | string) {
  if (rating in RATING_MEDAL_CONFIG) {
    return RATING_MEDAL_CONFIG[rating as PerformanceRatingLabel];
  }
  return RATING_MEDAL_CONFIG[DEFAULT_PERFORMANCE_RATING];
}

export function PerformanceRatingMedalBadge({
  rating,
  size = "md",
  showTopTierLabel = false,
  className,
}: PerformanceRatingMedalBadgeProps) {
  const medal = resolveMedalConfig(rating);
  const ratingClass =
    RATING_STYLES[rating] ?? RATING_STYLES[DEFAULT_PERFORMANCE_RATING];
  const Icon = medal.useCrown ? Crown : Medal;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-bold shadow-sm",
        size === "lg" && "px-4 py-2",
        ratingClass,
        className,
      )}
      aria-label={`${rating} performance medal`}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center bg-gradient-to-br shadow-sm",
          ICON_WRAP_SIZE[size],
          medal.medalGradient,
        )}
        aria-hidden
      >
        <Icon className={cn(ICON_SIZE[size], medal.iconColor)} />
      </span>
      <span className={cn("tracking-tight", TEXT_SIZE[size])}>{rating}</span>
      {medal.useCrown && showTopTierLabel ? (
        <span
          className={cn(
            "rounded-full border border-violet-200/80 bg-violet-100/80 px-2 py-0.5 font-semibold uppercase tracking-wider text-violet-800",
            size === "sm" ? "text-[9px]" : "text-[10px]",
          )}
        >
          Top Tier
        </span>
      ) : null}
    </span>
  );
}

export default PerformanceRatingMedalBadge;
