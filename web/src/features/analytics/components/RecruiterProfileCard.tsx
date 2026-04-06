import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface RecruiterProfileCardProps {
  recruiter?: {
    name: string;
    role: string;
    avatarUrl?: string;
    hireCount: number;
    email?: string;
    phone?: string;
  };
  isLoading?: boolean;
}

export default function RecruiterProfileCard({
  recruiter,
  isLoading,
}: RecruiterProfileCardProps) {
  const initials = recruiter?.name
    ? recruiter.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "RC";

  return (
    <Card className="border-0 shadow-sm rounded-xl bg-white flex flex-col justify-center h-full">
      <CardContent className="p-6 flex flex-col items-center text-center gap-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4 flex flex-col items-center w-full">
            <div className="h-20 w-20 rounded-full bg-slate-200" />
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="h-3 w-1/2 bg-slate-200 rounded" />
            <div className="h-8 w-full bg-slate-200 rounded" />
          </div>
        ) : (
          <>
            <div className="relative">
              <Avatar className="h-20 w-20">
                {recruiter?.avatarUrl ? (
                  <AvatarImage src={recruiter.avatarUrl} alt={recruiter.name} />
                ) : (
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-indigo-400 to-purple-500 text-white">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white rounded-full p-1">
                <Award className="h-4 w-4" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {recruiter?.name || "Select Recruiter"}
              </h3>
              <p className="text-sm text-slate-500">
                {recruiter?.role || "Recruiter"}
              </p>
              {recruiter?.email && (
                <p className="text-xs text-slate-400 mt-1">{recruiter.email}</p>
              )}
            </div>

            <Badge
              variant="secondary"
              className="text-sm px-3 py-1 bg-indigo-50 text-indigo-700 border-indigo-100"
            >
              {recruiter?.hireCount || 0} hires total
            </Badge>

            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Recruiter Details
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
