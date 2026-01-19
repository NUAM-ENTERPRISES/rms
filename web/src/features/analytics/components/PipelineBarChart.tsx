import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  onRecruiterChange: (id: string) => void;
};

export const PipelineBarChart: React.FC<PipelineBarChartProps> = ({
  recruiters,
  selectedRecruiterId,
  onRecruiterChange,
}) => {
  const selected = recruiters.find((r) => r.id === selectedRecruiterId);

  // If no recruiter selected or found, show empty state
  if (!selected || recruiters.length === 0) {
    return (
      <Card className="shadow-xl border-0">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">
              Pipeline Performance
            </CardTitle>
            <Select value={selectedRecruiterId || ""} onValueChange={onRecruiterChange}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select a recruiter" />
              </SelectTrigger>
              <SelectContent>
                {recruiters.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[320px] text-gray-500">
            {recruiters.length === 0 ? "No recruiter data available" : "Please select a recruiter"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg sm:text-xl">
            Pipeline Performance –{" "}
            <span className="text-indigo-600 font-semibold">{selected.name}</span>
          </CardTitle>
          <Select value={selectedRecruiterId} onValueChange={onRecruiterChange}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {recruiters.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={[selected]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => `${value} candidates`} />
            <Bar dataKey="assigned" fill="#3b82f6" name="Assigned" radius={[4, 4, 0, 0]} />
            <Bar dataKey="screening" fill="#10b981" name="In Screening" radius={[4, 4, 0, 0]} />
            <Bar dataKey="interview" fill="#f59e0b" name="In Interview" radius={[4, 4, 0, 0]} />
            <Bar dataKey="selected" fill="#8b5cf6" name="Selected" radius={[4, 4, 0, 0]} />
            <Bar dataKey="joined" fill="#06b6d4" name="Joined" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};