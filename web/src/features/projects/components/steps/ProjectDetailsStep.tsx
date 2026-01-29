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
import { Checkbox } from "@/components/ui/checkbox";
import { CountrySelect, DatePicker, ClientSelect } from "@/components/molecules";
import { Building2, Target, CheckCircle, Shield } from "lucide-react";
import { ProjectFormData } from "../../schemas/project-schemas";

interface ProjectDetailsStepProps {
  control: Control<ProjectFormData>;
  watch: UseFormWatch<ProjectFormData>;
  setValue: UseFormSetValue<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
  onCreateClientClick?: () => void;
}

export const ProjectDetailsStep: React.FC<ProjectDetailsStepProps> = ({
  control,
  watch,
  setValue,
  errors,
  onCreateClientClick,
}) => {
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
            {errors.priority && (
              <span className="text-sm text-red-600">{errors.priority.message}</span>
            )}
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
                  onCreateClick={onCreateClientClick}
                />
              )}
            />
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
          {errors.description && (
            <span className="text-sm text-red-600">{errors.description.message}</span>
          )}
        </div>

        {/* New Project-Specific Fields */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
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
            {errors.resumeEditable && (
              <span className="text-sm text-red-600">{errors.resumeEditable.message}</span>
            )}
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
            {errors.groomingRequired && (
              <span className="text-sm text-red-600">{errors.groomingRequired.message}</span>
            )}
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
            {errors.hideContactInfo && (
              <span className="text-sm text-red-600">{errors.hideContactInfo.message}</span>
            )}
          </div>

          {/* Project-level Visa Type */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-700">Visa Type</Label>
            <Controller
              name="visaType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_visa">
                      <div className="flex items-center gap-2">Direct Visa</div>
                    </SelectItem>
                    <SelectItem value="company_visa">
                      <div className="flex items-center gap-2">Company Visa</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.visaType && (
              <span className="text-sm text-red-600">{errors.visaType.message}</span>
            )}
          </div>
        </div>

        {/* Required Screening Checkbox */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-start space-x-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <Controller
              name="requiredScreening"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="requiredScreening"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1"
                />
              )}
            />
            <div className="flex-1">
              <Label
                htmlFor="requiredScreening"
                className="text-sm font-medium text-slate-800 cursor-pointer flex items-center gap-2"
              >
                <Shield className="h-4 w-4 text-blue-600" />
                Required Screening Process
              </Label>
              <p className="text-xs text-slate-600 mt-1">
                Enable this if candidates must complete a mandatory screening process before being considered for this project
              </p>
              {errors.requiredScreening && (
                <span className="text-sm text-red-600 mt-1 block">{errors.requiredScreening.message}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectDetailsStep;
