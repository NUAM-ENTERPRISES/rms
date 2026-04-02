import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { ProjectRole } from "../data/mockData";

type ChartRow = {
  role: string;
  filled: number;
  remaining: number;
  required: number;
};

type RoleHiringChartProps = {
  roles: ProjectRole[];
};

export default function RoleHiringChart({ roles }: RoleHiringChartProps) {
  const data: ChartRow[] = roles.map((r) => ({
    role: r.role,
    filled: r.filled,
    remaining: r.required - r.filled,
    required: r.required,
  }));

  return (
    <ResponsiveContainer width="100%" height={roles.length * 60 + 40}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 60, left: 16, bottom: 8 }}
        barSize={22}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="role"
          width={180}
          tick={{ fontSize: 13, fill: "#475569" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
          formatter={(value: number, name: string) => [
            value,
            name === "filled" ? "Filled" : "Remaining",
          ]}
        />
        <Bar
          dataKey="filled"
          stackId="stack"
          fill="#10b981"
          radius={[4, 0, 0, 4]}
          name="Filled"
        />
        <Bar
          dataKey="remaining"
          stackId="stack"
          fill="#e2e8f0"
          radius={[0, 4, 4, 0]}
          name="Remaining"
        >
          <LabelList
            content={({ x, y, width, height, index }) => {
              if (
                typeof x !== "number" ||
                typeof y !== "number" ||
                typeof width !== "number" ||
                typeof height !== "number" ||
                index == null
              )
                return null;
              const row = data[index as number];
              if (!row) return null;
              return (
                <text
                  x={x + width + 8}
                  y={y + height / 2}
                  dominantBaseline="central"
                  fill="#475569"
                  fontSize={13}
                  fontWeight={600}
                >
                  {row.filled} / {row.required}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
