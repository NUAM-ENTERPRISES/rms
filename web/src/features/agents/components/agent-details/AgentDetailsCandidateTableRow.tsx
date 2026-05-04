import { Eye, ExternalLink, Pencil, FolderKanban } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell } from "@/components/ui/table";
import type { AgentCandidate } from "../../api";
import { formatAgentDetailDate, getAgentDetailInitials } from "./agent-details-utils";

type AgentDetailsCandidateTableRowProps = {
  candidate: AgentCandidate;
  index: number;
  onView: () => void;
  /** When true, show control to edit declared (linked) projects only — not nominations. */
  canEditDeclaredProjects?: boolean;
  onEditDeclaredProjects?: () => void;
};

export function AgentDetailsCandidateTableRow({
  candidate,
  index,
  onView,
  canEditDeclaredProjects,
  onEditDeclaredProjects,
}: AgentDetailsCandidateTableRowProps) {
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

      <TableCell className="max-w-[300px] px-5 py-4 align-middle">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {candidate.declaredProjects && candidate.declaredProjects.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {candidate.declaredProjects.slice(0, 3).map((p) => (
                  <Badge
                    key={p.id}
                    variant="secondary"
                    className="font-medium text-[11px] max-w-[140px] truncate bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200/60 hover:from-emerald-100 hover:to-teal-100 transition-colors"
                    title={p.projectTitle ?? undefined}
                  >
                    <FolderKanban className="h-3 w-3 mr-1 shrink-0" aria-hidden />
                    {p.projectTitle || p.projectId}
                  </Badge>
                ))}
                {candidate.declaredProjects.length > 3 ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium text-slate-500 border-slate-200 bg-slate-50"
                  >
                    +{candidate.declaredProjects.length - 3} more
                  </Badge>
                ) : null}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 italic">
                <FolderKanban className="h-3.5 w-3.5" aria-hidden />
                No projects linked
              </span>
            )}
          </div>
          {canEditDeclaredProjects && onEditDeclaredProjects ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 shrink-0 rounded-md border-slate-200/90 bg-white text-slate-500 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 shadow-sm transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditDeclaredProjects();
                    }}
                    aria-label={`Edit linked projects for ${candidate.firstName} ${candidate.lastName}`}
                  >
                    <Pencil className="h-3 w-3" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Edit linked projects
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
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
