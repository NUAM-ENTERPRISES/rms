import { Users, Building2, Briefcase, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGetAdminDashboardStatsQuery } from "@/features/admin/api/adminDashboardApi";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";
import { ProjectStatus } from "@/entities/project/constants";

export default function StatsCards() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetAdminDashboardStatsQuery();

  const statCards = [
    {
      label: "Total Candidates",
      value: isLoading ? "—" : (data?.data?.totalCandidates ?? 0).toLocaleString(),
      subtitle: "All candidates across all recruiters",
      icon: Users,
      accent: "indigo",
      href: "/candidates",
    },
    {
      label: "Active Clients",
      value: isLoading ? "—" : (data?.data?.activeClients ?? 0).toLocaleString(),
      subtitle: "All clients in the system",
      icon: Building2,
      accent: "emerald",
      href: "/clients",
    },
    {
      label: "Active Projects",
      value: isLoading ? "—" : (data?.data?.openJobs ?? 0).toLocaleString(),
      subtitle: "Open jobs (active projects)",
      icon: Briefcase,
      accent: "amber",
      href: `/projects?status=${ProjectStatus.IN_PROGRESS}`,
    },
    {
      label: "Candidates Deployed",
      value: isLoading ? "—" : (data?.data?.candidatesPlaced ?? 0).toLocaleString(),
      subtitle: "Candidates deployed/flown",
      icon: UserCheck,
      accent: "teal",
      href: "/candidates?status=deployed",
    },
  ];

  return (
    <div className="grid auto-rows-fr gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <DashboardStatTile
          key={stat.label}
          accent={stat.accent}
          label={stat.label}
          value={stat.value}
          subtitle={stat.subtitle}
          icon={stat.icon}
          footerText="Overview"
          interactive
          as="button"
          onClick={() => navigate(stat.href)}
        />
      ))}
    </div>
  );
}
