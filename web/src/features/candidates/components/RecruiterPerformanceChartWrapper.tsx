import React, { useMemo } from "react";
import { useGetRecruiterPerformanceQuery } from "@/features/admin/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { 
  UserCircle2, 
  TrendingUp, 
  Users, 
  ClipboardCheck, 
  UserCheck, 
  Briefcase,
  Calendar
} from "lucide-react";

interface RecruiterPerformanceChartWrapperProps {
  recruiterId?: string;
  recruiterName?: string;
}

// Custom tooltip component for better UX
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4 min-w-[200px]">
        <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-sm">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="font-semibold text-gray-900">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const RecruiterPerformanceChartWrapper: React.FC<RecruiterPerformanceChartWrapperProps> = ({
  recruiterId,
  recruiterName,
}) => {
  const currentYear = new Date().getFullYear();
  const [timeFilter, setTimeFilter] = React.useState<"6m" | "1y" | "2y" | "all">("1y");
  
  const { data, isLoading, error } = useGetRecruiterPerformanceQuery(
    { recruiterId: recruiterId!, year: currentYear },
    { skip: !recruiterId || recruiterId === "all" }
  );

  // Process chart data
  const { chartData, summaryStats } = useMemo(() => {
    if (!data?.data) return { chartData: [], summaryStats: null };

    const performanceData = data.data;
    const formattedData = performanceData.map((item) => ({
      ...item,
      monthLabel: `${item.month.substring(0, 3)} '${item.year.toString().slice(-2)}`,
    }));

    // Filter based on time range
    let filtered: typeof formattedData;
    if (timeFilter === "6m") {
      filtered = formattedData.slice(-6);
    } else if (timeFilter === "1y") {
      filtered = formattedData.slice(-12);
    } else if (timeFilter === "2y") {
      filtered = formattedData.slice(-24);
    } else {
      filtered = formattedData;
    }

    // Calculate summary stats
    const stats = {
      totalAssigned: filtered.reduce((sum, d) => sum + d.assigned, 0),
      totalScreening: filtered.reduce((sum, d) => sum + d.screening, 0),
      totalInterview: filtered.reduce((sum, d) => sum + d.interview, 0),
      totalSelected: filtered.reduce((sum, d) => sum + d.selected, 0),
      totalJoined: filtered.reduce((sum, d) => sum + d.joined, 0),
    };

    return { chartData: filtered, summaryStats: stats };
  }, [data, timeFilter]);

  if (!recruiterId || recruiterId === "all") {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-blue-50/30 overflow-hidden">
        <CardContent className="h-[280px] flex flex-col items-center justify-center text-slate-400 space-y-4">
          <div className="p-5 bg-white rounded-2xl shadow-sm">
            <UserCircle2 className="h-14 w-14 text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-slate-500">Performance Trend</p>
            <p className="text-sm text-slate-400 mt-1">Select a recruiter to view their monthly performance</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-white/90 overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-lg" />
            <div className="h-10 w-36 bg-slate-200 animate-pulse rounded-lg" />
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="h-[200px] w-full bg-slate-100 animate-pulse rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card className="border-0 shadow-lg bg-red-50/50 overflow-hidden">
        <CardContent className="h-[280px] flex items-center justify-center text-red-500">
          <p className="font-medium">Failed to load performance data.</p>
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    { label: "Assigned", value: summaryStats?.totalAssigned || 0, icon: Users, color: "from-blue-500 to-cyan-500", bgColor: "bg-blue-50" },
    { label: "Screening", value: summaryStats?.totalScreening || 0, icon: ClipboardCheck, color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-50" },
    { label: "Interview", value: summaryStats?.totalInterview || 0, icon: Calendar, color: "from-amber-500 to-orange-500", bgColor: "bg-amber-50" },
    { label: "Selected", value: summaryStats?.totalSelected || 0, icon: UserCheck, color: "from-violet-500 to-purple-500", bgColor: "bg-violet-50" },
    { label: "Joined", value: summaryStats?.totalJoined || 0, icon: Briefcase, color: "from-pink-500 to-rose-500", bgColor: "bg-pink-50" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-0 shadow-lg bg-white/90 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/20">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800">
                  Performance Trend
                </CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  {recruiterName || "Recruiter"} • Monthly Progress
                </p>
              </div>
            </div>
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
              <SelectTrigger className="w-36 h-9 bg-gray-50 border-gray-200 rounded-lg text-sm">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last 1 Year</SelectItem>
                <SelectItem value="2y">Last 2 Years</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`${stat.bgColor} rounded-xl p-3 text-center`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <stat.icon className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-gray-800">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-gray-50/50 rounded-xl p-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorAssigned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorScreening" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInterview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSelected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorJoined" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="monthLabel" 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: 10 }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="assigned"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorAssigned)"
                  name="Assigned"
                />
                <Area
                  type="monotone"
                  dataKey="screening"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorScreening)"
                  name="Screening"
                />
                <Area
                  type="monotone"
                  dataKey="interview"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#colorInterview)"
                  name="Interview"
                />
                <Area
                  type="monotone"
                  dataKey="selected"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#colorSelected)"
                  name="Selected"
                />
                <Area
                  type="monotone"
                  dataKey="joined"
                  stroke="#ec4899"
                  strokeWidth={2}
                  fill="url(#colorJoined)"
                  name="Joined"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
