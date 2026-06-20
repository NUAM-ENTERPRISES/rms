import { useGetRecruiterPerformanceRatingQuery } from "@/services/recruiterAnalyticsApi";
import { RecruiterPerformanceRatingStars } from "@/features/candidates/components/RecruiterPerformanceRatingStars";
import { roleNameHasRecruiterCapabilities } from "@/features/admin/constants/recruiter-capability-roles";
import type { PerformanceRatingLabel } from "@/features/candidates/utils/recruiter-performance-rating.util";

interface UserRatingCellProps {
  userId: string;
  userRoles: Array<{ role: { name: string } }>;
}

export function UserRatingCell({ userId, userRoles }: UserRatingCellProps) {
  const isRecruiter = userRoles.some((ur) =>
    roleNameHasRecruiterCapabilities(ur.role.name)
  );

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const { data, isLoading } = useGetRecruiterPerformanceRatingQuery(
    {
      recruiterId: userId,
      year: currentYear,
      month: currentMonth,
    },
    { skip: !isRecruiter }
  );

  if (!isRecruiter) {
    return (
      <span className="text-xs text-slate-400 italic">N/A</span>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-1">
        <div className="h-3 w-3 rounded-full bg-slate-200 animate-pulse" />
        <div className="h-3 w-3 rounded-full bg-slate-200 animate-pulse" />
        <div className="h-3 w-3 rounded-full bg-slate-200 animate-pulse" />
      </div>
    );
  }

  const monthlyData = data?.data?.monthly;

  if (!monthlyData) {
    return (
      <span className="text-xs text-slate-400 italic">—</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <RecruiterPerformanceRatingStars
        rating={monthlyData.rating as PerformanceRatingLabel}
        size="sm"
      />
      <span className="text-xs font-semibold text-slate-700 tabular-nums">
        {monthlyData.score}
      </span>
    </div>
  );
}

export default UserRatingCell;
