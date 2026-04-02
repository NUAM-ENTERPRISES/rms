import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetUpcomingInterviewsQuery } from "@/features/admin/api/adminDashboardApi";
import InterviewChart from "./InterviewChart";
import InterviewTable from "./InterviewTable";

export default function UpcomingInterviews() {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useGetUpcomingInterviewsQuery({ page, limit: 10 });

  const interviews = useMemo(
    () => data?.data?.interviews ?? [],
    [data],
  );

  const chartData = useMemo(
    () => data?.data?.chartData ?? [],
    [data],
  );

  const filteredInterviews = useMemo(
    () =>
      selectedDay
        ? interviews.filter((iv) => iv.day === selectedDay)
        : interviews,
    [selectedDay, interviews],
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
              chartData={chartData}
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
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading upcoming interviews...</div>
            ) : isError ? (
              <div className="text-sm text-red-500">Failed to load upcoming interviews.</div>
            ) : (
              <>
                <InterviewTable interviews={filteredInterviews} />

                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Showing {Math.min((page - 1) * 10 + 1, data?.data?.pagination?.total ?? 0)} - {Math.min(page * 10, data?.data?.pagination?.total ?? 0)} of {data?.data?.pagination?.total ?? 0}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Prev
                    </button>
                    <span>
                      Page {data?.data?.pagination?.page ?? 1} of {data?.data?.pagination?.totalPages ?? 1}
                    </span>
                    <button
                      className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => setPage((p) => Math.min(data?.data?.pagination?.totalPages ?? 1, p + 1))}
                      disabled={page >= (data?.data?.pagination?.totalPages ?? 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
