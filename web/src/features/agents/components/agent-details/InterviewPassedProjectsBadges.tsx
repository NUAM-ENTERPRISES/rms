import { FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AgentInterviewPassedProject } from "../../api";

function projectDisplayName(project: AgentInterviewPassedProject): string {
  return project.projectTitle?.trim() || project.projectId;
}

type InterviewPassedProjectsBadgesProps = {
  interviewPassedProjects?: AgentInterviewPassedProject[];
  interviewPassedCount?: number;
};

export function InterviewPassedProjectsBadges({
  interviewPassedProjects = [],
  interviewPassedCount,
}: InterviewPassedProjectsBadgesProps) {
  const count = interviewPassedCount ?? interviewPassedProjects.length;

  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 italic">
        <FolderKanban className="h-3.5 w-3.5" aria-hidden />
        No interview passed projects
      </span>
    );
  }

  const countLabel =
    count === 1 ? "1 project passed" : `${count} projects passed`;

  const badge = (
    <Badge
      variant="secondary"
      className="font-medium text-[11px] bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border border-amber-200/60 cursor-default"
    >
      <FolderKanban className="h-3 w-3 mr-1 shrink-0" aria-hidden />
      {countLabel}
    </Badge>
  );

  if (interviewPassedProjects.length === 0) {
    return badge;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <p className="text-xs font-semibold text-slate-700 mb-1.5">Interview passed projects</p>
          <ul className="space-y-1">
            {interviewPassedProjects.map((project) => (
              <li
                key={project.projectId}
                className="text-xs text-slate-600 flex items-start gap-1.5"
              >
                <FolderKanban className="h-3 w-3 mt-0.5 shrink-0 text-amber-600" aria-hidden />
                <span>{projectDisplayName(project)}</span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
