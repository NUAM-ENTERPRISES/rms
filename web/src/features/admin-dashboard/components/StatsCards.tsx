import { Users, Building2, Briefcase, UserCheck } from "lucide-react";
import StatsCard from "./StatsCard";
import { useGetAdminDashboardStatsQuery } from "@/features/admin/api/adminDashboardApi";

const defaultStats = [
  {
    id: "total-candidates",
    title: "Total Candidates",
    value: "-",
    description: "Loading...",
    icon: Users,
    color: "indigo",
  },
  {
    id: "active-clients",
    title: "Active Clients",
    value: "-",
    description: "Loading...",
    icon: Building2,
    color: "emerald",
  },
  {
    id: "open-jobs",
    title: "Active Projects",
    value: "-",
    description: "Loading...",
    icon: Briefcase,
    color: "amber",
  },
  {
    id: "candidates-placed",
    title: "Candidates Deployed",
    value: "-",
    description: "Loading...",
    icon: UserCheck,
    color: "teal",
  },
];

export default function StatsCards() {
  const { data, isLoading, error } = useGetAdminDashboardStatsQuery();

  const statsData = data?.data
    ? [
        {
          id: "total-candidates",
          title: "Total Candidates",
          value: data.data.totalCandidates.toLocaleString(),
          description: "All candidates across all recruiters",
          icon: Users,
          color: "indigo",
        },
        {
          id: "active-clients",
          title: "Active Clients",
          value: data.data.activeClients.toLocaleString(),
          description: "All clients in the system",
          icon: Building2,
          color: "emerald",
        },
        {
          id: "open-jobs",
          title: "Active Projects",
          value: data.data.openJobs.toLocaleString(),
          description: "Open jobs (active projects)",
          icon: Briefcase,
          color: "amber",
        },
        {
          id: "candidates-placed",
          title: "Candidates Deployed",
          value: data.data.candidatesPlaced.toLocaleString(),
          description: "Candidates deployed/flyed",
          icon: UserCheck,
          color: "teal",
        },
      ]
    : defaultStats;

  const errorMessage = error ? "Failed to load dashboard stats" : undefined;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat) => (
        <StatsCard
          key={stat.id}
          stat={{
            ...stat,
            description: errorMessage ? errorMessage : stat.description,
          }}
        />
      ))}
    </div>
  );
}
