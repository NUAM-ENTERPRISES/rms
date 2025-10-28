import React from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressStep {
  id: string;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming";
}

interface ProjectCreationProgressProps {
  steps: ProgressStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export const ProjectCreationProgress: React.FC<
  ProjectCreationProgressProps
> = ({ steps, currentStep, onStepClick, className }) => {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Progress Bar */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  "flex flex-col items-center space-y-1 cursor-pointer transition-all duration-200",
                  onStepClick && "hover:scale-105"
                )}
                onClick={() => onStepClick?.(index)}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
                    step.status === "completed" &&
                      "border-green-500 bg-green-500 text-white shadow-md shadow-green-500/20",
                    step.status === "current" &&
                      "border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-500/20",
                    step.status === "upcoming" &&
                      "border-slate-300 bg-white text-slate-400"
                  )}
                >
                  {step.status === "completed" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step Content */}
                <div className="text-center">
                  <h3
                    className={cn(
                      "text-xs font-semibold transition-colors duration-200",
                      step.status === "completed" && "text-green-600",
                      step.status === "current" && "text-blue-600",
                      step.status === "upcoming" && "text-slate-500"
                    )}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={cn(
                      "text-xs transition-colors duration-200 hidden lg:block",
                      step.status === "completed" && "text-green-500",
                      step.status === "current" && "text-blue-500",
                      step.status === "upcoming" && "text-slate-400"
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors duration-200",
                    step.status === "completed" && "bg-green-500",
                    step.status === "current" && "bg-blue-500",
                    step.status === "upcoming" && "bg-slate-300"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile Progress Bar */}
      <div className="md:hidden">
        <div className="flex items-center space-x-1">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  "flex items-center space-x-1 cursor-pointer transition-all duration-200",
                  onStepClick && "hover:scale-105"
                )}
                onClick={() => onStepClick?.(index)}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    "relative flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200",
                    step.status === "completed" &&
                      "border-green-500 bg-green-500 text-white",
                    step.status === "current" &&
                      "border-blue-500 bg-blue-500 text-white",
                    step.status === "upcoming" &&
                      "border-slate-300 bg-white text-slate-400"
                  )}
                >
                  {step.status === "completed" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step Title */}
                <div className="min-w-0 flex-1">
                  <h3
                    className={cn(
                      "text-xs font-semibold truncate transition-colors duration-200",
                      step.status === "completed" && "text-green-600",
                      step.status === "current" && "text-blue-600",
                      step.status === "upcoming" && "text-slate-500"
                    )}
                  >
                    {step.title}
                  </h3>
                </div>
              </div>

              {/* Connector Arrow */}
              {index < steps.length - 1 && (
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-colors duration-200",
                    step.status === "completed" && "text-green-500",
                    step.status === "current" && "text-blue-500",
                    step.status === "upcoming" && "text-slate-300"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectCreationProgress;
