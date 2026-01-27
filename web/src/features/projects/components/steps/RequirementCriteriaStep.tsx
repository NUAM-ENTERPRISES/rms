import React from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Target, Plus, X } from "lucide-react";
import { ProjectFormData } from "../../schemas/project-schemas";
import { JobTitleSelect, DepartmentSelect } from "@/components/molecules";

interface RequirementCriteriaStepProps {
  control: Control<ProjectFormData>;
  watch: UseFormWatch<ProjectFormData>;
  setValue: UseFormSetValue<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
}

export const RequirementCriteriaStep: React.FC<
  RequirementCriteriaStepProps
> = ({ control, watch, setValue, errors }) => {
  const watchedRoles = watch("rolesNeeded");

  // Add new role
  const addRole = () => {
    const currentRoles = watch("rolesNeeded");
    setValue("rolesNeeded", [
      ...currentRoles,
      {
          departmentId: undefined,
        roleCatalogId: "",
        designation: "",
        quantity: 1,
        visaType: "contract",
        genderRequirement: "all",
        requiredSkills: [],
        candidateStates: [],
        candidateReligions: [],
        minExperience: undefined,
        maxExperience: undefined,
        specificExperience: "",
        educationRequirementsList: [],
        requiredCertifications: "",
        institutionRequirements: "",
        skills: "",
        languageRequirements: "",
        licenseRequirements: "",
        salaryRange: undefined,
        benefits: "",
        shiftType: undefined,
        physicalDemands: "",
        additionalRequirements: "",
        notes: "",
        contractDurationYears: undefined,
        minHeight: undefined,
        maxHeight: undefined,
        minWeight: undefined,
        maxWeight: undefined,
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

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          Requirement Criteria
        </CardTitle>
        <CardDescription>
          Define the positions and basic requirements for this project
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Department */}
              <div className="space-y-2">
                <DepartmentSelect
                  value={role.departmentId}
                  onValueChange={(value) => {
                    updateRole(index, "departmentId", value);
                    // clear selected designation and roleCatalogId when department changes
                    updateRole(index, "designation", "");
                    updateRole(index, "roleCatalogId", "");
                  }}
                  label="Department"
                  placeholder="Select department"
                />
                {/* If job title is not shown, surface designation validation here so user knows it's required */}
                {!role.departmentId && errors.rolesNeeded?.[index]?.designation && (
                  <span className="text-sm text-red-600">
                    {errors.rolesNeeded[index].designation?.message}
                  </span>
                )}
              </div>

              {/* Job Title (always visible but disabled until department selected) */}
              <div className="space-y-2">
                <JobTitleSelect
                  value={role.designation}
                  onRoleChange={(role) => {
                    if (role) {
                      // Save both roleCatalogId and designation
                      updateRole(index, "roleCatalogId", role.id);
                      updateRole(index, "designation", role.label);
                    } else {
                      // Clear both when deselected
                      updateRole(index, "roleCatalogId", "");
                      updateRole(index, "designation", "");
                    }
                  }}
                  label="Job Title"
                  placeholder={role.departmentId ? "e.g., Registered Nurse" : "Select a department to enable job titles"}
                  required
                  allowEmpty={false}
                  departmentId={role.departmentId}
                  disabled={!role.departmentId}
                />
                {errors.rolesNeeded?.[index]?.designation && (
                  <span className="text-sm text-red-600">
                    {errors.rolesNeeded[index].designation?.message}
                  </span>
                )}
              </div>

              {/* Positions Needed */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Positions Needed *
                </Label>
                <Input
                  type="number"
                  value={role.quantity ?? ""}
                  onChange={(e) =>
                    updateRole(index, "quantity", e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  min="1"
                  className="h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
                {errors.rolesNeeded?.[index]?.quantity && (
                  <span className="text-sm text-red-600">
                    {errors.rolesNeeded[index].quantity?.message}
                  </span>
                )}
              </div>

              {/* Visa Type */}
              {/* <div className="space-y-2">
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
                    <SelectItem value="contract">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Contract
                      </div>
                    </SelectItem>
                    <SelectItem value="permanent">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Permanent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.rolesNeeded?.[index]?.visaType && (
                  <span className="text-sm text-red-600">
                    {errors.rolesNeeded[index].visaType?.message}
                  </span>
                )}
              </div> */}

              {/* Contract Duration (only for contract visa) */}
              {/* {role.visaType === "contract" && (
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
                  {errors.rolesNeeded?.[index]?.contractDurationYears && (
                    <span className="text-sm text-red-600">
                      {errors.rolesNeeded[index].contractDurationYears?.message}
                    </span>
                  )}
                </div>
              )} */}
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

        {/* General rolesNeeded Error */}
        {errors.rolesNeeded && !Array.isArray(errors.rolesNeeded) && (
          <span className="text-sm text-red-600">
            {errors.rolesNeeded.message}
          </span>
        )}
      </CardContent>
    </Card>
  );
};

export default RequirementCriteriaStep;
