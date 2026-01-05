import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Clock } from "lucide-react";
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

export const recruiters = [
  {
    id: "r1",
    name: "Alice Johnson",
    assigned: 150,
    screening: 120,
    interview: 100,
    selected: 75,
    joined: 60,
    untouched: 10,
    avgScreeningDays: 3,
  },
  {
    id: "r2",
    name: "Bob Smith",
    assigned: 100,
    screening: 80,
    interview: 60,
    selected: 45,
    joined: 35,
    untouched: 5,
    avgScreeningDays: 5,
  },
  {
    id: "r3",
    name: "Carla Ruiz",
    assigned: 200,
    screening: 160,
    interview: 130,
    selected: 110,
    joined: 95,
    untouched: 15,
    avgScreeningDays: 2,
  },
  // add more recruiters if needed
];


// Helper to calculate conversion %
const calcPercent = (part: number, total: number): number =>
  total > 0 ? Math.round((part / total) * 100) : 0;

const RecruiterDetailPage: React.FC = () => {
  const { recruiterId } = useParams<{ recruiterId: string }>();
  const navigate = useNavigate();

  const recruiter = recruiters.find((r) => r.id === recruiterId);

  if (!recruiter) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Recruiter Not Found
          </h2>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Overview
          </Button>
        </div>
      </div>
    );
  }

  const overallConversion = calcPercent(recruiter.joined, recruiter.assigned);

  const stages = [
    { name: "Assigned", value: recruiter.assigned, color: "#6366f1" },      // indigo
    { name: "Screening", value: recruiter.screening, color: "#8b5cf6" },    // violet
    { name: "Interview", value: recruiter.interview, color: "#3b82f6" },    // blue
    { name: "Selected", value: recruiter.selected, color: "#10b981" },      // emerald
    { name: "Joined", value: recruiter.joined, color: "#059669" },          // green
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {recruiter.name}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
              Recruiter Performance Detail
            </p>
          </div>
        </div>

        {/* Key Risk Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Untouched Candidates</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {recruiter.untouched}
                  </p>
                </div>
                <AlertTriangle className={`w-10 h-10 ${recruiter.untouched > 8 ? 'text-orange-500' : 'text-gray-400'}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Screening Time</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {recruiter.avgScreeningDays} <span className="text-lg font-normal">days</span>
                  </p>
                </div>
                <Clock className="w-10 h-10 text-indigo-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overall Conversion</p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                    {overallConversion}%
                  </p>
                </div>
                <div className="text-4xl">🎯</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Funnel Progress Bars */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Candidate Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {stages.map((stage) => {
              const percent = calcPercent(stage.value, recruiter.assigned);
              return (
                <div key={stage.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {stage.name}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stage.value} <span className="text-gray-500">({percent}%)</span>
                    </span>
                  </div>
                  <Progress value={percent} className="h-4 rounded-md" style={{ backgroundColor: "#e5e7eb" }}>
                    <div
                      className="h-full rounded-md transition-all"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </Progress>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Bar Chart Visualization */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Pipeline Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stages} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="category" dataKey="name" tick={{ fill: "#4b5563" }} />
                <YAxis type="number" tick={{ fill: "#4b5563" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                  {stages.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecruiterDetailPage;