import { useAppSelector } from "@/app/hooks";
import DashboardWelcomeHeader from "@/components/molecules/DashboardWelcomeHeader";
import CoordinatorStatsCards from "../components/CoordinatorStatsCards";
import ProjectsByStatusChart from "../components/ProjectsByStatusChart";
import ClientsOverviewChart from "../components/ClientsOverviewChart";
import CoordinatorProjectRoleHiringStatus from "../components/CoordinatorProjectRoleHiringStatus";
import ClientProjectsTable from "../components/ClientProjectsTable";
import CoordinatorQuickActions from "../components/CoordinatorQuickActions";

export default function ProjectCoordinatorDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
      <DashboardWelcomeHeader
        userName={user?.name || "Project Coordinator"}
        subtitle="Your clients, projects, and candidate fill overview"
      />

      <CoordinatorStatsCards />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProjectsByStatusChart />
        <ClientsOverviewChart />
      </div>

      <CoordinatorProjectRoleHiringStatus />

      <ClientProjectsTable />

      <CoordinatorQuickActions />
    </div>
  );
}
