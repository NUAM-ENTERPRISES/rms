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

type InterviewChartEntry = {
  day: string;
  interviews: number;
};

type InterviewChartProps = {
  chartData: InterviewChartEntry[];
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
};

const DEFAULT_FILL = "#6366f1";
const ACTIVE_FILL = "#4f46e5";
const INACTIVE_FILL = "#c7d2fe";

export default function InterviewChart({
  chartData,
  selectedDay,
  onSelectDay,
}: InterviewChartProps) {
  const handleClick = (data: { day: string }) => {
    onSelectDay(selectedDay === data.day ? null : data.day);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-600 mb-3">
        Interviews This Week
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chartData}
          barSize={32}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            cursor={{ fill: "rgba(99,102,241,0.08)" }}
          />
          <Bar
            dataKey="interviews"
            radius={[6, 6, 0, 0]}
            name="Interviews"
            style={{ cursor: "pointer" }}
            onClick={(_data: unknown, index: number) => {
              const entry = chartData[index];
              if (entry) handleClick(entry);
            }}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.day}
                fill={
                  selectedDay === null
                    ? DEFAULT_FILL
                    : selectedDay === entry.day
                      ? ACTIVE_FILL
                      : INACTIVE_FILL
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {selectedDay && (
        <button
          onClick={() => onSelectDay(null)}
          className="mt-2 text-xs text-indigo-600 hover:underline"
        >
          Clear filter — show all
        </button>
      )}
    </div>
  );
}
