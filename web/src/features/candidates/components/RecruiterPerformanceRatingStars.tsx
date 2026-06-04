import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRatingStarCount,
  NAV_RATING_STAR_TOTAL,
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

export function RecruiterPerformanceRatingStars({
  rating,
  size = "md",
  variant = "dashboard",
  className,
}: RecruiterPerformanceRatingStarsProps) {
  const filled = getRatingStarCount(rating);
  const isTopTier = rating === "Top Performer";
  const emptyStarClass =
    variant === "nav" ? "fill-transparent text-violet-400/35" : "fill-transparent text-amber-200/50";

  return (
    <div
      className={cn("flex items-center", GAP_SIZE[size], className)}
      role="img"
      aria-label={`${filled} of ${NAV_RATING_STAR_TOTAL} stars for ${rating} rating`}
    >
      {Array.from({ length: NAV_RATING_STAR_TOTAL }, (_, index) => {
        const isFilled = index < filled;
        return (
          <Star
            key={index}
            className={cn(
              ICON_SIZE[size],
              "shrink-0 transition-colors",
              isFilled
                ? cn(
                    "fill-amber-400 text-amber-500",
                    isTopTier
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
