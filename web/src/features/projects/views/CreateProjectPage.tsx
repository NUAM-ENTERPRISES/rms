import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, X, Building2, Target, CheckCircle } from "lucide-react";
import {
  useCreateProjectMutation,
  ProjectQualificationSelect,
  type EducationRequirement,
} from "@/features/projects";
import DocumentRequirementsSection from "../components/DocumentRequirementsSection";
import { useGetClientQuery, CreateClientModal } from "@/features/clients";
import { useGetQualificationsQuery } from "@/shared/hooks/useQualificationsLookup";
import { useCan } from "@/hooks/useCan";
import {
  projectFormSchema,
  defaultProjectValues,
  type ProjectFormData,
} from "../schemas/project-schemas";

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const canCreateProjects = useCan("manage:projects");

  // State for create client modal
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);

  // RTK Query hooks
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const { data: qualificationsData } = useGetQualificationsQuery({});
  const { getCountryName } = useCountryValidation();

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
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      ...defaultProjectValues,
      title: "",
      deadline: undefined as any,
    },
    mode: "onChange",
  });

  const watchedRoles = watch("rolesNeeded");

  // State for preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Fetch selected client data for preview
  const { data: selectedClientData } = useGetClientQuery(
    previewData?.clientId || "",
    { skip: !previewData?.clientId }
  );

  // Handle preview submission
  const handlePreviewSubmit = async () => {
    if (!previewData) return;

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
        })),
        documentRequirements: previewData.documentRequirements || [],
      };

      const result = await createProject(transformedData).unwrap();

      if (result.success) {
        toast.success("Project created successfully!");
        setShowPreview(false);
        navigate(`/projects/${result.data.id}`);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create project");
    }
  };

  // Handle form submission - show preview instead of direct submission
  const onSubmit = (data: any) => {
    // Validate deadline is in the future for new projects
    if (data.deadline && data.deadline <= new Date()) {
      toast.error("Deadline must be in the future for new projects");
      return;
    }

    setPreviewData(data);
    setShowPreview(true);
  };

  // Add new role
  const addRole = () => {
    const currentRoles = watch("rolesNeeded");
    setValue("rolesNeeded", [
      ...currentRoles,
      {
        designation: "",
        quantity: 1,
        visaType: "contract" as const,
        genderRequirement: "all" as const,
        requiredSkills: [],
        candidateStates: [],
        candidateReligions: [],
      },
    ]);
  };

  // Remove role
  const removeRole = (index: number) => {
    const currentRoles = watch("rolesNeeded");
    if (currentRoles.length > 1) {
      setValue(
        "rolesNeeded",
        currentRoles.filter((_, i) => i !== index)
      );
    }
  };

  // Update role
  const updateRole = (index: number, field: string, value: any) => {
    const currentRoles = watch("rolesNeeded");
    const updatedRoles = [...currentRoles];
    updatedRoles[index] = { ...updatedRoles[index], [field]: value };
    setValue("rolesNeeded", updatedRoles);
  };

  if (!canCreateProjects) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to create projects.
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
                </div>

                {/* Project Type */}
                <div className="space-y-2">
                  <Label
                    htmlFor="projectType"
                    className="text-sm font-medium text-slate-700"
                  >
                    Project Type *
                  </Label>
                  <Controller
                    name="projectType"
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
                          <SelectItem value="private">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-blue-600" />
                              Private Sector
                            </div>
                          </SelectItem>
                          <SelectItem value="ministry">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-purple-600" />
                              Ministry/Government
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.projectType && (
                    <p className="text-sm text-red-600">
                      {errors.projectType.message}
                    </p>
                  )}
                </div>

                {/* Client Selection */}
                <div className="space-y-2">
                  <Controller
                    name="clientId"
                    control={control}
                    render={({ field }) => (
                      <ClientSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        label="Client"
                        placeholder="Search and select a client (optional)"
                        allowEmpty={true}
                        error={errors.clientId?.message}
                        pageSize={10}
                        showCreateButton
                        onCreateClick={() => setShowCreateClientModal(true)}
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
                        value={field.value}
                        onValueChange={field.onChange}
                        label="Project Country*"
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
                  Project Description*
                </Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
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

                    {/* Visa Type */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Visa Type *
                      </Label>
                      <Select
                        value={role.visaType || "contract"}
                        onValueChange={(value) =>
                          updateRole(index, "visaType", value)
                        }
                      >
                        <SelectTrigger className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="permanent">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              Permanent
                            </div>
                          </SelectItem>
                          <SelectItem value="contract">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              Contract
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Contract Duration (only for contract roles) */}
                    {role.visaType === "contract" && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Contract Duration (years) *
                        </Label>
                        <Input
                          type="number"
                          value={role.contractDurationYears || ""}
                          onChange={(e) =>
                            updateRole(
                              index,
                              "contractDurationYears",
                              parseInt(e.target.value)
                            )
                          }
                          min="1"
                          max="10"
                          placeholder="e.g., 2"
                          className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>
                    )}

                    {/* Gender Requirement */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Gender Requirement *
                      </Label>
                      <Select
                        value={role.genderRequirement || "all"}
                        onValueChange={(value) =>
                          updateRole(index, "genderRequirement", value)
                        }
                      >
                        <SelectTrigger className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              All Genders
                            </div>
                          </SelectItem>
                          <SelectItem value="female">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                              Female Only
                            </div>
                          </SelectItem>
                          <SelectItem value="male">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              Male Only
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Experience Range - Same Row */}
                    <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Min Experience (years)
                        </Label>
                        <Input
                          type="number"
                          value={role.minExperience || ""}
                          onChange={(e) =>
                            updateRole(
                              index,
                              "minExperience",
                              parseInt(e.target.value)
                            )
                          }
                          min="0"
                          className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Max Experience (years)
                        </Label>
                        <Input
                          type="number"
                          value={role.maxExperience || ""}
                          onChange={(e) =>
                            updateRole(
                              index,
                              "maxExperience",
                              parseInt(e.target.value)
                            )
                          }
                          min="0"
                          className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>
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
                          updateRole(index, "skills", e.target.value)
                        }
                        placeholder="e.g., Nursing, Patient Care, Medical Records"
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
                    </div>

                    {/* <div className="space-y-2">
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
                    </div> */}
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

          {/* Document Requirements Section */}
          <DocumentRequirementsSection
            control={control}
            watch={watch}
            setValue={setValue}
            errors={errors}
          />

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/projects")}
              className="h-11 px-6 border-slate-200 hover:border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isCreating}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 h-11 px-8"
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
          </div>
        </form>
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  Project Preview
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
                Review your project details before creating
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
                          {role.visaType && (
                            <Badge variant="outline" className="text-xs">
                              {role.visaType}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600">
                        {role.minExperience && role.maxExperience && (
                          <span>
                            Exp: {role.minExperience}-{role.maxExperience}y
                          </span>
                        )}
                        {role.shiftType && <span>Shift: {role.shiftType}</span>}
                        {role.visaType && <span>Visa: {role.visaType}</span>}
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

              {/* Document Requirements Summary */}
              {previewData.documentRequirements &&
                previewData.documentRequirements.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4 mt-4">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">
                      Document Requirements (
                      {previewData.documentRequirements.length})
                    </h3>
                    <div className="space-y-2">
                      {previewData.documentRequirements.map(
                        (req: any, index: number) => (
                          <div
                            key={index}
                            className="bg-white rounded-lg p-3 border border-slate-200 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 capitalize">
                                  {req.docType.replace(/_/g, " ")}
                                </p>
                                {req.description && (
                                  <p className="text-sm text-slate-600">
                                    {req.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {req.mandatory && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Mandatory
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                Required
                              </Badge>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
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
                  disabled={isCreating}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6"
                >
                  {isCreating ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Client Modal */}
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
