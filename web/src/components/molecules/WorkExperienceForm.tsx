import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as FormLabel } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  MapPin,
  Star,
  X,
  Plus,
} from "lucide-react";

// Validation schema for work experience
const workExperienceSchema = z.object({
  companyName: z.string().min(2, "Company name is required").max(200),
  jobTitle: z.string().min(2, "Job title is required").max(100),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().max(1000).optional(),
  salary: z.number().min(0).optional(),
  location: z.string().max(200).optional(),
  skills: z.array(z.string()).default([]),
  achievements: z.string().max(500).optional(),
});

type WorkExperienceFormData = z.infer<typeof workExperienceSchema>;

interface WorkExperienceFormProps {
  initialData?: Partial<WorkExperienceFormData>;
  onSubmit: (data: WorkExperienceFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

export function WorkExperienceForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = "create",
}: WorkExperienceFormProps) {
  const [skills, setSkills] = useState<string[]>(initialData?.skills || []);
  const [newSkill, setNewSkill] = useState("");

  const form = useForm<WorkExperienceFormData>({
    resolver: zodResolver(workExperienceSchema),
    defaultValues: {
      companyName: initialData?.companyName || "",
      jobTitle: initialData?.jobTitle || "",
      startDate: initialData?.startDate || "",
      endDate: initialData?.endDate || "",
      isCurrent: initialData?.isCurrent || false,
      description: initialData?.description || "",
      salary: initialData?.salary || undefined,
      location: initialData?.location || "",
      achievements: initialData?.achievements || "",
      skills: initialData?.skills || [],
    },
  });

  const handleSubmit = (data: WorkExperienceFormData) => {
    onSubmit({ ...data, skills });
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <Briefcase className="h-5 w-5 text-blue-600" />
          {mode === "create" ? "Add Work Experience" : "Edit Work Experience"}
        </CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Add a new work experience entry"
            : "Update work experience details"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div className="space-y-2">
              <FormLabel
                htmlFor="companyName"
                className="text-slate-700 font-medium"
              >
                Company Name *
              </FormLabel>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="companyName"
                  {...form.register("companyName")}
                  placeholder="ABC Hospital"
                  className="h-11 pl-10 bg-white border-slate-200"
                />
              </div>
              {form.formState.errors.companyName && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.companyName.message}
                </p>
              )}
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <FormLabel
                htmlFor="jobTitle"
                className="text-slate-700 font-medium"
              >
                Job Title *
              </FormLabel>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="jobTitle"
                  {...form.register("jobTitle")}
                  placeholder="Staff Nurse"
                  className="h-11 pl-10 bg-white border-slate-200"
                />
              </div>
              {form.formState.errors.jobTitle && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.jobTitle.message}
                </p>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <FormLabel
                htmlFor="startDate"
                className="text-slate-700 font-medium"
              >
                Start Date *
              </FormLabel>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="startDate"
                  type="date"
                  {...form.register("startDate")}
                  className="h-11 pl-10 bg-white border-slate-200"
                />
              </div>
              {form.formState.errors.startDate && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.startDate.message}
                </p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <FormLabel
                htmlFor="endDate"
                className="text-slate-700 font-medium"
              >
                End Date
              </FormLabel>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="endDate"
                  type="date"
                  {...form.register("endDate")}
                  className="h-11 pl-10 bg-white border-slate-200"
                  disabled={form.watch("isCurrent")}
                />
              </div>
            </div>

            {/* Current Position */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isCurrent"
                {...form.register("isCurrent")}
                className="border-slate-300"
              />
              <FormLabel
                htmlFor="isCurrent"
                className="text-slate-700 font-medium cursor-pointer"
              >
                This is my current position
              </FormLabel>
            </div>

            {/* Salary */}
            <div className="space-y-2">
              <FormLabel
                htmlFor="salary"
                className="text-slate-700 font-medium"
              >
                Salary
              </FormLabel>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="salary"
                  type="number"
                  {...form.register("salary", { valueAsNumber: true })}
                  placeholder="50000"
                  min="0"
                  className="h-11 pl-10 bg-white border-slate-200"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <FormLabel
                htmlFor="location"
                className="text-slate-700 font-medium"
              >
                Location
              </FormLabel>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="location"
                  {...form.register("location")}
                  placeholder="New York, NY"
                  className="h-11 pl-10 bg-white border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <FormLabel
              htmlFor="description"
              className="text-slate-700 font-medium"
            >
              Job Description
            </FormLabel>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Describe your responsibilities and achievements..."
              className="min-h-[100px] bg-white border-slate-200"
            />
          </div>

          {/* Achievements */}
          <div className="space-y-2">
            <FormLabel
              htmlFor="achievements"
              className="text-slate-700 font-medium"
            >
              Key Achievements
            </FormLabel>
            <Textarea
              id="achievements"
              {...form.register("achievements")}
              placeholder="List your key achievements in this role..."
              className="min-h-[80px] bg-white border-slate-200"
            />
          </div>

          {/* Skills */}
          <div className="space-y-3">
            <FormLabel className="text-slate-700 font-medium">
              Skills Gained/Used
            </FormLabel>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a skill..."
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addSkill}
                variant="outline"
                size="sm"
                className="px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Skills List */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 text-sm"
                  >
                    <Star className="h-3 w-3" />
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Saving..."
                : mode === "create"
                ? "Add Experience"
                : "Update Experience"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
