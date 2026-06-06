import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";
import { useGetCoordinatorClientsOverviewQuery } from "../api/projectCoordinatorDashboardApi";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    name: string;
    value: number;
    fill: string;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2.5 shadow-lg">
      <p className="mb-1.5 text-sm font-semibold text-slate-700">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.fill }}
          />
          <span className="text-xs text-slate-500">{entry.name}:</span>
          <span className="text-xs font-semibold text-slate-700">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ClientsOverviewChart() {
  const { data, isLoading, isError } = useGetCoordinatorClientsOverviewQuery();
  const clients = data?.data ?? [];

  const chartData = useMemo(
    () =>
      clients.slice(0, 8).map((client) => ({
        name:
          client.clientName.length > 20
            ? `${client.clientName.slice(0, 20)}...`
            : client.clientName,
        active: client.activeProjects,
        completed: client.completedProjects,
      })),
    [clients]
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-700">
          Clients & Projects
        </CardTitle>
        <CardDescription>
          Project breakdown per client (top 8)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2">
            <p className="text-sm text-destructive">
              Failed to load clients overview
            </p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-slate-100 p-3">
              <Building2 className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">
                No clients yet
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Add your first client to see the overview here
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
              barGap={2}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 12, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
              <Bar
                dataKey="active"
                name="Active"
                stackId="projects"
                fill="#6366f1"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="completed"
                name="Completed"
                stackId="projects"
                fill="#10b981"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartData.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <span className="text-xs text-slate-500">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500">Completed</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
