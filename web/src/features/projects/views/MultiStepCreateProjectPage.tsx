import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
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

  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    trigger,
    setError,
    clearErrors,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaultProjectValues,
  });

<<<<<<< HEAD
  // Automatically update document requirements based on project details
  const watchedLicensingExam = watch("licensingExam");
  const watchedDataFlow = watch("dataFlow");
  const watchedEligibility = watch("eligibility");

  useEffect(() => {
    const currentRequirements = watch("documentRequirements") || [];
    let updatedRequirements = [...currentRequirements];
    let hasChanges = false;

    // Helper to find the index of a docType
    const findDocIndex = (docType: string) => 
      updatedRequirements.findIndex(r => r.docType === docType);

    // 1. Handle Licensing Exam
    // Current licensing exam values (prometric, dha, etc.) are now valid docTypes
    const neededExamDoc = watchedLicensingExam && watchedLicensingExam !== "none" 
      ? watchedLicensingExam
      : null;

    // Remove old exam docs that are no longer needed
    const allExamDocTypes = [
      "saudi_prometric", "moh_prometric", "qchp_prometric", "prometric_result",
      "prometric", "dha", "haad", "moh", "scfhs", "qchp", "omsb", "nhra", 
      "nmc_uk", "cbt", "oet", "ielts", "usmle", "nclex_rn"
    ];
    updatedRequirements = updatedRequirements.filter(r => {
      if (allExamDocTypes.includes(r.docType)) {
        if (r.isAutomatic && r.docType !== neededExamDoc) {
          hasChanges = true;
          return false;
        }
      }
      return true;
    });

    // Add needed exam doc if missing
    if (neededExamDoc && findDocIndex(neededExamDoc) === -1) {
      updatedRequirements.push({
        docType: neededExamDoc,
        mandatory: true,
        description: `Automatically added based on ${watchedLicensingExam} licensing exam requirement`,
        isAutomatic: true,
      });
      hasChanges = true;
    }

    // 2. Handle Data Flow
    const dataFlowIndex = findDocIndex("dataflow_report");
    if (watchedDataFlow) {
      if (dataFlowIndex === -1) {
        updatedRequirements.push({
          docType: "dataflow_report",
          mandatory: true,
          description: "Automatically added based on Data Flow requirement",
          isAutomatic: true,
        });
        hasChanges = true;
      }
    } else {
      if (dataFlowIndex !== -1 && updatedRequirements[dataFlowIndex].isAutomatic) {
        updatedRequirements.splice(dataFlowIndex, 1);
        hasChanges = true;
      }
    }

    // 3. Handle Eligibility
    const eligibilityIndex = findDocIndex("eligibility_letter");
    if (watchedEligibility) {
      if (eligibilityIndex === -1) {
        updatedRequirements.push({
          docType: "eligibility_letter",
          mandatory: true,
          description: "Automatically added based on Eligibility requirement",
          isAutomatic: true,
        });
        hasChanges = true;
      }
    } else {
      if (eligibilityIndex !== -1 && updatedRequirements[eligibilityIndex].isAutomatic) {
        updatedRequirements.splice(eligibilityIndex, 1);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setValue("documentRequirements", updatedRequirements, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [watchedLicensingExam, watchedDataFlow, watchedEligibility, setValue, watch]);

  // Create progress steps with status
=======
>>>>>>> copy/dark-theme
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
    if (currentStep === 1) {
      const roles = watch("rolesNeeded") || [];
      let hasQtyError = false;
      roles.forEach((r: any, idx: number) => {
        clearErrors([`rolesNeeded.${idx}.quantity`]);
        if (r.quantity == null || r.quantity <= 0) {
          setError(`rolesNeeded.${idx}.quantity`, {
            type: "manual",
            message: "Quantity is required — enter number of positions",
          });
          hasQtyError = true;
        }
      });
      if (hasQtyError) {
        toast.error("Quantity is required — enter number of positions");
        return;
      }
    }

    const stepFields = getStepFields(currentStep);
    const isStepValid = await trigger(stepFields);

    if (currentStep === 2) {
      const roles = watch("rolesNeeded") || [];
      const invalidRoleIndexes: number[] = [];

      roles.forEach((r: any, idx: number) => {
        clearErrors([
          `rolesNeeded.${idx}.minExperience`,
          `rolesNeeded.${idx}.maxExperience`,
          `rolesNeeded.${idx}.ageRequirement`,
          `rolesNeeded.${idx}.educationRequirementsList`,
        ]);

        let roleHasError = false;

        if (r.minExperience == null) {
          setError(`rolesNeeded.${idx}.minExperience`, {
            type: "manual",
            message: "Minimum experience is required",
          });
          roleHasError = true;
        }
        if (r.maxExperience == null) {
          setError(`rolesNeeded.${idx}.maxExperience`, {
            type: "manual",
            message: "Maximum experience is required",
          });
          roleHasError = true;
        }
        if (
          r.minExperience != null &&
          r.maxExperience != null &&
          r.minExperience > r.maxExperience
        ) {
          setError(`rolesNeeded.${idx}.maxExperience`, {
            type: "manual",
            message:
              "Minimum experience must be less than or equal to maximum experience",
          });
          roleHasError = true;
        }
        if (
          !r.ageRequirement ||
          !/^\s*\d+\s*to\s*\d+\s*$/.test(r.ageRequirement)
        ) {
          setError(`rolesNeeded.${idx}.ageRequirement`, {
            type: "manual",
            message: "Age is required in format '18 to 25'",
          });
          roleHasError = true;
        }
        if (
          !r.educationRequirementsList ||
          r.educationRequirementsList.length === 0
        ) {
          setError(`rolesNeeded.${idx}.educationRequirementsList`, {
            type: "manual",
            message: "Select at least one education requirement",
          });
          roleHasError = true;
        }

        if (roleHasError) invalidRoleIndexes.push(idx);
      });

      if (invalidRoleIndexes.length) {
        toast.error(
          "Please fix required candidate fields (experience, age, education) for the highlighted roles"
        );
        return;
      }
    }

    if (isStepValid) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      console.log("Validation errors:", errors);

      let errorMessage = "Please fix the errors before proceeding";

      if (errors.rolesNeeded) {
        if ((errors.rolesNeeded as any).root) {
          errorMessage = (errors.rolesNeeded as any).root.message;
        } else if (Array.isArray(errors.rolesNeeded)) {
          const firstRoleErrorEntry = errors.rolesNeeded.find((e) => e);
          if (firstRoleErrorEntry) {
            const firstFieldError = Object.values(firstRoleErrorEntry).find(
              (err) => (err as any)?.message
            );
            if (firstFieldError) {
              errorMessage = `Role Error: ${(firstFieldError as any).message}`;
            }
          }
        }
      } else {
        const firstError = Object.values(errors).find(
          (err) => (err as any)?.message
        );
        if (firstError) {
          errorMessage = (firstError as any).message;
        }
      }

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

  const getStepFields = (stepIndex: number): (keyof ProjectFormData)[] => {
    switch (stepIndex) {
      case 0:
        return ["title", "deadline", "projectType", "description"];
      case 1:
        return ["rolesNeeded"];
      case 2:
        return ["rolesNeeded"];
      case 3:
        return ["documentRequirements"];
      case 4:
        return [];
      default:
        return [];
    }
  };

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const transformedData = {
        ...data,
        deadline:
          data.deadline instanceof Date
            ? data.deadline.toISOString()
            : data.deadline,
        clientId: data.clientId || "",
        rolesNeeded: data.rolesNeeded.map((role: any) => {
          const { departmentId, ...roleWithoutDepartmentId } = role;
          return {
            ...roleWithoutDepartmentId,
            ageRequirement: role.ageRequirement || undefined,
            accommodation: !!role.accommodation,
            food: !!role.food,
            transport: !!role.transport,
            target: role.target !== undefined ? role.target : undefined,
            requiredSkills: JSON.stringify(role.requiredSkills || []),
            candidateStates: JSON.stringify(role.candidateStates || []),
            candidateReligions: JSON.stringify(role.candidateReligions || []),
<<<<<<< HEAD
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
          technicalSkills: role.technicalSkills
            ? JSON.stringify(
                role.technicalSkills.split(",").map((s: string) => s.trim())
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
          minSalaryRange: role.minSalaryRange,
          maxSalaryRange: role.maxSalaryRange,
=======
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
            salaryRange: role.salaryRange
              ? JSON.stringify(role.salaryRange)
              : undefined,
>>>>>>> copy/dark-theme
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:bg-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-black rounded-lg shadow-lg p-8 text-center border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
              Access Denied
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              You don't have permission to create projects.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br dark:bg-black">
      <div className="w-full mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        {/* Progress Bar */}
        <div className="bg-white dark:bg-black rounded-lg shadow-lg p-4 border border-slate-200 dark:border-slate-800">
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
          <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-black rounded-lg shadow-lg p-6">
            {currentStep === 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/projects")}
                className="h-11 px-6 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Cancel
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                className="h-11 px-6 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2 text-slate-600 dark:text-slate-400" />
                Back
              </Button>
            )}

            <div className="flex items-center gap-3">
              {currentStep < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={goToNextStep}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 h-11 px-8"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={!isValid || isCreating}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-700 dark:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 h-11 px-8"
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