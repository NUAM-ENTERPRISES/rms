import { useState } from "react";
import { mockRecruiters, Recruiter } from "../data/mockRecruiterData";
import RecruiterSelector from "../components/RecruiterSelector";
import RecruiterCard from "../components/RecruiterCard";
import RecruiterActivityChart from "../components/RecruiterActivityChart";
import RecruiterFollowupStatusChart from "../components/RecruiterFollowupStatusChart";
import RecruiterPerformanceStagesChart from "../components/RecruiterPerformanceStagesChart";
import RecruiterCandidatesTable from "../components/RecruiterCandidatesTable";

export default function RecruiterAnalyticsPage() {
  const [selected, setSelected] = useState<Recruiter>(mockRecruiters[0]);

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

      {/* Profile + Stat Cards */}
      <RecruiterCard recruiter={selected} />

      {/* Chart */}
      <RecruiterActivityChart recruiter={selected} />

      {/* Follow-up Status Chart */}
      <RecruiterFollowupStatusChart selectedRecruiter={selected} />

      {/* Performance Stages Chart */}
      <RecruiterPerformanceStagesChart selectedRecruiter={selected} />

      {/* Candidates Table */}
      <RecruiterCandidatesTable selectedRecruiter={selected} />
    </div>
  );
}
