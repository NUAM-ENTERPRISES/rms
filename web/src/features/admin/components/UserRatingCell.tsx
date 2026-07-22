import { RecruiterPerformanceRatingStars } from "@/features/candidates/components/RecruiterPerformanceRatingStars";
import { roleNameHasRecruiterCapabilities } from "@/features/admin/constants/recruiter-capability-roles";
import type { PerformanceRatingLabel } from "@/features/candidates/utils/recruiter-performance-rating.util";

interface UserRatingCellProps {
  userRoles: Array<{ role: { name: string } }>;
  /** Pre-fetched rating from batch API; avoids per-row network calls. */
  rating?: { score: number; rating: string } | null;
  isLoading?: boolean;
}

export function UserRatingCell({
  userRoles,
  rating,
  isLoading = false,
}: UserRatingCellProps) {
  const isRecruiter = userRoles.some((ur) =>
    roleNameHasRecruiterCapabilities(ur.role.name),
  );

  if (!isRecruiter) {
    return <span className="text-xs italic text-slate-400">N/A</span>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-1">
        <div className="h-3 w-3 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-3 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-3 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (!rating) {
    return <span className="text-xs italic text-slate-400">—</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <RecruiterPerformanceRatingStars
        rating={rating.rating as PerformanceRatingLabel}
        size="sm"
      />
      <span className="text-xs font-semibold tabular-nums text-foreground">
        {rating.score}
      </span>
    </div>
  );
}

export default UserRatingCell;
