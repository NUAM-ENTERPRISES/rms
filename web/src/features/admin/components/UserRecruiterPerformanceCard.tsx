import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Award, TrendingUp, Calendar } from "lucide-react";
import { useGetRecruiterPerformanceRatingQuery } from "@/services/recruiterAnalyticsApi";
import { RecruiterPerformanceRatingStars } from "@/features/candidates/components/RecruiterPerformanceRatingStars";
import {
  buildChartData,
  CHART_COLORS,
  RATING_STYLES,
  type PerformanceRatingLabel,
} from "@/features/candidates/utils/recruiter-performance-rating.util";

interface UserRecruiterPerformanceCardProps {
  userId: string;
  userName: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-foreground text-sm mb-1.5">
          {data.label}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Count:</span>
            <span className="font-semibold text-foreground">{data.count}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Contribution:</span>
            <span className="font-semibold text-primary">
              {data.contribution} pts
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function UserRecruiterPerformanceCard({
  userId,
  userName,
}: UserRecruiterPerformanceCardProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const { data, isLoading, isError } = useGetRecruiterPerformanceRatingQuery({
    recruiterId: userId,
    year: currentYear,
    month: currentMonth,
  });

  const monthlyData = data?.data?.monthly;
  const yearlyData = data?.data?.yearly;

  const monthlyChartData = useMemo(
    () => (monthlyData ? buildChartData(monthlyData.stageCounts) : []),
    [monthlyData]
  );

  const yearlyChartData = useMemo(
    () => (yearlyData ? buildChartData(yearlyData.stageCounts) : []),
    [yearlyData]
  );

  if (isLoading) {
    return (
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Recruiter Performance Rating
          </CardTitle>
          <CardDescription className="text-xs">
            Loading performance data...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data?.data) {
    return (
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Recruiter Performance Rating
          </CardTitle>
          <CardDescription className="text-xs">
            Unable to load performance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No performance data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString(
    "en-US",
    { month: "long" }
  );

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          Recruiter Performance Rating
        </CardTitle>
        <CardDescription className="text-xs">
          Performance breakdown for {userName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Performance */}
        {monthlyData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h5 className="text-sm font-semibold text-foreground">
                  {monthName} {currentYear}
                </h5>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={RATING_STYLES[monthlyData.rating]}
                >
                  {monthlyData.rating}
                </Badge>
                <RecruiterPerformanceRatingStars
                  rating={monthlyData.rating as PerformanceRatingLabel}
                  size="sm"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Performance Score
                </span>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-base font-bold text-foreground">
                    {monthlyData.score}
                  </span>
                  <span className="text-xs text-muted-foreground">points</span>
                </div>
              </div>

              {/* Monthly Chart */}
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyChartData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={35}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="contribution" radius={[4, 4, 0, 0]} name="Points">
                      {monthlyChartData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Yearly Performance */}
        {yearlyData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h5 className="text-sm font-semibold text-foreground">
                  Year {currentYear}
                </h5>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={RATING_STYLES[yearlyData.rating]}
                >
                  {yearlyData.rating}
                </Badge>
                <RecruiterPerformanceRatingStars
                  rating={yearlyData.rating as PerformanceRatingLabel}
                  size="sm"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Performance Score
                </span>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-base font-bold text-foreground">
                    {yearlyData.score}
                  </span>
                  <span className="text-xs text-muted-foreground">points</span>
                </div>
              </div>

              {/* Yearly Chart */}
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={yearlyChartData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={35}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="contribution" radius={[4, 4, 0, 0]} name="Points">
                      {yearlyChartData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default UserRecruiterPerformanceCard;
