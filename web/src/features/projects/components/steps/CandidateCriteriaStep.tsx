import React, { useState } from "react";
import { Control, UseFormWatch, UseFormSetValue } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import {
  X,
  Plus,
  User,
  MapPin,
  Heart,
  Ruler,
  Weight,
  Award,
  BookOpen,
  Clock,
  FileText,
} from "lucide-react";
import {
  ProjectQualificationSelect,
  type EducationRequirement,
} from "@/features/projects";
import { useGetSystemConfigQuery } from "@/shared/hooks/useSystemConfig";
import { ProjectFormData } from "../../schemas/project-schemas";

interface CandidateCriteriaStepProps {
  control: Control<ProjectFormData>;
  watch: UseFormWatch<ProjectFormData>;
  setValue: UseFormSetValue<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
}

export const CandidateCriteriaStep: React.FC<CandidateCriteriaStepProps> = ({
  control,
  watch,
  setValue,
  errors,
}) => {
  const { data: systemConfig } = useGetSystemConfigQuery();
  const watchedRoles = watch("rolesNeeded");
  const [skillInputs, setSkillInputs] = useState<{ [key: number]: string }>({});

  // Helper function to get qualification name by ID
  const getQualificationName = (qualificationId: string) => {
    // This would need to be implemented based on your qualifications data structure
    return `Qualification ${qualificationId}`;
  };

  // Add skill to a role
  const addSkill = (roleIndex: number) => {
    const skillInput = skillInputs[roleIndex];
    if (skillInput?.trim()) {
      const currentSkills = watchedRoles[roleIndex].requiredSkills || [];
      const updatedSkills = [...currentSkills, skillInput.trim()];
      updateRole(roleIndex, "requiredSkills", updatedSkills);
      setSkillInputs({ ...skillInputs, [roleIndex]: "" });
    }
  };

  // Remove skill from a role
  const removeSkill = (roleIndex: number, skillIndex: number) => {
    const currentSkills = watchedRoles[roleIndex].requiredSkills || [];
    const updatedSkills = currentSkills.filter(
      (_, index) => index !== skillIndex
    );
    updateRole(roleIndex, "requiredSkills", updatedSkills);
  };

  // Update role
  const updateRole = (index: number, field: string, value: any) => {
    const currentRoles = watch("rolesNeeded");
    const updatedRoles = [...currentRoles];
    updatedRoles[index] = { ...updatedRoles[index], [field]: value };
    setValue("rolesNeeded", updatedRoles);
  };

  const religions = systemConfig?.data?.constants?.religions || [];
  const indianStates = systemConfig?.data?.constants?.indianStates || [];

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <User className="h-5 w-5 text-green-600" />
          Candidate Criteria
        </CardTitle>
        <CardDescription>
          Define specific requirements for candidates for each role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {watchedRoles.map((role, index) => (
          <div
            key={index}
            className="border border-slate-200 rounded-lg p-4 bg-slate-50/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-slate-800">
                {role.designation || `Role ${index + 1}`}
              </h4>
            </div>

            <div className="space-y-6">
              {/* Experience Range and Shift Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600" />
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
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600" />
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

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    Shift Type
                  </Label>
                  <Select
                    value={role.shiftType || "none"}
                    onValueChange={(value) =>
                      updateRole(
                        index,
                        "shiftType",
                        value === "none" ? undefined : value
                      )
                    }
                  >
                    <SelectTrigger className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                      <SelectValue placeholder="Select shift type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                      <SelectItem value="rotating">Rotating</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Education Requirements */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  Education Requirements
                </Label>
                <ProjectQualificationSelect
                  countryCode={watch("countryCode") || undefined}
                  value={role.educationRequirementsList || []}
                  onChange={(requirements: EducationRequirement[]) =>
                    updateRole(index, "educationRequirementsList", requirements)
                  }
                />
              </div>

              {/* Required Skills and Certifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Required Skills */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-600" />
                    Required Skills
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={skillInputs[index] || ""}
                      onChange={(e) =>
                        setSkillInputs({
                          ...skillInputs,
                          [index]: e.target.value,
                        })
                      }
                      placeholder="Type a skill and press Enter"
                      className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill(index);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => addSkill(index)}
                      size="sm"
                      className="h-10 px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Display skills as badges */}
                  {role.requiredSkills && role.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {role.requiredSkills.map((skill, skillIndex) => (
                        <Badge
                          key={skillIndex}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {skill}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSkill(index, skillIndex)}
                            className="h-4 w-4 p-0 hover:bg-red-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Required Certifications */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Award className="h-4 w-4 text-orange-600" />
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
              </div>

              {/* Candidate States and Religions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Candidate States */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Candidate Location
                  </Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const currentStates = role.candidateStates || [];
                      if (!currentStates.includes(value)) {
                        updateRole(index, "candidateStates", [
                          ...currentStates,
                          value,
                        ]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                      <SelectValue placeholder="Select states (All India if none selected)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_india">All India</SelectItem>
                      {indianStates.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Display selected states */}
                  {role.candidateStates && role.candidateStates.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {role.candidateStates.map((stateId) => {
                        const state = indianStates.find(
                          (s) => s.id === stateId
                        );
                        return (
                          <Badge
                            key={stateId}
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            {state?.name || stateId}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updatedStates =
                                  role.candidateStates?.filter(
                                    (id) => id !== stateId
                                  ) || [];
                                updateRole(
                                  index,
                                  "candidateStates",
                                  updatedStates
                                );
                              }}
                              className="h-4 w-4 p-0 hover:bg-red-100"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Candidate Religions */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-600" />
                    Religion Preferences
                  </Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const currentReligions = role.candidateReligions || [];
                      if (!currentReligions.includes(value)) {
                        updateRole(index, "candidateReligions", [
                          ...currentReligions,
                          value,
                        ]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                      <SelectValue placeholder="Select religions (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {religions.map((religion) => (
                        <SelectItem key={religion.id} value={religion.id}>
                          {religion.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Display selected religions */}
                  {role.candidateReligions &&
                    role.candidateReligions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {role.candidateReligions.map((religionId) => {
                          const religion = religions.find(
                            (r) => r.id === religionId
                          );
                          return (
                            <Badge
                              key={religionId}
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              {religion?.name || religionId}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updatedReligions =
                                    role.candidateReligions?.filter(
                                      (id) => id !== religionId
                                    ) || [];
                                  updateRole(
                                    index,
                                    "candidateReligions",
                                    updatedReligions
                                  );
                                }}
                                className="h-4 w-4 p-0 hover:bg-red-100"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                </div>
              </div>

              {/* Height and Weight Requirements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-teal-600" />
                    Height Range (cm)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={role.minHeight || ""}
                      onChange={(e) =>
                        updateRole(
                          index,
                          "minHeight",
                          parseFloat(e.target.value)
                        )
                      }
                      placeholder="Min"
                      className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    <Input
                      type="number"
                      value={role.maxHeight || ""}
                      onChange={(e) =>
                        updateRole(
                          index,
                          "maxHeight",
                          parseFloat(e.target.value)
                        )
                      }
                      placeholder="Max"
                      className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Weight className="h-4 w-4 text-amber-600" />
                    Weight Range (kg)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={role.minWeight || ""}
                      onChange={(e) =>
                        updateRole(
                          index,
                          "minWeight",
                          parseFloat(e.target.value)
                        )
                      }
                      placeholder="Min"
                      className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    <Input
                      type="number"
                      value={role.maxWeight || ""}
                      onChange={(e) =>
                        updateRole(
                          index,
                          "maxWeight",
                          parseFloat(e.target.value)
                        )
                      }
                      placeholder="Max"
                      className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                  Additional Notes
                </Label>
                <Textarea
                  value={role.notes || ""}
                  onChange={(e) => updateRole(index, "notes", e.target.value)}
                  placeholder="Any additional requirements or notes for this role..."
                  rows={2}
                  className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CandidateCriteriaStep;
