import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamStats } from "../api";
import {
  useGetTeamPerformanceAnalyticsQuery,
  useGetTeamSuccessRateDistributionQuery,
} from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface TeamAnalyticsProps {
  stats: TeamStats;
  isLoading: boolean;
  teamId: string;
}

export default function TeamAnalytics({
  stats,
  isLoading,
  teamId,
}: TeamAnalyticsProps) {
  const { data: performanceData, isLoading: isLoadingPerformance } =
    useGetTeamPerformanceAnalyticsQuery(teamId);
  const { data: successRateData, isLoading: isLoadingSuccessRate } =
    useGetTeamSuccessRateDistributionQuery(teamId);
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Loading Analytics...
        </h3>
        <p className="text-muted-foreground">
          Please wait while we fetch the analytics data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance Chart */}
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Monthly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>Performance chart coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate Distribution */}
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              Success Rate Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <PieChart className="h-12 w-12 mx-auto mb-2" />
                <p>Success rate chart coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Table */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Detailed Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Previous Month</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Placements</TableCell>
                <TableCell>{stats?.totalCandidates || 0}</TableCell>
                <TableCell>
                  {Math.max(0, (stats?.totalCandidates || 0) - 3)}
                </TableCell>
                <TableCell className="text-green-600">+14.3%</TableCell>
                <TableCell>25</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Revenue</TableCell>
                <TableCell>
                  ${((stats?.totalRevenue || 0) / 1000).toFixed(0)}K
                </TableCell>
                <TableCell>
                  $
                  {Math.max(
                    0,
                    ((stats?.totalRevenue || 0) - 32000) / 1000
                  ).toFixed(0)}
                  K
                </TableCell>
                <TableCell className="text-green-600">+12.7%</TableCell>
                <TableCell>$300K</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Time to Fill</TableCell>
                <TableCell>18 days</TableCell>
                <TableCell>22 days</TableCell>
                <TableCell className="text-green-600">-18.2%</TableCell>
                <TableCell>20 days</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Candidate Quality</TableCell>
                <TableCell>4.2/5</TableCell>
                <TableCell>4.0/5</TableCell>
                <TableCell className="text-green-600">+5.0%</TableCell>
                <TableCell>4.5/5</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Client Satisfaction
                </TableCell>
                <TableCell>4.8/5</TableCell>
                <TableCell>4.6/5</TableCell>
                <TableCell className="text-green-600">+4.3%</TableCell>
                <TableCell>4.7/5</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Team Efficiency</TableCell>
                <TableCell>{stats?.completionRate || 0}%</TableCell>
                <TableCell>
                  {Math.max(0, (stats?.completionRate || 0) - 3)}%
                </TableCell>
                <TableCell className="text-green-600">+3.4%</TableCell>
                <TableCell>90%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Monthly Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPerformance ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : performanceData?.monthlyData ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => [
                    typeof value === "number" ? value.toLocaleString() : value,
                    name,
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="placements"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Placements"
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Revenue ($)"
                />
                <Line
                  type="monotone"
                  dataKey="projects"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Projects"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500">
              No performance data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Rate Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-green-600" />
            Success Rate Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSuccessRate ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : successRateData?.distribution ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Hired",
                        value: successRateData.distribution.hired,
                        color: "#10b981",
                      },
                      {
                        name: "In Progress",
                        value: successRateData.distribution.inProgress,
                        color: "#3b82f6",
                      },
                      {
                        name: "Rejected",
                        value: successRateData.distribution.rejected,
                        color: "#ef4444",
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      {
                        name: "Hired",
                        value: successRateData.distribution.hired,
                        color: "#10b981",
                      },
                      {
                        name: "In Progress",
                        value: successRateData.distribution.inProgress,
                        color: "#3b82f6",
                      },
                      {
                        name: "Rejected",
                        value: successRateData.distribution.rejected,
                        color: "#ef4444",
                      },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      `${typeof value === "number" ? value.toFixed(1) : value}%`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {successRateData.successRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-600">
                    Overall Success Rate
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Hired</span>
                    </div>
                    <span className="font-medium">{successRateData.hired}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">In Progress</span>
                    </div>
                    <span className="font-medium">
                      {successRateData.inProgress}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Rejected</span>
                    </div>
                    <span className="font-medium">
                      {successRateData.rejected}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500">
              No success rate data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
