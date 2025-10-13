import React from "react";
import { useHasRole } from "@/hooks/useCan";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Can } from "@/components/auth/Can";
import {
  Users,
  Briefcase,
  UserCheck,
  Building2,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Calendar,
  Cog,
  FileText,
  Target,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Award,
  Zap,
  Globe,
  Shield,
  Heart,
  PieChart,
  BarChart,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Mock data for charts
const monthlyData = [
  {
    month: "Jan",
    placements: 45,
    revenue: 125000,
    candidates: 89,
    projects: 12,
  },
  {
    month: "Feb",
    placements: 52,
    revenue: 138000,
    candidates: 94,
    projects: 15,
  },
  {
    month: "Mar",
    placements: 48,
    revenue: 132000,
    candidates: 87,
    projects: 13,
  },
  {
    month: "Apr",
    placements: 61,
    revenue: 156000,
    candidates: 103,
    projects: 18,
  },
  {
    month: "May",
    placements: 55,
    revenue: 142000,
    candidates: 96,
    projects: 16,
  },
  {
    month: "Jun",
    placements: 67,
    revenue: 168000,
    candidates: 112,
    projects: 20,
  },
  {
    month: "Jul",
    placements: 58,
    revenue: 148000,
    candidates: 98,
    projects: 17,
  },
  {
    month: "Aug",
    placements: 72,
    revenue: 184000,
    candidates: 118,
    projects: 22,
  },
];

const teamPerformanceData = [
  {
    name: "Healthcare",
    success: 96.8,
    members: 8,
    projects: 12,
    revenue: 284000,
  },
  {
    name: "IT & Tech",
    success: 94.2,
    members: 6,
    projects: 8,
    revenue: 198000,
  },
  { name: "Finance", success: 92.1, members: 5, projects: 6, revenue: 156000 },
  {
    name: "Manufacturing",
    success: 89.5,
    members: 7,
    projects: 10,
    revenue: 245000,
  },
];

const revenueBreakdown = [
  { name: "Healthcare", value: 35, color: "hsl(var(--chart-1))" },
  { name: "IT & Technology", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Finance", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Manufacturing", value: 15, color: "hsl(var(--chart-4))" },
  { name: "Other", value: 5, color: "hsl(var(--chart-5))" },
];

const candidateStatusData = [
  {
    status: "Active",
    count: 2847,
    percentage: 45,
    color: "hsl(var(--chart-2))",
  },
  {
    status: "Interviewing",
    count: 892,
    percentage: 28,
    color: "hsl(var(--chart-1))",
  },
  {
    status: "Placed",
    count: 1563,
    percentage: 18,
    color: "hsl(var(--chart-3))",
  },
  {
    status: "Rejected",
    count: 234,
    percentage: 9,
    color: "hsl(var(--destructive))",
  },
];

// Admin Dashboard Component
const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">$284,573</div>
            <div className="flex items-center text-sm text-emerald-600 mt-1">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +12.5% from last month
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Active Projects
            </CardTitle>
            <Briefcase className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">28</div>
            <div className="flex items-center text-sm text-blue-600 mt-1">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +3 new this week
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Candidates
            </CardTitle>
            <UserCheck className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">2,847</div>
            <div className="flex items-center text-sm text-purple-600 mt-1">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +23% from last month
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Success Rate
            </CardTitle>
            <Target className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">94.2%</div>
            <div className="flex items-center text-sm text-orange-600 mt-1">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +2.1% from last month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">
            Revenue Trend Analysis
          </CardTitle>
          <CardDescription>
            Monthly revenue and placement trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-2))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2, r: 4 }}
                name="Revenue ($)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="placements"
                stroke="hsl(var(--chart-1))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2, r: 4 }}
                name="Placements"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Team Performance Rankings
            </CardTitle>
            <CardDescription>Success rates and revenue by team</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={teamPerformanceData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="success"
                  fill="hsl(var(--chart-2))"
                  name="Success Rate (%)"
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--chart-1))"
                  name="Revenue ($K)"
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Revenue Breakdown
            </CardTitle>
            <CardDescription>Revenue distribution by sector</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="hsl(var(--chart-3))"
                  dataKey="value"
                >
                  {revenueBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Candidate Analytics */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">
            Candidate Pipeline Analytics
          </CardTitle>
          <CardDescription>
            Current candidate status distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {candidateStatusData.map((item, index) => (
              <div key={index} className="text-center">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: item.color + "20" }}
                >
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                </div>
                <div className="text-2xl font-bold text-slate-800">
                  {item.count}
                </div>
                <div className="text-sm font-medium text-slate-600">
                  {item.status}
                </div>
                <div className="text-xs text-slate-500">
                  {item.percentage}% of total
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Quick Actions
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/projects">
                <Briefcase className="mr-2 h-4 w-4" />
                Create Project
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/teams">
                <Building2 className="mr-2 h-4 w-4" />
                Manage Teams
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/clients">
                <Heart className="mr-2 h-4 w-4" />
                Add Client
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system updates and actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  action: "New project created",
                  detail: "Healthcare Staffing - City General",
                  time: "2 hours ago",
                  icon: Plus,
                  color: "text-blue-600",
                },
                {
                  action: "Candidate placed",
                  detail: "Sarah Johnson → Metro Medical",
                  time: "4 hours ago",
                  icon: CheckCircle,
                  color: "text-green-600",
                },
                {
                  action: "Client onboarded",
                  detail: "Regional Staffing Solutions",
                  time: "6 hours ago",
                  icon: Building2,
                  color: "text-purple-600",
                },
                {
                  action: "Team member added",
                  detail: "Emma Davis to Healthcare Team",
                  time: "8 hours ago",
                  icon: Users,
                  color: "text-orange-600",
                },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-slate-100 ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">
                      {item.action}
                    </div>
                    <div className="text-xs text-slate-600">{item.detail}</div>
                    <div className="text-xs text-slate-500">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-slate-800">Excellent</div>
              <div className="text-sm text-slate-500">
                All systems operational
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-slate-800">2</div>
              <div className="text-sm text-slate-500">Requires attention</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Performance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center mx-auto mb-3">
                <Star className="h-8 w-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-slate-800">A+</div>
              <div className="text-sm text-slate-500">Top tier performance</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Manager Dashboard Component
const ManagerDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">94.2%</div>
            <div className="flex items-center text-sm text-emerald-600 mt-1">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +5.1% from last month
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">8</div>
            <div className="flex items-center text-sm text-blue-600 mt-1">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +2 new this week
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">12</div>
            <div className="flex items-center text-sm text-purple-600 mt-1">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +1 new hire
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Chart */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">
            Team Performance Trend
          </CardTitle>
          <CardDescription>Monthly performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="placements"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.3}
                strokeWidth={2}
                name="Placements"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">
            Quick Actions
          </CardTitle>
          <CardDescription>Common team management tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link to="/teams">
              <Users className="mr-2 h-4 w-4" />
              Manage Team
            </Link>
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link to="/projects">
              <Briefcase className="mr-2 h-4 w-4" />
              View Projects
            </Link>
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link to="/candidates">
              <UserCheck className="mr-2 h-4 w-4" />
              Review Candidates
            </Link>
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link to="/clients">
              <Building2 className="mr-2 h-4 w-4" />
              Client Overview
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Dashboard Component
export default function DashboardPage() {
  const isAdmin = useHasRole(["CEO", "Director"]);

  return (
    <div className="min-h-screen  ">
      <div className="w-full mx-auto">
        {isAdmin ? <AdminDashboard /> : <ManagerDashboard />}
      </div>
    </div>
  );
}
