import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useGetTopRecruiterStatsQuery } from "@/features/admin/api/adminDashboardApi";

export default function TopRecruiterCard() {
  const { data, isLoading, isError } = useGetTopRecruiterStatsQuery({});
  const topRecruiter = data?.data?.topRecruiter;

  const initials = topRecruiter?.name
    ? topRecruiter.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "TR";

  const name = topRecruiter?.name ?? "Top Recruiter";
  const role = topRecruiter?.role ?? "Recruiter";
  const placements = topRecruiter?.placementsThisMonth ?? 0;

  return (
    <Card className="border-0 shadow-sm rounded-xl bg-white flex flex-col justify-center">
      <CardContent className="p-6 flex flex-col items-center text-center gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            {topRecruiter?.avatarUrl && !isLoading ? (
              <AvatarImage src={topRecruiter.avatarUrl} alt={topRecruiter.name ?? "Top recruiter"} />
            ) : (
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-indigo-400 to-purple-500 text-white">
                {isLoading ? "..." : initials}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white rounded-full p-1">
            <Award className="h-4 w-4" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-800">{name}</h3>
          <p className="text-sm text-slate-500">{role}</p>
          {topRecruiter?.email && (
            <p className="text-xs text-slate-400">Email: {topRecruiter.email}</p>
          )}
          {topRecruiter?.phone && (
            <p className="text-xs text-slate-400">Phone: {topRecruiter.phone}</p>
          )}
        </div>

        <Badge variant="secondary" className="text-sm px-3 py-1">
          {isLoading ? "Loading..." : `${placements} placements this month`}
        </Badge>

        {isError && (
          <p className="text-xs text-red-500 uppercase tracking-wider font-medium">
            Failed to load top recruiter stats
          </p>
        )}

        {!isError && (
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
            Top Recruiter of the Month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
