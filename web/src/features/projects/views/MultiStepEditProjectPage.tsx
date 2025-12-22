import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle, X } from "lucide-react";
import {
  useUpdateProjectMutation,
  useGetProjectQuery,
} from "@/features/projects";
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

const STEPS = [
  { id: "details", title: "Project Details", description: "Basic information" },
  {
    id: "requirements",
    title: "Requirement Criteria",
    description: "Roles needed",
  },
  {
    id: "candidates",
    title: "Candidate Criteria",
    description: "Candidate requirements",
  },
  {
    id: "documents",
    title: "Document Requirements",
    description: "Required documents",
  },
  {
    id: "preview",
    title: "Preview & Update",
    description: "Review and save changes",
  },
];

export default function MultiStepEditProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const canManageProjects = useCan("manage:projects");
  const [currentStep, setCurrentStep] = useState(0);

  // RTK Query hooks
  const {
    data: projectData,
    isLoading: isLoadingProject,
    error: projectError,
  } = useGetProjectQuery(projectId!);
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue,
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaultProjectValues,
    mode: "onChange",
  });

  // Load project data into form when available
  useEffect(() => {
    if (projectData?.data) {
      const project = projectData.data;

      // Transform project data to match form schema
      const formData: ProjectFormData = {
        title: project.title,
        description: project.description || "",
        clientId: project.client?.id || "",
        countryCode: project.countryCode || "",
        deadline: project.deadline ? new Date(project.deadline) : new Date(),
        priority:
          (project.priority as "low" | "medium" | "high" | "urgent") ||
          "medium",
        projectType:
          (project.projectType as "private" | "ministry") || "private",
        resumeEditable: (project as any).resumeEditable ?? true,
        groomingRequired: (project as any).groomingRequired ?? "formal",
        hideContactInfo: (project as any).hideContactInfo ?? true,
        requiredScreening: (project as any).requiredScreening ?? false,
            rolesNeeded:
          project.rolesNeeded?.map((role: any) => ({
            roleCatalogId: role.roleCatalogId || "",
            departmentId: role.departmentId,
            designation: role.designation,
            // Ensure quantity is a number (fallback to 1 if null/undefined)
            quantity: typeof role.quantity === "number" ? role.quantity : 1,
            // Normalize numeric fields: convert null -> undefined so zod accepts them
            minExperience:
              role.minExperience !== null && role.minExperience !== undefined
                ? role.minExperience
                : undefined,
            maxExperience:
              role.maxExperience !== null && role.maxExperience !== undefined
                ? role.maxExperience
                : undefined,
            specificExperience: Array.isArray(role.specificExperience)
              ? role.specificExperience.join(", ")
              : role.specificExperience,
            ageRequirement: (role as any).ageRequirement || undefined,
            accommodation:
              (role as any).accommodation !== null &&
              (role as any).accommodation !== undefined
                ? (role as any).accommodation
                : false,
            food:
              (role as any).food !== null && (role as any).food !== undefined
                ? (role as any).food
                : false,
            transport:
              (role as any).transport !== null &&
              (role as any).transport !== undefined
                ? (role as any).transport
                : false,
            target:
              (role as any).target !== null && (role as any).target !== undefined
                ? (role as any).target
                : undefined,
            educationRequirementsList: role.educationRequirementsList || [],
            requiredCertifications: Array.isArray(role.requiredCertifications)
              ? role.requiredCertifications.join(", ")
              : role.requiredCertifications,
            institutionRequirements: role.institutionRequirements,
            skills: Array.isArray(role.skills)
              ? role.skills.join(", ")
              : role.skills,
            languageRequirements: Array.isArray(role.languageRequirements)
              ? role.languageRequirements.join(", ")
              : role.languageRequirements,
            licenseRequirements: Array.isArray(role.licenseRequirements)
              ? role.licenseRequirements.join(", ")
              : role.licenseRequirements,
            additionalRequirements: role.additionalRequirements,
            notes: role.notes,
            employmentType: role.employmentType,
            contractDurationYears:
              role.contractDurationYears !== null &&
              role.contractDurationYears !== undefined
                ? role.contractDurationYears
                : undefined,
            // Normalize enum-like fields to valid values or undefined/default
            genderRequirement:
              role.genderRequirement === "female" ||
              role.genderRequirement === "male" ||
              role.genderRequirement === "all"
                ? role.genderRequirement
                : "all",
            shiftType:
              role.shiftType === "day" ||
              role.shiftType === "night" ||
              role.shiftType === "rotating" ||
              role.shiftType === "flexible"
                ? role.shiftType
                : undefined,
            visaType:
              (role as any).visaType === "contract" ||
              (role as any).visaType === "permanent"
                ? (role as any).visaType
                : "contract",
            requiredSkills: Array.isArray((role as any).requiredSkills)
              ? (role as any).requiredSkills
              : (role as any).requiredSkills
              ? JSON.parse((role as any).requiredSkills)
              : [],
            candidateStates: Array.isArray((role as any).candidateStates)
              ? (role as any).candidateStates
              : (role as any).candidateStates
              ? JSON.parse((role as any).candidateStates)
              : [],
            candidateReligions: Array.isArray((role as any).candidateReligions)
              ? (role as any).candidateReligions
              : (role as any).candidateReligions
              ? JSON.parse((role as any).candidateReligions)
              : [],
            minHeight:
              (role as any).minHeight !== null &&
              (role as any).minHeight !== undefined
                ? (role as any).minHeight
                : undefined,
            maxHeight:
              (role as any).maxHeight !== null &&
              (role as any).maxHeight !== undefined
                ? (role as any).maxHeight
                : undefined,
            minWeight:
              (role as any).minWeight !== null &&
              (role as any).minWeight !== undefined
                ? (role as any).minWeight
                : undefined,
            maxWeight:
              (role as any).maxWeight !== null &&
              (role as any).maxWeight !== undefined
                ? (role as any).maxWeight
                : undefined,
          })) || [],
        documentRequirements:
          project.documentRequirements?.map((doc: any) => ({
            docType: doc.docType,
            mandatory: doc.mandatory,
            description: doc.description,
          })) || [],
      };

      reset(formData);
    }
  }, [projectData, reset]);

  // Progress steps with completion status
  const progressSteps: ProgressStep[] = STEPS.map((step, index) => ({
    ...step,
    status:
      index < currentStep
        ? "completed"
        : index === currentStep
        ? "current"
        : "upcoming",
  }));

  const goToNextStep = async () => {
    // Ensure form is ready
    if (!projectData?.data) {
      return;
    }

    // Step-specific validation
    let isValidStep = true;

    if (currentStep === 0) {
      // Project Details - validate basic required fields
      isValidStep = await trigger([
        "title",
        "deadline",
        "priority",
        "projectType",
      ]);
    } else if (currentStep === 1) {
      // Requirement Criteria - validate only essential role fields
      isValidStep = await trigger(["rolesNeeded"]);

      // If validation fails, check if it's just missing optional fields
      if (!isValidStep && errors.rolesNeeded) {
        const roles = watch("rolesNeeded");
        const hasValidRoles = roles.every(
          (role) =>
            role.designation &&
            role.designation.trim() !== "" &&
            role.quantity &&
            role.quantity > 0
        );

        if (hasValidRoles) {
          isValidStep = true; // Allow navigation if essential fields are valid
        }
      }
    } else if (currentStep === 2) {
      // Candidate Criteria - allow navigation (optional fields)
      isValidStep = true;
    } else if (currentStep === 3) {
      // Document Requirements - validate document requirements
      isValidStep = await trigger(["documentRequirements"]);
    } else {
      // Preview step - no validation needed
      isValidStep = true;
    }

    if (isValidStep) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < STEPS.length) {
      setCurrentStep(stepIndex);
    }
  };

  // Handle form submission - only called when user clicks "Update Project" button
  const onSubmit = async (data: ProjectFormData) => {
    console.log("onSubmit called with data:", data);
    try {
      // Transform the data for backend
      const transformedData = {
        ...data,
        deadline:
          data.deadline instanceof Date
            ? data.deadline.toISOString()
            : data.deadline,
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
            // Ensure contractDurationYears is properly included
            contractDurationYears: role.contractDurationYears || undefined,
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
          };
        }),
        documentRequirements: data.documentRequirements || [],
      };

      console.log("Calling updateProject API with:", {
        id: projectId,
        data: transformedData,
      });

      const result = await updateProject({
        id: projectId!,
        data: transformedData,
      }).unwrap();

      console.log("Update project result:", result);

      if (result.success) {
        console.log("Update successful, showing toast and navigating");
        toast.success("Project updated successfully!");
        navigate(`/projects/${projectId}`);
      } else {
        console.log("Update failed - result.success is false");
      }
    } catch (error: any) {
      console.error("Update project error:", error);
      toast.error(error?.data?.message || "Failed to update project");
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
        return <ProjectDetailsStep {...stepProps} />;
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

  // Loading state
  if (isLoadingProject || !projectData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-64 bg-slate-200 rounded-lg"></div>
                <div className="h-32 bg-slate-200 rounded-lg"></div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-slate-200 rounded-lg"></div>
                <div className="h-48 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (projectError || !projectData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              Project Not Found
            </h2>
            <p className="text-slate-600">
              The project you're trying to edit doesn't exist or you don't have
              access to it.
            </p>
            <Button onClick={() => navigate("/projects")} className="mt-4">
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!canManageProjects) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              Access Denied
            </h2>
            <p className="text-slate-600">
              You don't have permission to edit projects.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              Edit Project
            </h1>
            <p className="text-slate-600 mt-1">
              Update project details and requirements
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="h-11 px-6 border-slate-200 hover:border-slate-300"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

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
                onClick={() => navigate(`/projects/${projectId}`)}
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
                  onClick={handleSubmit(
                    async (data) => {
                      // Valid submission
                      console.log("Update Project button clicked");
                      console.log("Form data about to submit:", data);

                      await onSubmit(data);
                    },
                    (submitErrors) => {
                      // When validation fails react-hook-form will call the `onInvalid` handler
                      console.warn("Update blocked by validation errors:", submitErrors);
                      toast.error("Please fix validation errors before updating the project");

                      // Jump to the first step containing errors so user can fix them quickly
                      if (submitErrors.title || submitErrors.deadline || submitErrors.priority || submitErrors.projectType) {
                        setCurrentStep(0);
                      } else if (submitErrors.rolesNeeded) {
                        setCurrentStep(1);
                      } else if (submitErrors.documentRequirements) {
                        setCurrentStep(3);
                      } else {
                        // Default to the preview step if we can't detect a specific step
                        setCurrentStep(STEPS.length - 1);
                      }
                    }
                  )}
                disabled={isUpdating}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 h-11 px-8"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating Project...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Project
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
