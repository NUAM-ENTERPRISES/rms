import { Phone, Eye, ExternalLink } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AgentCandidate } from "../../api";
import { formatAgentDetailDate, getAgentDetailInitials, formatAgentPhoneForLink } from "./agent-details-utils";

type AgentDetailsCandidateTableRowProps = {
  candidate: AgentCandidate;
  index: number;
  onView: () => void;
};

export function AgentDetailsCandidateTableRow({
  candidate,
  index,
  onView,
}: AgentDetailsCandidateTableRowProps) {
  const phoneDigits = formatAgentPhoneForLink(candidate.mobileNumber, candidate.countryCode);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="group border-b border-slate-100 transition-colors hover:bg-blue-50/30"
    >
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-sm font-semibold text-white shadow-sm">
              {getAgentDetailInitials(`${candidate.firstName} ${candidate.lastName}`)}
            </div>
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={onView}
              className="block text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate max-w-[180px]"
            >
              {candidate.firstName} {candidate.lastName}
            </button>
            {candidate.email && (
              <span className="block text-xs text-slate-500 truncate max-w-[180px]">{candidate.email}</span>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-2">
          {phoneDigits && (
            <>
              <button
                type="button"
                onClick={() => window.open(`https://wa.me/${phoneDigits}`, "_blank")}
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                title="WhatsApp"
              >
                <FaWhatsapp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = `tel:${phoneDigits}`;
                }}
                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                title="Call"
              >
                <Phone className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <span className="text-xs text-slate-600 ml-1">
            {candidate.countryCode} {candidate.mobileNumber}
          </span>
        </div>
      </TableCell>

      <TableCell className="px-5 py-4">
        {candidate.recruiter ? (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-semibold text-white">
              {getAgentDetailInitials(candidate.recruiter.name)}
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-medium text-slate-700 truncate max-w-[100px]">
                {candidate.recruiter.name}
              </span>
            </div>
          </div>
        ) : (
          <Badge variant="outline" className="text-xs text-slate-400 border-dashed">
            Unassigned
          </Badge>
        )}
      </TableCell>

      <TableCell className="px-5 py-4">
        <div className="text-xs text-slate-500">{formatAgentDetailDate(candidate.createdAt)}</div>
      </TableCell>

      <TableCell className="px-5 py-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={onView}
          className="h-8 gap-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Eye className="h-4 w-4" />
          View
          <ExternalLink className="h-3 w-3" />
        </Button>
      </TableCell>
    </motion.tr>
  );
}
