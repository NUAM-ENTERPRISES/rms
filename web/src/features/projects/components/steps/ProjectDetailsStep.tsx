import React, { useEffect } from "react";
import {
  Control,
  Controller,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";
import { FieldErrors } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { CountrySelect, DatePicker } from "@/components/molecules";
import { Building2, Target, CheckCircle } from "lucide-react";
import { useGetClientsQuery } from "@/features/clients";
import { ProjectFormData } from "../../schemas/project-schemas";

interface ProjectDetailsStepProps {
  control: Control<ProjectFormData>;
  watch: UseFormWatch<ProjectFormData>;
  setValue: UseFormSetValue<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
}

export const ProjectDetailsStep: React.FC<ProjectDetailsStepProps> = ({
  control,
  watch,
  setValue,
  errors,
}) => {
  const { data: clientsData } = useGetClientsQuery();
  const projectType = watch("projectType");

  // Set default contact visibility based on project type
  useEffect(() => {
    if (projectType === "private") {
      setValue("hideContactInfo", true);
    } else if (projectType === "ministry") {
      setValue("hideContactInfo", false);
    }
  }, [projectType, setValue]);

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Project Details
        </CardTitle>
        <CardDescription>Basic information about the project</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Title */}
          <div className="space-y-1">
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
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Project Deadline */}
          <div className="space-y-1">
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
              <p className="text-sm text-red-600">{errors.deadline.message}</p>
            )}
          </div>

          {/* Project Priority */}
          <div className="space-y-1">
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
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
          <div className="space-y-1">
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
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
          <div className="space-y-1">
            <Label
              htmlFor="clientId"
              className="text-sm font-medium text-slate-700"
            >
              Client
            </Label>
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                    <SelectValue placeholder="Select a client (optional)" />
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
              <p className="text-sm text-red-600">{errors.clientId.message}</p>
            )}
          </div>

          {/* Country */}
          <div className="space-y-1">
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

        {/* New Project-Specific Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
          {/* Resume Editable */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-700">
              Resume Editing Policy
            </Label>
            <Controller
              name="resumeEditable"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(value === "true")}
                  value={field.value.toString()}
                >
                  <SelectTrigger className="h-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        Resume can be edited
                      </div>
                    </SelectItem>
                    <SelectItem value="false">
                      <div className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-red-600" />
                        Resume cannot be edited
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Grooming Required */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-700">
              Grooming/Dressing Requirements
            </Label>
            <Controller
              name="groomingRequired"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        Formal Mandatory
                      </div>
                    </SelectItem>
                    <SelectItem value="casual">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        Casual Allowed
                      </div>
                    </SelectItem>
                    <SelectItem value="not_specified">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                        Not Specified
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Contact Information Visibility */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-700">
              Contact Information Visibility
            </Label>
            <Controller
              name="hideContactInfo"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(value === "true")}
                  value={field.value.toString()}
                >
                  <SelectTrigger className="h-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        Show email and mobile
                      </div>
                    </SelectItem>
                    <SelectItem value="true">
                      <div className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-red-600" />
                        Hide email and mobile
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectDetailsStep;
