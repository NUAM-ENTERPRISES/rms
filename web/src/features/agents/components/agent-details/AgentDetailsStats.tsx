import { motion } from "framer-motion";
import { Users, Handshake } from "lucide-react";
import { StatusTile } from "@/components/molecules";
import type { Agent } from "../../api";

type AgentDetailsStatsProps = {
  agent: Agent | undefined;
  totalCount: number;
};

export function AgentDetailsStats({ agent, totalCount }: AgentDetailsStatsProps) {
  return (
    <div className="px-6 -mt-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <StatusTile
          label="Total Candidates"
          value={agent?._count?.candidates ?? totalCount}
          subtitle="All time referrals"
          icon={Users}
          bgGradient="from-blue-50 to-indigo-50"
          iconBg="bg-blue-100"
          textColor="text-blue-700"
        />
        <StatusTile
          label="Agent Type"
          value={agent?.agentType ?? "—"}
          subtitle={agent?.isActive ? "Currently active" : "Inactive"}
          icon={Handshake}
          bgGradient="from-amber-50 to-orange-50"
          iconBg="bg-amber-100"
          textColor="text-amber-700"
        />
      </motion.div>
    </div>
  );
}
