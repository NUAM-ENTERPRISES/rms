import { useState, useEffect } from "react";
import RecruiterProfileCard from "../components/RecruiterProfileCard";
import RecruiterActivityBreakdownChart from "../components/RecruiterActivityBreakdownChart";
import RecruiterFollowupStatusChart from "../components/RecruiterFollowupStatusChart";
import RecruiterPerformanceStagesChart from "../components/RecruiterPerformanceStagesChart";
import RecruiterCandidatesTable from "../components/RecruiterCandidatesTable";
import { UserSelect } from "@/features/candidates/components/UserSelect";
import { usersApi } from "@/features/admin/api";
import {
  useGetRecruiterActivityBreakdownQuery,
  useGetRecruiterFollowupStatusQuery,
} from "@/services/recruiterAnalyticsApi";

export default function RecruiterAnalyticsPage() {
  const [selectedId, setSelectedId] = useState("");

  // Fetch first page of recruiters to auto-select the first one
  const { data: recruitersData } = usersApi.useGetUsersQuery({
    roles: "Recruiter",
    page: 1,
    limit: 1,
  });

  // Auto-select first recruiter on load
  useEffect(() => {
    const firstUser = recruitersData?.data?.users?.[0];
    if (firstUser && !selectedId) {
      setSelectedId(firstUser.id);
    }
  }, [recruitersData, selectedId]);

  // Fetch selected user details for profile card and downstream components
  const { data: userRes } = usersApi.useGetUserQuery(selectedId, {
    skip: !selectedId,
  });
  const selectedUser = userRes?.data;

  const selected = selectedUser
    ? { id: selectedUser.id, name: selectedUser.name, email: selectedUser.email }
    : null;

  // Fetch activity breakdown for selected recruiter
  const { data: activityRes, isLoading: activityLoading } =
    useGetRecruiterActivityBreakdownQuery(
      { recruiterId: selectedId },
      { skip: !selectedId },
    );

  // Fetch follow-up status for selected recruiter
  const { data: followupRes, isLoading: followupLoading } =
    useGetRecruiterFollowupStatusQuery(
      { recruiterId: selectedId },
      { skip: !selectedId },
    );

  const activityData = activityRes?.data?.activityBreakdown ?? [];
  const hireCount = activityRes?.data?.placements ?? 0;
  const followupStatuses = followupRes?.data?.followupStatuses ?? [];
  const followupTotal = followupRes?.data?.total ?? 0;

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
        <div className="w-72">
          <UserSelect
            value={selectedId}
            onChange={setSelectedId}
            role="Recruiter"
            placeholder="Select a recruiter..."
          />
        </div>
      </div>

      {/* Recruiter Details + Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecruiterProfileCard
          recruiter={
            selected
              ? {
                  name: selected.name,
                  role: "Recruiter",
                  email: selected.email,
                  hireCount,
                }
              : undefined
          }
          isLoading={activityLoading}
        />
        <div className="lg:col-span-2">
          <RecruiterActivityBreakdownChart data={activityData} isLoading={activityLoading} />
        </div>
      </div>

      {/* Follow-up Status Chart */}
      <RecruiterFollowupStatusChart
        data={followupStatuses}
        total={followupTotal}
        isLoading={followupLoading}
      />

      {/* Performance Stages Chart */}
      <RecruiterPerformanceStagesChart selectedRecruiter={selected} />

      {/* Candidates Table */}
      <RecruiterCandidatesTable selectedRecruiter={selected} />
    </div>
  );
}
