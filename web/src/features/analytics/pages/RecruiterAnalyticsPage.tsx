import { useState } from "react";
import { mockRecruiters, Recruiter } from "../data/mockRecruiterData";
import RecruiterSelector from "../components/RecruiterSelector";
import RecruiterProfileCard from "../components/RecruiterProfileCard";
import RecruiterActivityBreakdownChart from "../components/RecruiterActivityBreakdownChart";
import RecruiterFollowupStatusChart from "../components/RecruiterFollowupStatusChart";
import RecruiterPerformanceStagesChart from "../components/RecruiterPerformanceStagesChart";
import RecruiterCandidatesTable from "../components/RecruiterCandidatesTable";

export default function RecruiterAnalyticsPage() {
  const [selected, setSelected] = useState<Recruiter>(mockRecruiters[0]);

  const activityData = [
    { activity: "Added", value: selected.stats.candidatesAdded },
    { activity: "Submitted", value: selected.stats.submitted },
    { activity: "Scheduled", value: selected.stats.interviewsScheduled },
    { activity: "Passed", value: selected.stats.interviewsPassed },
    { activity: "Hired", value: selected.stats.hired },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recruiter Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Performance overview for the selected recruiter
          </p>
        </div>
        <RecruiterSelector
          recruiters={mockRecruiters}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      {/* Recruiter Details + Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecruiterProfileCard recruiter={selected} />
        <div className="lg:col-span-2">
          <RecruiterActivityBreakdownChart data={activityData} />
        </div>
      </div>

      {/* Follow-up Status Chart */}
      <RecruiterFollowupStatusChart selectedRecruiter={selected} />

      {/* Performance Stages Chart */}
      <RecruiterPerformanceStagesChart selectedRecruiter={selected} />

      {/* Candidates Table */}
      <RecruiterCandidatesTable selectedRecruiter={selected} />
    </div>
  );
}
