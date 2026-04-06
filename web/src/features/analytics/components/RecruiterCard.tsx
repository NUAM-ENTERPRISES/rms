import {
  Users,
  UserPlus,
  Send,
  CalendarCheck,
  CheckCircle,
  Award,
  LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Recruiter } from "../data/mockRecruiterData";

interface RecruiterCardProps {
  recruiter: Recruiter;
}

const colorMap: Record<string, { bg: string; iconBg: string; text: string }> = {
  blue:    { bg: "bg-blue-50",    iconBg: "bg-blue-100",    text: "text-blue-600"    },
  indigo:  { bg: "bg-indigo-50",  iconBg: "bg-indigo-100",  text: "text-indigo-600"  },
  emerald: { bg: "bg-emerald-50", iconBg: "bg-emerald-100", text: "text-emerald-600" },
  amber:   { bg: "bg-amber-50",   iconBg: "bg-amber-100",   text: "text-amber-600"   },
  teal:    { bg: "bg-teal-50",    iconBg: "bg-teal-100",    text: "text-teal-600"    },
  rose:    { bg: "bg-rose-50",    iconBg: "bg-rose-100",    text: "text-rose-600"    },
};

const statConfig: {
  key: keyof Recruiter["stats"];
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { key: "totalCandidates", title: "Total Candidates", description: "All candidates assigned", icon: Users, color: "blue" },
  { key: "candidatesAdded", title: "Candidates Added", description: "Total candidates sourced", icon: UserPlus, color: "indigo" },
  { key: "submitted", title: "Submitted to Client", description: "Profiles sent for review", icon: Send, color: "emerald" },
  { key: "interviewsScheduled", title: "Interviews Scheduled", description: "Interviews lined up", icon: CalendarCheck, color: "amber" },
  { key: "interviewsPassed", title: "Interviews Passed", description: "Successfully cleared", icon: CheckCircle, color: "teal" },
  { key: "hired", title: "Candidates Hired", description: "Offers accepted & joined", icon: Award, color: "rose" },
];

export default function RecruiterCard({ recruiter }: RecruiterCardProps) {
  const scoreColor =
    recruiter.score >= 90
      ? "text-emerald-600"
      : recruiter.score >= 75
      ? "text-blue-600"
      : "text-amber-600";

  const barColor =
    recruiter.score >= 90
      ? "bg-emerald-500"
      : recruiter.score >= 75
      ? "bg-blue-500"
      : "bg-amber-500";

  return (
    <div className="space-y-6">
      {/* Profile + Score Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={recruiter.avatar}
            alt={recruiter.name}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100"
          />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{recruiter.name}</h3>
            <p className="text-sm text-gray-500">{recruiter.role}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Score</p>
            <p className={`text-2xl font-bold ${scoreColor}`}>
              {recruiter.score}<span className="text-sm font-normal text-gray-400"> / 100</span>
            </p>
          </div>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${recruiter.score}%` }}
          />
        </div>
      </div>

      {/* Stat Tiles — same style as admin dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
        {statConfig.map(({ key, title, icon: Icon, color }) => {
          const colors = colorMap[color] ?? colorMap.indigo;
          return (
            <Card
              key={key}
              className={`border-0 shadow-sm rounded-xl ${colors.bg} hover:shadow-md transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight truncate">
                      {title}
                    </p>
                    <h3 className={`text-2xl font-bold mt-0.5 ${colors.text}`}>
                      {recruiter.stats[key]}
                    </h3>
                  </div>
                  <div className={`p-2 rounded-lg ${colors.iconBg} shrink-0`}>
                    <Icon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
