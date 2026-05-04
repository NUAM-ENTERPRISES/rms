import { Users, Handshake, FolderKanban, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Agent } from "../../api";

type AgentDetailsStatsProps = {
  agent: Agent | undefined;
  totalCount: number;
};

const accentStyles = {
  blue:    { card: "from-blue-50 via-white to-blue-50/30 border-blue-100",    iconBg: "bg-blue-100",    icon: "text-blue-600",    value: "text-blue-700"    },
  emerald: { card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100", iconBg: "bg-emerald-100", icon: "text-emerald-600", value: "text-emerald-700" },
  amber:   { card: "from-amber-50 via-white to-amber-50/30 border-amber-100",  iconBg: "bg-amber-100",   icon: "text-amber-600",   value: "text-amber-700"   },
} as const;

export function AgentDetailsStats({ agent, totalCount }: AgentDetailsStatsProps) {
  const tiles = [
    {
      label: "Total Candidates",
      value: agent?._count?.candidates ?? totalCount,
      subtitle: "All time referrals",
      Icon: Users,
      accent: "blue" as const,
    },
    {
      label: "Linked Projects",
      value: agent?._count?.agentProjects ?? 0,
      subtitle: "Client projects tied to this agent",
      Icon: FolderKanban,
      accent: "emerald" as const,
    },
    {
      label: "Agent Type",
      value: agent?.agentType ?? "—",
      subtitle: agent?.isActive ? "Currently active" : "Inactive",
      Icon: Handshake,
      accent: "amber" as const,
    },
  ];

  return (
    <div className="px-6 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const s = accentStyles[tile.accent];
          return (
            <div
              key={tile.label}
              className={cn("relative rounded-2xl border bg-gradient-to-br p-5 shadow-sm", s.card)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tile.label}</p>
                  <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{tile.value}</p>
                  <p className="text-xs text-slate-500">{tile.subtitle}</p>
                </div>
                <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                  <tile.Icon className={cn("h-5 w-5", s.icon)} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400">
                <span>Agent overview</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
