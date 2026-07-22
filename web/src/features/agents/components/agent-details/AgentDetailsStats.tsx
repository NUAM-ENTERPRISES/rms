import { Users, FolderKanban, CheckCircle2 } from "lucide-react";
import type { AgentCandidateStats } from "../../api";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";

export type CandidateListFilter = "all" | "interview_passed";

type AgentDetailsStatsProps = {
  stats: AgentCandidateStats | undefined;
  totalCount: number;
  candidateFilter: CandidateListFilter;
  onCandidateFilterChange: (filter: CandidateListFilter) => void;
};

export function AgentDetailsStats({
  stats,
  totalCount,
  candidateFilter,
  onCandidateFilterChange,
}: AgentDetailsStatsProps) {
  const interviewPassedCount = stats?.interviewPassedCandidates ?? 0;

  const tiles = [
    {
      label: "Total Candidates",
      value: stats?.totalCandidates ?? totalCount,
      subtitle: "All time referrals",
      icon: Users,
      accent: "blue",
      filter: "all" as CandidateListFilter,
      clickable: true,
    },
    {
      label: "Linked Projects",
      value: stats?.linkedProjects ?? 0,
      subtitle: "Client projects tied to this agent",
      icon: FolderKanban,
      accent: "emerald",
      filter: null,
      clickable: false,
    },
    {
      label: "Interview Passed",
      value: interviewPassedCount,
      subtitle: "Candidates with interview passed in history",
      icon: CheckCircle2,
      accent: "amber",
      filter: "interview_passed" as CandidateListFilter,
      clickable: true,
    },
  ];

  return (
    <div className="px-6 py-6">
      <div className="grid auto-rows-fr grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const isActive = tile.filter != null && candidateFilter === tile.filter;
          const footerText = tile.clickable
            ? isActive
              ? "Viewing now"
              : "Click to filter"
            : "Agent overview";

          return (
            <DashboardStatTile
              key={tile.label}
              accent={tile.accent}
              label={tile.label}
              value={tile.value}
              subtitle={tile.subtitle}
              icon={tile.icon}
              active={isActive}
              interactive={tile.clickable}
              footerText={footerText}
              onClick={
                tile.clickable && tile.filter
                  ? () => onCandidateFilterChange(tile.filter!)
                  : undefined
              }
              as={tile.clickable ? "button" : "div"}
            />
          );
        })}
      </div>
    </div>
  );
}
