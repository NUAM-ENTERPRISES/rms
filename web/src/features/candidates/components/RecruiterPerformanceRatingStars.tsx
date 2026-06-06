import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PERFORMANCE_RATING,
  getRatingStarCount,
  isEliteRating,
  NAV_RATING_STAR_TOTAL,
  RATING_MEDAL_CONFIG,
  type PerformanceRatingLabel,
} from "../utils/recruiter-performance-rating.util";

export type RecruiterPerformanceRatingStarsProps = {
  rating: PerformanceRatingLabel | string;
  /** sm = navbar, md = snapshots, lg = dashboard hero */
  size?: "sm" | "md" | "lg";
  /** nav = dark header; dashboard = light cards */
  variant?: "nav" | "dashboard";
  className?: string;
};

const ICON_SIZE: Record<NonNullable<RecruiterPerformanceRatingStarsProps["size"]>, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-6 w-6 sm:h-7 sm:w-7",
};

const GAP_SIZE: Record<NonNullable<RecruiterPerformanceRatingStarsProps["size"]>, string> = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1 sm:gap-1.5",
};

function resolveStarFill(rating: PerformanceRatingLabel | string) {
  if (rating in RATING_MEDAL_CONFIG) {
    return RATING_MEDAL_CONFIG[rating as PerformanceRatingLabel].starFill;
  }
  return RATING_MEDAL_CONFIG[DEFAULT_PERFORMANCE_RATING].starFill;
}

export function RecruiterPerformanceRatingStars({
  rating,
  size = "md",
  variant = "dashboard",
  className,
}: RecruiterPerformanceRatingStarsProps) {
  const filled = getRatingStarCount(rating);
  const isElite = isEliteRating(rating);
  const filledStarClass = resolveStarFill(rating);
  const emptyStarClass =
    variant === "nav" ? "fill-transparent text-violet-400/35" : "fill-transparent text-slate-200/70";

  return (
    <div
      className={cn(
        "flex items-center",
        GAP_SIZE[size],
        variant === "dashboard" && size === "lg" && "rounded-2xl px-1",
        className,
      )}
      role="img"
      aria-label={
        isElite
          ? `Elite top tier performance rating`
          : `${filled} of ${NAV_RATING_STAR_TOTAL} stars for ${rating} rating`
      }
    >
      {Array.from({ length: NAV_RATING_STAR_TOTAL }, (_, index) => {
        const isFilled = index < filled;
        return (
          <Star
            key={index}
            className={cn(
              ICON_SIZE[size],
              "shrink-0 transition-all duration-300",
              isFilled
                ? cn(
                    "drop-shadow-sm",
                    filledStarClass,
                    isElite
                      ? "animate-nav-recruiter-star-glow"
                      : "animate-nav-recruiter-star-pulse",
                  )
                : emptyStarClass,
            )}
            style={
              isFilled ? { animationDelay: `${index * 0.15}s` } : undefined
            }
            aria-hidden
          />
        );
      })}
    </div>
  );
}

export default RecruiterPerformanceRatingStars;
