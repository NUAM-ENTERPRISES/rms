import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { topRecruiter } from "../data/mockData";

export default function TopRecruiterCard() {
  return (
    <Card className="border-0 shadow-sm rounded-xl bg-white flex flex-col justify-center">
      <CardContent className="p-6 flex flex-col items-center text-center gap-4">
        {/* Avatar placeholder */}
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {topRecruiter.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white rounded-full p-1">
            <Award className="h-4 w-4" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            {topRecruiter.name}
          </h3>
          <p className="text-sm text-slate-500">{topRecruiter.role}</p>
        </div>

        <Badge variant="secondary" className="text-sm px-3 py-1">
          {topRecruiter.placementsThisMonth} placements this month
        </Badge>

        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
          Top Recruiter of the Month
        </p>
      </CardContent>
    </Card>
  );
}
