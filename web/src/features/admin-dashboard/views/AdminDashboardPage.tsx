import { useAppSelector } from "@/app/hooks";
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
      <div className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Welcome back, {user?.name || "Admin"}! 👋
        </h1>
        <p className="text-sm text-slate-500">
          Recruitment CRM overview at a glance
        </p>
      </div>

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
