import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { interviewsData } from "../data/mockData";
import InterviewChart from "./InterviewChart";
import InterviewTable from "./InterviewTable";

export default function UpcomingInterviews() {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const filteredInterviews = useMemo(
    () =>
      selectedDay
        ? interviewsData.filter((iv) => iv.day === selectedDay)
        : interviewsData,
    [selectedDay],
  );

  return (
    <Card className="border-0 shadow-sm rounded-xl bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-700">
          Upcoming Interviews
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart – left */}
          <div className="lg:col-span-5">
            <InterviewChart
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          </div>

          {/* Table – right */}
          <div className="lg:col-span-7">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">
              Interview Schedule
              {selectedDay && (
                <span className="ml-1 text-indigo-600">— {selectedDay}</span>
              )}
            </h3>
            <InterviewTable interviews={filteredInterviews} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
