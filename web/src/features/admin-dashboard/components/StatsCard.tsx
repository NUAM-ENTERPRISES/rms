import type { StatCard } from "../data/mockData";
import { Card, CardContent } from "@/components/ui/card";

const colorMap: Record<string, { bg: string; iconBg: string; text: string }> = {
  indigo:  { bg: "bg-indigo-50",  iconBg: "bg-indigo-100", text: "text-indigo-600"  },
  emerald: { bg: "bg-emerald-50", iconBg: "bg-emerald-100", text: "text-emerald-600" },
  amber:   { bg: "bg-amber-50",   iconBg: "bg-amber-100",  text: "text-amber-600"   },
  teal:    { bg: "bg-teal-50",    iconBg: "bg-teal-100",   text: "text-teal-600"    },
};

type StatsCardProps = {
  stat: StatCard;
};

export default function StatsCard({ stat }: StatsCardProps) {
  const colors = colorMap[stat.color] ?? colorMap.indigo;
  const Icon = stat.icon;

  return (
    <Card className={`border-0 shadow-sm rounded-xl ${colors.bg} hover:shadow-md transition-shadow`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{stat.title}</p>
            <h3 className={`text-3xl font-bold mt-1 ${colors.text}`}>{stat.value}</h3>
            <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
          </div>
          <div className={`p-3 rounded-full ${colors.iconBg}`}>
            <Icon className={`h-6 w-6 ${colors.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
