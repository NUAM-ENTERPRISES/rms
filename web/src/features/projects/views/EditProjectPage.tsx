import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CountrySelect, DatePicker, ClientSelect, JobTitleSelect } from "@/components/molecules";
import { FlagWithName } from "@/shared";
import { useCountryValidation } from "@/shared/hooks/useCountriesLookup";
import { Plus, X, Building2, Target, Save } from "lucide-react";
import {
  useGetProjectQuery,
  useUpdateProjectMutation,
  ProjectQualificationSelect,
  type EducationRequirement,
} from "@/features/projects";
import { useGetClientQuery } from "@/features/clients";
import { useGetQualificationsQuery } from "@/shared/hooks/useQualificationsLookup";
import { useCan } from "@/hooks/useCan";
import {
  projectFormSchema,
  defaultProjectValues,
  type ProjectFormData,
} from "../schemas/project-schemas";

export default function EditProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const canManageProjects = useCan("manage:projects");

  // RTK Query hooks
  const {
    data: projectData,
    isLoading: isLoadingProject,
    error: projectError,
  } = useGetProjectQuery(projectId!);
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
  const { data: qualificationsData } = useGetQualificationsQuery({});
  const { getCountryName } = useCountryValidation();

  // Fetch selected client data for preview
  // NOTE: `watch` is declared later (below) as part of useForm; we'll initialize selected client data after the form is created.

  // Helper function to get qualification name by ID
  const getQualificationName = (qualificationId: string) => {
    const qualification = qualificationsData?.data?.qualifications?.find(
      (q: any) => q.id === qualificationId
    );
    return qualification?.name || `Qualification ${qualificationId}`;
  };

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: defaultProjectValues,
  });

  // Fetch selected client data for preview (watch is available after useForm)
  const selectedClientId = watch("clientId");
  const { data: selectedClientData } = useGetClientQuery(
    selectedClientId || "",
    { skip: !selectedClientId }
  );

  const watchedRoles = watch("rolesNeeded");

  // State for preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ProjectFormData | null>(null);

  // Load project data into form when available
  useEffect(() => {
    if (projectData?.data) {
      const project = projectData.data;
      const formData = {
        title: project.title,
        description: project.description || undefined,
        clientId: project.clientId || undefined,
        countryCode: project.countryCode || undefined,
        deadline: project.deadline ? new Date(project.deadline) : undefined,
        priority:
          (project.priority as "low" | "medium" | "high" | "urgent") ??
          "medium",
        rolesNeeded: project.rolesNeeded.map((role) => ({
          designation: role.designation,
          // Ensure quantity is numeric and fallback to 1 if null/invalid
          quantity: typeof role.quantity === "number" ? role.quantity : 1,
          priority:
            (role.priority as "low" | "medium" | "high" | "urgent") ?? "medium",
          // Normalize numeric experience fields (null -> undefined)
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
            : role.specificExperience || undefined,
          educationRequirementsList:
            role.educationRequirementsList?.map((req) => ({
              qualificationId: req.qualificationId,
              mandatory: req.mandatory,
            })) || [],
          requiredCertifications: Array.isArray(role.requiredCertifications)
            ? role.requiredCertifications.join(", ")
            : role.requiredCertifications || undefined,
          institutionRequirements: role.institutionRequirements || undefined,
          skills: Array.isArray(role.skills)
            ? role.skills.join(", ")
            : role.skills || undefined,
          technicalSkills: Array.isArray(role.technicalSkills)
            ? role.technicalSkills.join(", ")
            : role.technicalSkills || undefined,
          languageRequirements: Array.isArray(role.languageRequirements)
            ? role.languageRequirements.join(", ")
            : role.languageRequirements || undefined,
          licenseRequirements: Array.isArray(role.licenseRequirements)
            ? role.licenseRequirements.join(", ")
            : role.licenseRequirements || undefined,
          minSalaryRange: role.minSalaryRange ?? undefined,
          maxSalaryRange: role.maxSalaryRange ?? undefined,
          benefits: role.benefits || undefined,
          backgroundCheckRequired: role.backgroundCheckRequired,
          drugScreeningRequired: role.drugScreeningRequired,
          // Normalize shiftType to only allow expected enum values or undefined
          shiftType:
            role.shiftType === "day" ||
            role.shiftType === "night" ||
            role.shiftType === "rotating" ||
            role.shiftType === "flexible"
              ? (role.shiftType as
                  | "day"
                  | "night"
                  | "rotating"
                  | "flexible")
              : undefined,
          onCallRequired: role.onCallRequired,
          physicalDemands: role.physicalDemands || undefined,
          relocationAssistance: role.relocationAssistance,
          additionalRequirements: role.additionalRequirements || undefined,
          notes: role.notes || undefined,
        })),
      };

      // Small delay to ensure components are mounted
      setTimeout(() => {
        reset(formData, { keepDirty: false, keepErrors: false });
      }, 100);
    }
  }, [projectData, reset]);

  // Handle preview submission
  const handlePreviewSubmit = async () => {
    if (!previewData || !projectId) return;

    try {
      // Transform the data for backend
      const transformedData = {
        ...previewData,
        deadline:
          previewData.deadline instanceof Date
            ? previewData.deadline.toISOString()
            : previewData.deadline,
        rolesNeeded: previewData.rolesNeeded.map((role: any) => ({
          ...role,
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
        })),
      };

      const result = await updateProject({
        id: projectId,
        data: transformedData,
      }).unwrap();

      if (result.success) {
        toast.success("Project updated successfully!");
        setShowPreview(false);
        navigate(`/projects/${projectId}`);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update project");
    }
  };

  // Handle form submission - show preview instead of direct submission
  const onSubmit = (data: ProjectFormData) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  // Add new role
  const addRole = () => {
    const currentRoles = watch("rolesNeeded");
    setValue(
      "rolesNeeded",
      [
        ...currentRoles,
        {
          roleCatalogId: "",
          designation: "",
          quantity: 1,
          priority: "medium",
          technicalSkills: undefined,
          backgroundCheckRequired: true,
          drugScreeningRequired: true,
          onCallRequired: false,
          relocationAssistance: false,
          visaType: "contract",
          genderRequirement: "all",
          requiredSkills: [],
          candidateStates: [],
          candidateReligions: [],
        },
      ],
      { shouldValidate: true, shouldDirty: true }
    );
  };

  // Remove role
  const removeRole = (index: number) => {
    const currentRoles = watch("rolesNeeded");
    if (currentRoles.length > 1) {
      setValue(
        "rolesNeeded",
        currentRoles.filter((_, i) => i !== index),
        { shouldValidate: true, shouldDirty: true }
      );
    }
  };

  // Update role
  const updateRole = (index: number, field: string, value: any) => {
    const currentRoles = watch("rolesNeeded");
    const updatedRoles = [...currentRoles];
    updatedRoles[index] = { ...updatedRoles[index], [field]: value };
    setValue("rolesNeeded", updatedRoles, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Loading state
  if (isLoadingProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Loading Project...
              </CardTitle>
              <CardDescription className="text-slate-600">
                Please wait while we load the project details.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (projectError || !projectData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Project Not Found
              </CardTitle>
              <CardDescription className="text-slate-600">
                The project you're trying to edit doesn't exist or you don't
                have access to it.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate("/projects")} className="mt-4">
                Back to Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!canManageProjects) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to edit projects.
              </CardDescription>
            </CardHeader>
          </Card>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Project Information */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Project Details
              </CardTitle>
              <CardDescription>
                Basic information about the project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Title */}
                <div className="space-y-2">
                  <Label
                    htmlFor="title"
                    className="text-sm font-medium text-slate-700"
                  >
                    Project Title *
                  </Label>
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="e.g., Emergency Department Staffing"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* Project Deadline */}
                <div className="space-y-2">
                  <Label
                    htmlFor="deadline"
                    className="text-sm font-medium text-slate-700"
                  >
                    Project Deadline *
                  </Label>
                  <Controller
                    name="deadline"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select project deadline"
                      />
                    )}
                  />
                  {errors.deadline && (
                    <p className="text-sm text-red-600">
                      {errors.deadline.message}
                    </p>
                  )}
                </div>

                {/* Project Priority */}
                <div className="space-y-2">
                  <Label
                    htmlFor="priority"
                    className="text-sm font-medium text-slate-700"
                  >
                    Project Priority
                  </Label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              Low
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              Medium
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              High
                            </div>
                          </SelectItem>
                          <SelectItem value="urgent">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              Urgent
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.priority && (
                    <span className="text-sm text-red-600">
                      {errors.priority.message}
                    </span>
                  )}
                </div>

                {/* Client Selection */}
                <div className="space-y-2">
                  <Controller
                    name="clientId"
                    control={control}
                    render={({ field }) => (
                      <ClientSelect
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        label="Client"
                        placeholder="Search and select a client (optional)"
                        allowEmpty={true}
                        error={errors.clientId?.message}
                        pageSize={10}
                      />
                    )}
                  />
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Controller
                    name="countryCode"
                    control={control}
                    render={({ field }) => (
                      <CountrySelect
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        label="Project Country"
                        placeholder="Select project country (optional)"
                        allowEmpty={true}
                        groupByRegion={true}
                        error={errors.countryCode?.message}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Project Description */}
              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-slate-700"
                >
                  Project Description
                </Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Describe the project scope, requirements, and objectives..."
                      rows={4}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Roles Required */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Roles Required
              </CardTitle>
              <CardDescription>
                Define the positions and requirements for this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {watchedRoles.map((role, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-slate-800">
                      Role {index + 1}
                    </h4>
                    {watchedRoles.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRole(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Designation */}
                    <JobTitleSelect
                      value={role.designation}
                      onValueChange={(value) => updateRole(index, "designation", value)}
                      label="Job Title"
                      placeholder="e.g., Registered Nurse"
                      required
                      allowEmpty={false}
                    />

                    {/* Quantity */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Positions Needed *
                      </Label>
                      <Input
                        type="number"
                        value={role.quantity}
                        onChange={(e) =>
                          updateRole(
                            index,
                            "quantity",
                            parseInt(e.target.value)
                          )
                        }
                        min="1"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Priority
                      </Label>
                      <Select
                        value={role.priority}
                        onValueChange={(value) =>
                          updateRole(index, "priority", value)
                        }
                      >
                        <SelectTrigger className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Experience Range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Min Experience (years)
                      </Label>
                      <Input
                        type="number"
                        value={role.minExperience || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRole(
                            index,
                            "minExperience",
                            v === "" ? undefined : Number(v)
                          );
                        }}
                        min="0"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                      {errors.rolesNeeded?.[index]?.minExperience && (
                        <span className="text-sm text-red-600">
                          {errors.rolesNeeded[index].minExperience?.message}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Max Experience (years)
                      </Label>
                      <Input
                        type="number"
                        value={role.maxExperience || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRole(
                            index,
                            "maxExperience",
                            v === "" ? undefined : Number(v)
                          );
                        }}
                        min="0"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                      {errors.rolesNeeded?.[index]?.maxExperience && (
                        <span className="text-sm text-red-600">
                          {errors.rolesNeeded[index].maxExperience?.message}
                        </span>
                      )}
                    </div>

                    {/* Shift Type */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Shift Type
                      </Label>
                      <Select
                        value={role.shiftType || ""}
                        onValueChange={(value) =>
                          updateRole(index, "shiftType", value)
                        }
                      >
                        <SelectTrigger className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select shift type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                          <SelectItem value="rotating">Rotating</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.rolesNeeded?.[index]?.shiftType && (
                        <span className="text-sm text-red-600">
                          {errors.rolesNeeded[index].shiftType?.message}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Additional Requirements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Required Skills
                      </Label>
                      <Input
                        value={role.skills || ""}
                        onChange={(e) =>
                          updateRole(index, "skills", e.target.value || "")
                        }
                        placeholder="e.g., Nursing, Patient Care, Medical Records"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Technical Skills
                      </Label>
                      <Input
                        value={role.technicalSkills || ""}
                        onChange={(e) =>
                          updateRole(
                            index,
                            "technicalSkills",
                            e.target.value || ""
                          )
                        }
                        placeholder="e.g., EPIC, Ventilator Management"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Education Requirements
                      </Label>
                      <ProjectQualificationSelect
                        countryCode={watch("countryCode") || undefined}
                        value={role.educationRequirementsList || []}
                        onChange={(requirements: EducationRequirement[]) =>
                          updateRole(
                            index,
                            "educationRequirementsList",
                            requirements
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Salary Range (Optional)
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Min Salary</Label>
                          <Input
                            type="number"
                            value={role.minSalaryRange ?? ""}
                            onChange={(e) => {
                              const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                              updateRole(index, "minSalaryRange", value);
                            }}
                            placeholder="Min"
                            className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Max Salary</Label>
                          <Input
                            type="number"
                            value={role.maxSalaryRange ?? ""}
                            onChange={(e) => {
                              const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                              updateRole(index, "maxSalaryRange", value);
                            }}
                            placeholder="Max"
                            className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Enter minimum and maximum numeric salary</p>
                      {(errors.rolesNeeded?.[index]?.minSalaryRange || errors.rolesNeeded?.[index]?.maxSalaryRange) && (
                        <span className="text-sm text-red-600">
                          {errors.rolesNeeded[index].minSalaryRange?.message || errors.rolesNeeded[index].maxSalaryRange?.message}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Required Certifications
                      </Label>
                      <Input
                        value={role.requiredCertifications || ""}
                        onChange={(e) =>
                          updateRole(
                            index,
                            "requiredCertifications",
                            e.target.value
                          )
                        }
                        placeholder="e.g., RN, BLS, ACLS"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                      {errors.rolesNeeded?.[index]?.requiredCertifications && (
                        <span className="text-sm text-red-600">
                          {errors.rolesNeeded[index].requiredCertifications?.message}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        License Requirements
                      </Label>
                      <Input
                        value={role.licenseRequirements || ""}
                        onChange={(e) =>
                          updateRole(
                            index,
                            "licenseRequirements",
                            e.target.value
                          )
                        }
                        placeholder="e.g., State RN License, Compact License"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Institution Requirements
                      </Label>
                      <Input
                        value={role.institutionRequirements || ""}
                        onChange={(e) =>
                          updateRole(
                            index,
                            "institutionRequirements",
                            e.target.value
                          )
                        }
                        placeholder="e.g., Accredited nursing program"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Requirements Checkboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`backgroundCheck-${index}`}
                        checked={role.backgroundCheckRequired}
                        onChange={(e) =>
                          updateRole(
                            index,
                            "backgroundCheckRequired",
                            e.target.checked
                          )
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label
                        htmlFor={`backgroundCheck-${index}`}
                        className="text-sm text-slate-700"
                      >
                        Background Check
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`drugScreening-${index}`}
                        checked={role.drugScreeningRequired}
                        onChange={(e) =>
                          updateRole(
                            index,
                            "drugScreeningRequired",
                            e.target.checked
                          )
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label
                        htmlFor={`drugScreening-${index}`}
                        className="text-sm text-slate-700"
                      >
                        Drug Screening
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`onCall-${index}`}
                        checked={role.onCallRequired}
                        onChange={(e) =>
                          updateRole(index, "onCallRequired", e.target.checked)
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label
                        htmlFor={`onCall-${index}`}
                        className="text-sm text-slate-700"
                      >
                        On-Call
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`relocation-${index}`}
                        checked={role.relocationAssistance}
                        onChange={(e) =>
                          updateRole(
                            index,
                            "relocationAssistance",
                            e.target.checked
                          )
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label
                        htmlFor={`relocation-${index}`}
                        className="text-sm text-slate-700"
                      >
                        Relocation
                      </Label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-4">
                    <Label className="text-sm font-medium text-slate-700">
                      Additional Notes
                    </Label>
                    <Textarea
                      value={role.notes || ""}
                      onChange={(e) =>
                        updateRole(index, "notes", e.target.value)
                      }
                      placeholder="Any additional requirements or notes for this role..."
                      rows={2}
                      className="mt-2 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    {errors.rolesNeeded?.[index]?.notes && (
                      <span className="text-sm text-red-600">
                        {errors.rolesNeeded[index].notes?.message}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Role Button */}
              <Button
                type="button"
                variant="outline"
                onClick={addRole}
                className="w-full h-12 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Role
              </Button>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="h-11 px-6 border-slate-200 hover:border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isUpdating}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 h-11 px-8"
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating Project...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Project
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Preview Modal - Same as CreateProjectPage but with update logic */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  Update Project Preview
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-slate-600 mt-2">
                Review your changes before updating the project
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Project Overview */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">
                  Project Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Title</p>
                    <p className="font-medium text-slate-800">
                      {previewData.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Client</p>
                    <p className="font-medium text-slate-800">
                      {selectedClientData?.data?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Deadline</p>
                    <p className="font-medium text-slate-800">
                      {previewData.deadline instanceof Date
                        ? previewData.deadline.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : new Date(previewData.deadline).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Country</p>
                    <div className="font-medium text-slate-800">
                      {previewData.countryCode ? (
                        <FlagWithName
                          countryCode={previewData.countryCode}
                          countryName={
                            getCountryName(previewData.countryCode) || ""
                          }
                          size="sm"
                        />
                      ) : (
                        "Not specified"
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Priority</p>
                    <p className="font-medium text-slate-800">
                      {previewData.priority?.charAt(0).toUpperCase() +
                        previewData.priority?.slice(1) || "Medium"}
                    </p>
                  </div>
                </div>
                {previewData.description && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-600">Description</p>
                    <p className="text-slate-800">{previewData.description}</p>
                  </div>
                )}
              </div>

              {/* Roles Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">
                  Roles Required ({previewData.rolesNeeded.length})
                </h3>
                <div className="space-y-3">
                  {previewData.rolesNeeded.map((role: any, index: number) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-3 border border-slate-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-800">
                          {role.designation}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Qty: {role.quantity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {role.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600">
                        {role.minExperience && role.maxExperience && (
                          <span>
                            Exp: {role.minExperience}-{role.maxExperience}y
                          </span>
                        )}
                        {role.shiftType && <span>Shift: {role.shiftType}</span>}
                        {role.backgroundCheckRequired && (
                          <span>✓ Background Check</span>
                        )}
                        {role.drugScreeningRequired && (
                          <span>✓ Drug Screening</span>
                        )}
                      </div>
                      {/* Education Requirements */}
                      {role.educationRequirementsList &&
                        role.educationRequirementsList.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-600 mb-1">
                              Education Requirements:
                            </p>
                            <div className="text-xs text-slate-500">
                              {role.educationRequirementsList
                                .map((req: any) =>
                                  getQualificationName(req.qualificationId)
                                )
                                .join(", ")}
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  className="px-6"
                >
                  Back to Edit
                </Button>
                <Button
                  onClick={handlePreviewSubmit}
                  disabled={isUpdating}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6"
                >
                  {isUpdating ? "Updating..." : "Update Project"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
