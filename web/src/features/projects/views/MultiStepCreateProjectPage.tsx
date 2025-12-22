import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useCreateProjectMutation } from "@/features/projects";
import { useCan } from "@/hooks/useCan";
import {
  projectFormSchema,
  defaultProjectValues,
  type ProjectFormData,
} from "../schemas/project-schemas";
import {
  ProjectCreationProgress,
  type ProgressStep,
} from "@/components/molecules/ProjectCreationProgress";
import ProjectDetailsStep from "../components/steps/ProjectDetailsStep";
import RequirementCriteriaStep from "../components/steps/RequirementCriteriaStep";
import CandidateCriteriaStep from "../components/steps/CandidateCriteriaStep";
import DocumentRequirementsStep from "../components/steps/DocumentRequirementsStep";
import PreviewStep from "../components/steps/PreviewStep";
import { CreateClientModal } from "@/features/clients";

const STEPS = [
  {
    id: "project-details",
    title: "Project Details",
    description: "Basic project information",
  },
  {
    id: "requirement-criteria",
    title: "Requirement Criteria",
    description: "Define job positions needed",
  },
  {
    id: "candidate-criteria",
    title: "Candidate Criteria",
    description: "Set candidate requirements",
  },
  {
    id: "document-requirements",
    title: "Document Requirements",
    description: "Specify required documents",
  },
  {
    id: "preview",
    title: "Preview & Submit",
    description: "Review and create project",
  },
];

export default function MultiStepCreateProjectPage() {
  const navigate = useNavigate();
  const canCreateProjects = useCan("manage:projects");
  const [currentStep, setCurrentStep] = useState(0);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);

  // RTK Query hooks
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    trigger,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaultProjectValues,
  });

  // Create progress steps with status
  const progressSteps: ProgressStep[] = STEPS.map((step, index) => ({
    ...step,
    status:
      index < currentStep
        ? "completed"
        : index === currentStep
        ? "current"
        : "upcoming",
  }));

  // Navigation functions
  const goToNextStep = async () => {
    // Validate current step before proceeding
    const stepFields = getStepFields(currentStep);
    const isStepValid = await trigger(stepFields);

    if (isStepValid) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      // Log errors for debugging
      console.log("Validation errors:", errors);
      
      // Get first error message to show
      const firstError = Object.values(errors).find(err => err);
      const errorMessage = firstError?.message || "Please fix the errors before proceeding";
      
      toast.error(errorMessage);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  // Get fields to validate for each step
  const getStepFields = (stepIndex: number): (keyof ProjectFormData)[] => {
    switch (stepIndex) {
      case 0: // Project Details
        return ["title", "deadline", "projectType", "description"];
      case 1: // Requirement Criteria
        return ["rolesNeeded"];
      case 2: // Candidate Criteria
        return ["rolesNeeded"];
      case 3: // Document Requirements
        return ["documentRequirements"];
      case 4: // Preview
        return [];
      default:
        return [];
    }
  };

  // Handle form submission - only called when user clicks "Create Project" button
  const onSubmit = async (data: ProjectFormData) => {
    try {
      // Transform the data for backend
      const transformedData = {
        ...data,
        deadline:
          data.deadline instanceof Date
            ? data.deadline.toISOString()
            : data.deadline,
        // API requires clientId to be a string
        clientId: data.clientId || "",
        rolesNeeded: data.rolesNeeded.map((role: any) => {
          const { departmentId, ...roleWithoutDepartmentId } = role;
          return {
            ...roleWithoutDepartmentId,
            // Candidate criteria fields
            ageRequirement: role.ageRequirement || undefined,
            accommodation: !!role.accommodation,
            food: !!role.food,
            transport: !!role.transport,
            target: role.target !== undefined ? role.target : undefined,
            // Convert arrays to JSON strings for backend
            requiredSkills: JSON.stringify(role.requiredSkills || []),
            candidateStates: JSON.stringify(role.candidateStates || []),
            candidateReligions: JSON.stringify(role.candidateReligions || []),
          // Convert string arrays to JSON strings if needed
          specificExperience: role.specificExperience
            ? JSON.stringify(
                role.specificExperience.split(",").map((s: string) => s.trim())
              )
            : undefined,
          requiredCertifications: role.requiredCertifications
            ? JSON.stringify(
                role.requiredCertifications
                  .split(",")
                  .map((s: string) => s.trim())
              )
            : undefined,
          skills: role.skills
            ? JSON.stringify(
                role.skills.split(",").map((s: string) => s.trim())
              )
            : undefined,
          languageRequirements: role.languageRequirements
            ? JSON.stringify(
                role.languageRequirements
                  .split(",")
                  .map((s: string) => s.trim())
              )
            : undefined,
          licenseRequirements: role.licenseRequirements
            ? JSON.stringify(
                role.licenseRequirements.split(",").map((s: string) => s.trim())
              )
            : undefined,
          institutionRequirements: role.institutionRequirements
            ? role.institutionRequirements
            : undefined,
          // salaryRange must be a JSON string as per backend requirement
          salaryRange: role.salaryRange
            ? JSON.stringify(role.salaryRange)
            : undefined,
          };
        }),
        documentRequirements: data.documentRequirements || [],
      };

      const result = await createProject(transformedData).unwrap();

      if (result.success) {
        toast.success("Project created successfully!");
        navigate(`/projects/${result.data.id}`);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create project");
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    const stepProps = {
      control,
      watch,
      setValue,
      errors,
    };

    switch (currentStep) {
      case 0:
        return (
          <ProjectDetailsStep
            {...stepProps}
            onCreateClientClick={() => setShowCreateClientModal(true)}
          />
        );
      case 1:
        return <RequirementCriteriaStep {...stepProps} />;
      case 2:
        return <CandidateCriteriaStep {...stepProps} />;
      case 3:
        return <DocumentRequirementsStep {...stepProps} />;
      case 4:
        return <PreviewStep watch={watch} />;
      default:
        return null;
    }
  };

  if (!canCreateProjects) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              Access Denied
            </h2>
            <p className="text-slate-600">
              You don't have permission to create projects.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full mx-auto space-y-6">
        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <ProjectCreationProgress
            steps={progressSteps}
            currentStep={currentStep}
            onStepClick={goToStep}
          />
        </div>

        {/* Current Step Content */}
        <div className="space-y-6">
          {renderCurrentStep()}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200 bg-white rounded-lg shadow-lg p-6">
            {currentStep === 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/projects")}
                className="h-11 px-6 border-slate-200 hover:border-slate-300"
              >
                Cancel
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                className="h-11 px-6 border-slate-200 hover:border-slate-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}

            <div className="flex items-center gap-3">
              {currentStep < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={goToNextStep}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 h-11 px-8"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={!isValid || isCreating}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 h-11 px-8"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Project...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateClientModal
        open={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        onSuccess={(clientId, clientName) => {
          setValue("clientId", clientId);
          toast.success(`Client "${clientName}" created and selected!`);
        }}
      />
    </div>
  );
}
