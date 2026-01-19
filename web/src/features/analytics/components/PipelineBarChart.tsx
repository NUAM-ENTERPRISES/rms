import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Recruiter = {
  id: string;
  name: string;
  assigned: number;
  screening: number;
  interview: number;
  selected: number;
  joined: number;
};

type PipelineBarChartProps = {
  recruiters: Recruiter[];
  selectedRecruiterId: string;
};

export const PipelineBarChart: React.FC<PipelineBarChartProps> = ({
  recruiters,
  selectedRecruiterId,
}) => {
  const selected = recruiters.find((r) => r.id === selectedRecruiterId);

  // If no recruiter selected or found, show empty state
  if (!selected || recruiters.length === 0) {
    return (
      <Card className="shadow-xl border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">
            Pipeline Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[320px] text-gray-500">
            {recruiters.length === 0 ? "No recruiter data available" : "Please select a recruiter"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for horizontal bar chart showing pipeline stages
  const pipelineData = [
    { stage: "Assigned", value: selected.assigned, color: "#3b82f6" },
    { stage: "In Screening", value: selected.screening, color: "#10b981" },
    { stage: "In Interview", value: selected.interview, color: "#f59e0b" },
    { stage: "Selected", value: selected.selected, color: "#8b5cf6" },
    { stage: "Joined", value: selected.joined, color: "#06b6d4" },
  ];

  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl">
          Pipeline Performance –{" "}
          <span className="text-indigo-600 font-semibold">{selected.name}</span>
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Distribution of candidates across pipeline stages
        </p>
      </CardHeader>
      <CardContent>
        {selected.assigned === 0 ? (
          <div className="flex items-center justify-center h-[320px] text-gray-500">
            <div className="text-center">
              <p className="text-sm font-medium">No pipeline data available</p>
              <p className="text-xs text-gray-400 mt-1">No project assignments found for this recruiter</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={pipelineData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="stage"
                tick={{ fontSize: 12 }}
                width={90}
              />
              <Tooltip
                formatter={(value: number) => [`${value} candidates`, "Count"]}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {pipelineData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};