import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  Plus,
  X,
  Calendar,
  Building2,
  Users,
  Target,
  Clock,
  DollarSign,
  GraduationCap,
  Shield,
  FileText,
  AlertCircle,
  CheckCircle,
  Star,
} from "lucide-react";
import { useCreateProjectMutation } from "@/services/projectsApi";
import { useGetClientsQuery } from "@/services/clientsApi";
import { useGetTeamsQuery } from "@/services/teamsApi";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";

// Zod schema for form validation
const createProjectSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  clientId: z.string().min(1, "Client is required"),
  teamId: z.string().optional(),
  deadline: z.string().min(1, "Deadline is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  rolesNeeded: z
    .array(
      z.object({
        designation: z.string().min(1, "Designation is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        priority: z
          .enum(["low", "medium", "high", "urgent"])
          .optional()
          .default("medium"),
        minExperience: z.number().min(0).optional(),
        maxExperience: z.number().min(0).optional(),
        specificExperience: z.string().optional(),
        educationRequirements: z.string().optional(),
        requiredCertifications: z.string().optional(),
        institutionRequirements: z.string().optional(),
        skills: z.string().optional(),
        technicalSkills: z.string().optional(),
        languageRequirements: z.string().optional(),
        licenseRequirements: z.string().optional(),
        salaryRange: z.string().optional(),
        benefits: z.string().optional(),
        backgroundCheckRequired: z.boolean().default(true),
        drugScreeningRequired: z.boolean().default(true),
        shiftType: z.enum(["day", "night", "rotating", "flexible"]).optional(),
        onCallRequired: z.boolean().default(false),
        physicalDemands: z.string().optional(),
        relocationAssistance: z.boolean().default(false),
        additionalRequirements: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1, "At least one role is required"),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const canCreateProjects = useCan("manage:projects");

  // RTK Query hooks
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const { data: clientsData, isLoading: clientsLoading } = useGetClientsQuery();
  const { data: teamsData, isLoading: teamsLoading } = useGetTeamsQuery();

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset,
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      priority: "medium",
      rolesNeeded: [
        {
          designation: "",
          quantity: 1,
          priority: "medium",
          backgroundCheckRequired: true,
          drugScreeningRequired: true,
          onCallRequired: false,
          relocationAssistance: false,
        },
      ],
    },
  });

  const watchedRoles = watch("rolesNeeded");

  // State for preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<CreateProjectFormData | null>(
    null
  );

  // Handle preview submission
  const handlePreviewSubmit = async () => {
    if (!previewData) return;

    try {
      // Transform the data for backend
      const transformedData = {
        ...previewData,
        rolesNeeded: previewData.rolesNeeded.map((role) => ({
          ...role,
          // Convert string arrays to JSON strings if needed
          specificExperience: role.specificExperience
            ? JSON.stringify(
                role.specificExperience.split(",").map((s) => s.trim())
              )
            : undefined,
          educationRequirements: role.educationRequirements
            ? JSON.stringify(
                role.educationRequirements.split(",").map((s) => s.trim())
              )
            : undefined,
          requiredCertifications: role.requiredCertifications
            ? JSON.stringify(
                role.requiredCertifications.split(",").map((s) => s.trim())
              )
            : undefined,
          skills: role.skills
            ? JSON.stringify(role.skills.split(",").map((s) => s.trim()))
            : undefined,
          technicalSkills: role.technicalSkills
            ? JSON.stringify(
                role.technicalSkills.split(",").map((s) => s.trim())
              )
            : undefined,
          languageRequirements: role.languageRequirements
            ? JSON.stringify(
                role.languageRequirements.split(",").map((s) => s.trim())
              )
            : undefined,
          licenseRequirements: role.licenseRequirements
            ? JSON.stringify(
                role.licenseRequirements.split(",").map((s) => s.trim())
              )
            : undefined,
          institutionRequirements: role.institutionRequirements
            ? role.institutionRequirements
            : undefined,
        })),
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
  const onSubmit = (data: CreateProjectFormData) => {
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
        priority: "medium",
        backgroundCheckRequired: true,
        drugScreeningRequired: true,
        onCallRequired: false,
        relocationAssistance: false,
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

                {/* Client Selection */}
                <div className="space-y-2">
                  <Label
                    htmlFor="clientId"
                    className="text-sm font-medium text-slate-700"
                  >
                    Client *
                  </Label>
                  <Controller
                    name="clientId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientsData?.data?.clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-slate-400" />
                                {client.name}
                                <Badge variant="outline" className="text-xs">
                                  {client.type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.clientId && (
                    <p className="text-sm text-red-600">
                      {errors.clientId.message}
                    </p>
                  )}
                </div>

                {/* Team Assignment */}
                <div className="space-y-2">
                  <Label
                    htmlFor="teamId"
                    className="text-sm font-medium text-slate-700"
                  >
                    Assigned Team
                  </Label>
                  <Controller
                    name="teamId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                          <SelectValue placeholder="Select a team (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamsData?.data?.teams?.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-slate-400" />
                                {team.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Deadline */}
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
                      <Input
                        {...field}
                        type="datetime-local"
                        className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    )}
                  />
                  {errors.deadline && (
                    <p className="text-sm text-red-600">
                      {errors.deadline.message}
                    </p>
                  )}
                </div>

                {/* Priority */}
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
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Job Title *
                      </Label>
                      <Input
                        value={role.designation}
                        onChange={(e) =>
                          updateRole(index, "designation", e.target.value)
                        }
                        placeholder="e.g., Registered Nurse"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

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
                        Technical Skills
                      </Label>
                      <Input
                        value={role.technicalSkills || ""}
                        onChange={(e) =>
                          updateRole(index, "technicalSkills", e.target.value)
                        }
                        placeholder="e.g., EPIC, Ventilator Management"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Education Requirements
                      </Label>
                      <Input
                        value={role.educationRequirements || ""}
                        onChange={(e) =>
                          updateRole(
                            index,
                            "educationRequirements",
                            e.target.value
                          )
                        }
                        placeholder="e.g., BSN, MSN"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
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

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Language Requirements
                      </Label>
                      <Input
                        value={role.languageRequirements || ""}
                        onChange={(e) =>
                          updateRole(
                            index,
                            "languageRequirements",
                            e.target.value
                          )
                        }
                        placeholder="e.g., English, Spanish, French"
                        className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
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
                      {clientsData?.data?.clients?.find(
                        (c: any) => c.id === previewData.clientId
                      )?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Deadline</p>
                    <p className="font-medium text-slate-800">
                      {new Date(previewData.deadline).toLocaleDateString(
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
                    <p className="text-sm text-slate-600">Team</p>
                    <p className="font-medium text-slate-800">
                      {previewData.teamId
                        ? teamsData?.data?.teams?.find(
                            (t: any) => t.id === previewData.teamId
                          )?.name || "N/A"
                        : "Not assigned"}
                    </p>
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
                  {previewData.rolesNeeded.map((role, index) => (
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
    </div>
  );
}
