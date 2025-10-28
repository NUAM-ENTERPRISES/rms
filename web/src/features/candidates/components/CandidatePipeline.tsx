import React from "react";
import {
  User,
  FileText,
  CheckCircle,
  Calendar,
  Target,
  Briefcase,
  Award,
  Clock,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PipelineStage {
  stage: string;
  isCurrent: boolean;
  isCompleted: boolean;
  title: string;
  description: string;
  date?: string;
  icon?: string;
  color?: string;
}

export interface ProjectPipeline {
  projectId: string;
  projectTitle: string;
  stages: PipelineStage[];
  currentStage: string;
  overallProgress: number;
}

interface CandidatePipelineProps {
  projects: ProjectPipeline[];
  overallProgress?: number;
  className?: string;
}

const stageIcons = {
  User,
  FileText,
  CheckCircle,
  Calendar,
  Target,
  Briefcase,
  Award,
  Clock,
  XCircle,
};

export const CandidatePipeline: React.FC<CandidatePipelineProps> = ({
  projects,
  overallProgress = 0,
  className,
}) => {
  if (!projects || projects.length === 0) {
    return (
      <div className={cn("bg-slate-50 rounded-lg p-6 text-center", className)}>
        <Clock className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-700 mb-1">No Pipeline Data</h3>
        <p className="text-sm text-slate-500">
          Not assigned to any projects yet
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Compact Project Pipelines */}
      {projects.map((project) => (
        <ProjectPipelineCard key={project.projectId} project={project} />
      ))}
    </div>
  );
};

interface ProjectPipelineCardProps {
  project: ProjectPipeline;
}

const ProjectPipelineCard: React.FC<ProjectPipelineCardProps> = ({
  project,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Briefcase className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-900">
              {project.projectTitle}
            </h3>
            <p className="text-xs text-slate-500">Pipeline</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-600">
            {project.overallProgress}%
          </div>
          <div className="text-xs text-slate-500">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${project.overallProgress}%` }}
          />
        </div>
      </div>

      {/* Smooth Pathway Pipeline */}
      <div className="relative">
        {/* Responsive pathway container */}
        <div className="flex flex-wrap items-start justify-center gap-4 py-4">
          {project.stages.map((stage, index) => {
            const IconComponent =
              stageIcons[stage.icon as keyof typeof stageIcons] || Clock;
            const isLast = index === project.stages.length - 1;

            return (
              <div
                key={stage.stage}
                className="flex flex-col items-center relative min-w-0 flex-1 max-w-24"
              >
                {/* Stage Node */}
                <div className="relative z-10 mb-2">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 relative shadow-lg",
                      stage.isCurrent
                        ? "bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-700 border-2 border-amber-400 shadow-amber-200/50 scale-110"
                        : stage.isCompleted
                        ? "bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 border-2 border-green-400 shadow-green-200/50"
                        : "bg-slate-100 text-slate-600 border-2 border-slate-200"
                    )}
                  >
                    {/* Golden glow effect for current stage */}
                    {stage.isCurrent && (
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-400/20 animate-pulse" />
                    )}
                    {stage.isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <IconComponent className="h-4 w-4" />
                    )}
                  </div>

                  {/* Golden sparkle for current stage */}
                  {stage.isCurrent && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full animate-pulse" />
                  )}
                </div>

                {/* Stage Label - Always visible and aligned */}
                <div className="text-center px-1">
                  <p className="text-xs font-medium text-slate-700 leading-tight break-words">
                    {stage.title}
                  </p>
                </div>

                {/* Golden Connecting Path */}
                {!isLast && (
                  <div className="absolute top-5 left-full w-8 h-0.5 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full opacity-60 z-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Stage Info - Compact */}
      {project.stages.find((stage) => stage.isCurrent) && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-amber-600" />
            <span className="text-xs font-medium text-amber-800">Current:</span>
            <span className="text-xs text-amber-700">
              {project.stages.find((stage) => stage.isCurrent)?.description}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidatePipeline;
