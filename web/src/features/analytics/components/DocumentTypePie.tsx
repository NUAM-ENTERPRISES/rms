"use client";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#6366f1"];

type DocumentType = {
  name: string;
  value: number;
};

type DocumentTypePieProps = {
  data: DocumentType[];
};

export function DocumentTypePie({ data }: DocumentTypePieProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Document Type Distribution
          </CardTitle>
          <CardDescription className="text-xs">No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Document Type Distribution
        </CardTitle>
        <CardDescription className="text-xs">
          Breakdown by document category
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={65}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: "15px", marginBottom: "-80px" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
