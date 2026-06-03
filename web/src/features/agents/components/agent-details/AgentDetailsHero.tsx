import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Clock,
  Pencil,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Agent } from "../../api";
import { AgentHeroSkeleton } from "./AgentDetailsSkeletons";
import { formatAgentDetailDate, getAgentDetailInitials, formatAgentPhoneForLink } from "./agent-details-utils";

const HERO_PATTERN_BG =
  "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNCAyNnYyaC04di0yaDh6Ii8+PC9nPjwvZz48L3N2Zz4=')]";

type AgentDetailsHeroProps = {
  isLoading: boolean;
  agent: Agent | undefined;
  onBack: () => void;
  canEditAgent: boolean;
  onEditClick: () => void;
};

export function AgentDetailsHero({
  isLoading,
  agent,
  onBack,
  canEditAgent,
  onEditClick,
}: AgentDetailsHeroProps) {
  const phoneDigits = formatAgentPhoneForLink(agent?.mobileNumber);
  const whatsappDigits = formatAgentPhoneForLink(agent?.whatsappNumber ?? agent?.mobileNumber);

  return (
    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative overflow-hidden">
      <div className={`absolute inset-0 ${HERO_PATTERN_BG} opacity-30`} />

      <div className="relative px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4 gap-2 text-white/80 hover:text-white hover:bg-white/10"
          aria-label="Back to agents list"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Button>

        {isLoading ? (
          <AgentHeroSkeleton />
        ) : agent ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col md:flex-row gap-6 items-start md:items-center pb-6"
          >
            <div className="relative">
              {agent.profileImage ? (
                <img
                  src={agent.profileImage}
                  alt={agent.name}
                  className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white/20 shadow-2xl"
                />
              ) : (
                <div className="h-24 w-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold text-white shadow-2xl ring-4 ring-white/20">
                  {getAgentDetailInitials(agent.name)}
                </div>
              )}
              <div
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                  agent.isActive ? "bg-emerald-400" : "bg-slate-400"
                }`}
              />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{agent.name}</h1>
                {agent.agentType && (
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs">{agent.agentType}</Badge>
                )}
                <Badge
                  className={
                    agent.isActive
                      ? "bg-emerald-400/20 text-emerald-100 border-emerald-400/30"
                      : "bg-slate-400/20 text-slate-200 border-slate-400/30"
                  }
                >
                  {agent.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {agent.companyName && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{agent.companyName}</span>
                  </div>
                )}
                {agent.country?.name && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                    <span>{agent.country.name}</span>
                  </div>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm hover:bg-white/20 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>{agent.email}</span>
                  </a>
                )}
                {agent.mobileNumber && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{agent.mobileNumber}</span>
                  </div>
                )}
                {agent.whatsappNumber && agent.whatsappNumber !== agent.mobileNumber && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                    <FaWhatsapp className="h-3.5 w-3.5" />
                    <span>{agent.whatsappNumber}</span>
                  </div>
                )}
                {agent.alternatePhone1 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{agent.alternatePhone1}</span>
                  </div>
                )}
                {agent.alternatePhone2 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{agent.alternatePhone2}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {whatsappDigits && (
                  <>
                    {phoneDigits && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 gap-2 bg-white/20 hover:bg-white/30 text-white border-0"
                        onClick={() => {
                          window.location.href = `tel:${phoneDigits}`;
                        }}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 gap-2 bg-emerald-500/80 hover:bg-emerald-500 text-white border-0"
                      onClick={() => window.open(`https://wa.me/${whatsappDigits}`, "_blank")}
                    >
                      <FaWhatsapp className="h-3.5 w-3.5" />
                      WhatsApp
                    </Button>
                  </>
                )}
                {agent.email && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-2 bg-white/20 hover:bg-white/30 text-white border-0"
                    onClick={() => {
                      window.location.href = `mailto:${agent.email}`;
                    }}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Button>
                )}
                {canEditAgent && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-2 bg-white text-indigo-700 hover:bg-white/90 border-0 shadow-sm"
                    onClick={onEditClick}
                    aria-label="Edit agent"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit agent
                  </Button>
                )}
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-end text-white/70 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Partner since</span>
              </div>
              <span className="text-white font-medium">{formatAgentDetailDate(agent.createdAt)}</span>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
