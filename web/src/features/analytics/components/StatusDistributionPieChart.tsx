import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PIE_COLORS = [
  "#4f46e5", // Indigo
  "#14b8a6", // Teal
  "#fbbf24", // Amber
  "#ec4899", // Pink
  "#38bdf8", // Light Blue
];

type PieData = { name: string; value: number }[];

type StatusDistributionPieChartProps = {
  pieData: PieData;
};

export const StatusDistributionPieChart: React.FC<StatusDistributionPieChartProps> = ({ pieData }) => {
  return (
    <Card className="shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Candidate Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};