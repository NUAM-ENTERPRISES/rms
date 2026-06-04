import { useAppSelector } from "@/app/hooks";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import StatsCards from "../components/StatsCards";
import HiringTrendChart from "../components/HiringTrendChart";
import AdminRecruiterPerformanceAwards from "../components/AdminRecruiterPerformanceAwards";
import ProjectRoleHiringStatus from "../components/ProjectRoleHiringStatus";
import UpcomingInterviews from "../components/UpcomingInterviews";

export default function AdminDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="space-y-6 p-2">
      {/* Page header */}
      <DashboardWelcomeHeader
        userName={user?.name || "Admin"}
        subtitle="Recruitment CRM overview at a glance"
      />

      {/* KPI Summary Tiles */}
      <StatsCards />

      {/* Candidates Placed Over Time */}
      <HiringTrendChart />

      {/* Recruiter of the Month / Year — performance score awards */}
      <AdminRecruiterPerformanceAwards />

      {/* Project Role Hiring Status */}
      <ProjectRoleHiringStatus />

      {/* Upcoming Interviews */}
      <UpcomingInterviews />
    </div>
  );
}
