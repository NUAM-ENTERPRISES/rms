import { useAppSelector } from "@/app/hooks";
import TypedHeader from "@/components/molecules/TypedHeader";
import StatsCards from "../components/StatsCards";
import HiringTrendChart from "../components/HiringTrendChart";
import TopRecruiterCard from "../components/TopRecruiterCard";
import RecruiterActivityChart from "../components/RecruiterActivityChart";
import ProjectRoleHiringStatus from "../components/ProjectRoleHiringStatus";
import UpcomingInterviews from "../components/UpcomingInterviews";

export default function AdminDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="space-y-6 p-2">
      {/* Page header */}
      <TypedHeader 
        userName={user?.name || "Admin"} 
        subtitle="Recruitment CRM overview at a glance"
      />

      {/* KPI Summary Tiles */}
      <StatsCards />

      {/* Candidates Placed Over Time */}
      <HiringTrendChart />

      {/* Top Recruiter Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopRecruiterCard />
        <div className="lg:col-span-2">
          <RecruiterActivityChart />
        </div>
      </div>

      {/* Project Role Hiring Status */}
      <ProjectRoleHiringStatus />

      {/* Upcoming Interviews */}
      <UpcomingInterviews />
    </div>
  );
}
