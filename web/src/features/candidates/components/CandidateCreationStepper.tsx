import React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description: string;
}

interface CandidateCreationStepperProps {
  currentStep: number;
  steps: Step[];
  completedSteps: number[];
}

export const CandidateCreationStepper: React.FC<CandidateCreationStepperProps> = ({
  currentStep,
  steps,
  completedSteps,
}) => {
  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = completedSteps.includes(stepNumber);
            const isCurrent = currentStep === stepNumber;
            const isAccessible = stepNumber <= currentStep || isCompleted;

            return (
              <React.Fragment key={step.id}>
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 font-semibold text-sm",
                      {
                        // Completed step
                        "border-green-500 bg-green-500 text-white": isCompleted,
                        // Current step
                        "border-blue-500 bg-blue-500 text-white": isCurrent && !isCompleted,
                        // Future steps
                        "border-slate-300 bg-white text-slate-400": !isAccessible && !isCompleted,
                        // Accessible but not current/completed
                        "border-slate-400 bg-white text-slate-600": isAccessible && !isCurrent && !isCompleted,
                      }
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <span>{stepNumber}</span>
                    )}
                  </div>
                  
                  {/* Step Info */}
                  <div className="mt-2 text-center">
                    <div
                      className={cn(
                        "text-sm font-medium transition-colors duration-200",
                        {
                          "text-green-600": isCompleted,
                          "text-blue-600": isCurrent && !isCompleted,
                          "text-slate-400": !isAccessible,
                          "text-slate-600": isAccessible && !isCurrent && !isCompleted,
                        }
                      )}
                    >
                      {step.title}
                    </div>
                    <div
                      className={cn(
                        "text-xs mt-1 transition-colors duration-200",
                        {
                          "text-green-500": isCompleted,
                          "text-blue-500": isCurrent && !isCompleted,
                          "text-slate-400": !isAccessible,
                          "text-slate-500": isAccessible && !isCurrent && !isCompleted,
                        }
                      )}
                    >
                      {step.description}
                    </div>
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4">
                    <div
                      className={cn(
                        "h-0.5 transition-all duration-300",
                        {
                          "bg-green-500": stepNumber < currentStep || isCompleted,
                          "bg-slate-300": stepNumber >= currentStep && !isCompleted,
                        }
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Current Step Summary */}
      <div className="mt-6 text-center">
        <div className="text-lg font-semibold text-slate-800">
          Step {currentStep} of {steps.length}
        </div>
        <div className="text-sm text-slate-600 mt-1">
          {steps[currentStep - 1]?.description}
        </div>
      </div>
    </div>
  );
};

export default CandidateCreationStepper;