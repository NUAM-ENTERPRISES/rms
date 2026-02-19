import React, { useState } from "react";
import { UseFormWatch, UseFormSetValue, FieldErrors } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  X,
  Plus,
  User,
  MapPin,
  Award,
  BookOpen,
  Clock,
  Briefcase,
  AlertCircle,
  Home,
  Utensils,
  Bus,
  ChevronDown,
  Save,
} from "lucide-react";
import {
  ProjectQualificationSelect,
  type EducationRequirement,
} from "@/features/projects";
import { ProjectFormData } from "../schemas/project-schemas";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface RoleCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleIndex: number;
  watch: UseFormWatch<ProjectFormData>;
  setValue: UseFormSetValue<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
  religions: Array<{ id: string; name: string }>;
  indianStates: Array<{ id: string; name: string }>;
  countryCode?: string;
}

export const RoleCriteriaModal: React.FC<RoleCriteriaModalProps> = ({
  isOpen,
  onClose,
  roleIndex,
  watch,
  setValue,
  errors,
  religions,
  indianStates,
  countryCode,
}) => {
  const watchedRoles = watch("rolesNeeded");
  const role = watchedRoles[roleIndex];
  
  const roleErrors = errors.rolesNeeded?.[roleIndex] as any;
  
  const [skillInput, setSkillInput] = useState("");

  if (!role) return null;

  // Local (UI-only) validation for modal (these fields are mandatory on this page/modal)
  const localErrors = {
    minExperienceMissing: role.minExperience == null,
    maxExperienceMissing: role.maxExperience == null,
    experienceRangeInvalid:
      role.minExperience != null && role.maxExperience != null && role.minExperience > role.maxExperience,
    ageMissing: !role.ageRequirement || role.ageRequirement.trim() === "",
    ageFormatInvalid: role.ageRequirement && !/^\s*\d+\s*to\s*\d+\s*$/.test(role.ageRequirement),
    educationMissing: !(role.educationRequirementsList && role.educationRequirementsList.length > 0),
  };


  // Update role field
  const updateRole = (field: string, value: any) => {
    const currentRoles = watch("rolesNeeded");
    const updatedRoles = [...currentRoles];
    updatedRoles[roleIndex] = { ...updatedRoles[roleIndex], [field]: value };
    setValue("rolesNeeded", updatedRoles);
  };

  // Add skill
  const addSkill = () => {
    if (skillInput.trim()) {
      const currentSkills = role.requiredSkills || [];
      updateRole("requiredSkills", [...currentSkills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  // Remove skill
  const removeSkill = (skillIndex: number) => {
    const currentSkills = role.requiredSkills || [];
    updateRole("requiredSkills", currentSkills.filter((_, i) => i !== skillIndex));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[1400px] w-full max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-emerald-600" />
            {role.designation || `Role #${roleIndex + 1}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Set candidate requirements and criteria for this role
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Row 1: Experience & Shift */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className={cn(
                "text-[11px] font-semibold flex items-center gap-1",
                roleErrors?.minExperience ? "text-destructive" : "text-slate-600"
              )}>
                <User className="h-3 w-3 text-green-600" /> Min Exp
                {roleErrors?.minExperience && <AlertCircle className="h-3 w-3" />}
              </Label>
              <Input
                type="number"
                value={role.minExperience || ""}
                onChange={(e) => updateRole("minExperience", e.target.value === "" ? undefined : parseInt(e.target.value))}
                min="0"
                placeholder="0"
                aria-invalid={!!(roleErrors?.minExperience || localErrors.minExperienceMissing || localErrors.experienceRangeInvalid)}
                className={cn(
                  "h-9 bg-white text-sm",
                  (roleErrors?.minExperience || localErrors.minExperienceMissing || localErrors.experienceRangeInvalid)
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-slate-200"
                )}
              />
              {(roleErrors?.minExperience || localErrors.minExperienceMissing || localErrors.experienceRangeInvalid) && (
                <p className="text-[10px] text-destructive font-medium">
                  {roleErrors?.minExperience?.message || (localErrors.experienceRangeInvalid ? "Minimum experience must be less than or equal to maximum experience" : "Minimum experience is required")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className={cn(
                "text-[11px] font-semibold flex items-center gap-1",
                roleErrors?.maxExperience ? "text-destructive" : "text-slate-600"
              )}>
                <User className="h-3 w-3 text-green-600" /> Max Exp
                {roleErrors?.maxExperience && <AlertCircle className="h-3 w-3" />}
              </Label>
              <Input
                type="number"
                value={role.maxExperience || ""}
                onChange={(e) => updateRole("maxExperience", e.target.value === "" ? undefined : parseInt(e.target.value))}
                min="0"
                placeholder="10"
                aria-invalid={!!(roleErrors?.maxExperience || localErrors.maxExperienceMissing || localErrors.experienceRangeInvalid)}
                className={cn(
                  "h-9 bg-white text-sm",
                  (roleErrors?.maxExperience || localErrors.maxExperienceMissing || localErrors.experienceRangeInvalid)
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-slate-200"
                )}
              />
              {(roleErrors?.maxExperience || localErrors.maxExperienceMissing || localErrors.experienceRangeInvalid) && (
                <p className="text-[10px] text-destructive font-medium">
                  {roleErrors?.maxExperience?.message || (localErrors.experienceRangeInvalid ? "Minimum experience must be less than or equal to maximum experience" : "Maximum experience is required")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className={cn(
                "text-[11px] font-semibold flex items-center gap-1",
                roleErrors?.shiftType ? "text-destructive" : "text-slate-600"
              )}>
                <Clock className="h-3 w-3 text-indigo-600" /> Shift
                {roleErrors?.shiftType && <AlertCircle className="h-3 w-3" />}
              </Label>
              <Select
                value={role.shiftType || "none"}
                onValueChange={(v) => updateRole("shiftType", v === "none" ? undefined : v)}
              >
                <SelectTrigger className={cn(
                  "h-9 bg-white text-sm",
                  roleErrors?.shiftType ? "border-destructive focus-visible:ring-destructive" : "border-slate-200"
                )}>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                  <SelectItem value="rotating">Rotating</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
              {roleErrors?.shiftType && (
                <p className="text-[10px] text-destructive font-medium">
                  {roleErrors.shiftType.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <User className="h-3 w-3 text-blue-600" /> Gender
              </Label>
              <Select
                value={role.genderRequirement || "all"}
                onValueChange={(v) => updateRole("genderRequirement", v)}
              >
                <SelectTrigger className="h-9 bg-white border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Age, Quantity, Certs, States, Religion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className={cn(
                "text-[11px] font-semibold flex items-center gap-1",
                roleErrors?.ageRequirement ? "text-destructive" : "text-slate-600"
              )}>
                Age Requirement
                {roleErrors?.ageRequirement && <AlertCircle className="h-3 w-3" />}
              </Label>
              <Input
                placeholder="e.g. 18 to 25"
                value={role.ageRequirement || ""}
                onChange={(e) => updateRole("ageRequirement", e.target.value)}
                aria-invalid={!!(roleErrors?.ageRequirement || localErrors.ageMissing || localErrors.ageFormatInvalid)}
                className={cn(
                  "h-9 bg-white text-sm transition-colors",
                  (roleErrors?.ageRequirement || localErrors.ageMissing || localErrors.ageFormatInvalid)
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-slate-200"
                )}
              />
              {(roleErrors?.ageRequirement || localErrors.ageMissing || localErrors.ageFormatInvalid) && (
                <p className="text-[10px] text-destructive font-medium leading-tight">
                  {roleErrors?.ageRequirement?.message || (localErrors.ageFormatInvalid ? "Age must be in format '18 to 25'" : "Age requirement is required (e.g. '18 to 25')")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className={cn(
                "text-[11px] font-semibold flex items-center gap-1",
                roleErrors?.quantity ? "text-destructive" : "text-slate-600"
              )}>
                Quantity Needed
                {roleErrors?.quantity && <AlertCircle className="h-3 w-3" />}
              </Label>
              <Input
                type="number"
                value={role.quantity ?? ""}
                onChange={(e) => updateRole("quantity", e.target.value === "" ? undefined : parseInt(e.target.value))}
                placeholder="e.g. 1"
                min="1"
                className={cn(
                  "h-9 bg-white text-sm",
                  roleErrors?.quantity ? "border-destructive focus-visible:ring-destructive" : "border-slate-200"
                )}
              />
               {roleErrors?.quantity && (
                <p className="text-[10px] text-destructive font-medium">
                  {roleErrors.quantity.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-600">Certifications</Label>
              <Input
                value={role.requiredCertifications || ""}
                onChange={(e) => updateRole("requiredCertifications", e.target.value)}
                placeholder="e.g. RN, ACLS"
                className="h-9 bg-white border-slate-200 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-pink-600" /> States
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-9 justify-between bg-white border-slate-200 text-sm"
                  >
                    <span className="truncate">
                      {!role.candidateStates?.length
                        ? "Any State"
                        : `${role.candidateStates.length} Selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 max-h-60 overflow-y-auto">
                  <div
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer border-b mb-1"
                    onClick={() => updateRole("candidateStates", [])}
                  >
                    <Checkbox checked={!role.candidateStates?.length} />
                    <span className="text-sm font-medium">Any State</span>
                  </div>
                  {indianStates.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer"
                      onClick={() => {
                        const current = role.candidateStates || [];
                        const next = current.includes(s.id)
                          ? current.filter((id) => id !== s.id)
                          : [...current, s.id];
                        updateRole("candidateStates", next);
                      }}
                    >
                      <Checkbox checked={(role.candidateStates || []).includes(s.id)} />
                      <span className="text-sm">{s.name}</span>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <User className="h-3 w-3 text-orange-600" /> Religion
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-9 justify-between bg-white border-slate-200 text-sm"
                  >
                    <span className="truncate">
                      {!role.candidateReligions?.length
                        ? "Any Religion"
                        : `${role.candidateReligions.length} Selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2">
                  {religions.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer"
                      onClick={() => {
                        const current = role.candidateReligions || [];
                        const next = current.includes(r.id)
                          ? current.filter((id) => id !== r.id)
                          : [...current, r.id];
                        updateRole("candidateReligions", next);
                      }}
                    >
                      <Checkbox checked={(role.candidateReligions || []).includes(r.id)} />
                      <span className="text-sm">{r.name}</span>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Column: Education */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-blue-600" /> Education Requirements
              </Label>
              <ProjectQualificationSelect
                countryCode={countryCode}
                value={role.educationRequirementsList || []}
                onChange={(requirements: EducationRequirement[]) =>
                  updateRole("educationRequirementsList", requirements)
                }
              />
              {(roleErrors?.educationRequirementsList || localErrors.educationMissing) && (
                <p className="text-[10px] text-destructive font-medium mt-1">
                  {roleErrors?.educationRequirementsList?.message || "Select at least one education requirement"}
                </p>
              )}
            </div>

            {/* Right Column: Salary & Skills */}
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label className={cn(
                  "text-[11px] font-semibold flex items-center gap-1",
                  roleErrors?.salaryRange ? "text-destructive" : "text-slate-600"
                )}>
                  <Award className="h-3 w-3 text-emerald-600" /> Salary Range
                  {roleErrors?.salaryRange && <AlertCircle className="h-3 w-3" />}
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Min"
                    value={(role.salaryRange as any)?.min || ""}
                    onChange={(e) => {
                      const range = (role.salaryRange as any) || { min: "", max: "", currency: "USD" };
                      updateRole("salaryRange", { ...range, min: e.target.value });
                    }}
                    className={cn(
                      "h-9 flex-1 bg-white text-sm",
                      roleErrors?.salaryRange ? "border-destructive focus-visible:ring-destructive" : "border-slate-200"
                    )}
                  />
                  <Input
                    placeholder="Max"
                    value={(role.salaryRange as any)?.max || ""}
                    onChange={(e) => {
                      const range = (role.salaryRange as any) || { min: "", max: "", currency: "USD" };
                      updateRole("salaryRange", { ...range, max: e.target.value });
                    }}
                    className={cn(
                      "h-9 flex-1 bg-white text-sm",
                      roleErrors?.salaryRange ? "border-destructive focus-visible:ring-destructive" : "border-slate-200"
                    )}
                  />
                  <Select
                    value={(role.salaryRange as any)?.currency || "USD"}
                    onValueChange={(v) => {
                      const range = (role.salaryRange as any) || { min: "", max: "", currency: "USD" };
                      updateRole("salaryRange", { ...range, currency: v });
                    }}
                  >
                    <SelectTrigger className={cn(
                      "h-9 w-24 bg-white text-sm",
                      roleErrors?.salaryRange ? "border-destructive focus-visible:ring-destructive" : "border-slate-200"
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {roleErrors?.salaryRange && (
                  <p className="text-[10px] text-destructive font-medium">
                    {roleErrors.salaryRange.message || (roleErrors.salaryRange as any).root?.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Award className="h-3 w-3 text-purple-600" /> Required Skills
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Type skill and press Enter..."
                    className="h-9 bg-white border-slate-200 text-sm"
                  />
                  <Button type="button" size="sm" onClick={addSkill} className="h-9 px-3">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {role.requiredSkills && role.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {role.requiredSkills.map((s, si) => (
                      <Badge
                        key={si}
                        variant="secondary"
                        className="px-2.5 py-1 text-xs bg-white border border-slate-100 gap-1 text-slate-600"
                      >
                        {s}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-red-500"
                          onClick={() => removeSkill(si)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
            {/* Perks */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Benefits Included</span>
              <div className="flex flex-wrap items-center gap-6">
                <div
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => updateRole("accommodation", !role.accommodation)}
                >
                  <Checkbox checked={!!role.accommodation} />
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    role.accommodation ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400 group-hover:text-blue-400"
                  )}>
                    <Home className="h-4 w-4" />
                  </div>
                  <span className={cn("text-xs font-medium", role.accommodation ? "text-slate-900" : "text-slate-500")}>Accommodation</span>
                </div>
                <div
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => updateRole("food", !role.food)}
                >
                  <Checkbox checked={!!role.food} />
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    role.food ? "bg-orange-50 text-orange-600" : "bg-slate-50 text-slate-400 group-hover:text-orange-400"
                  )}>
                    <Utensils className="h-4 w-4" />
                  </div>
                  <span className={cn("text-xs font-medium", role.food ? "text-slate-900" : "text-slate-500")}>Food</span>
                </div>
                <div
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => updateRole("transport", !role.transport)}
                >
                  <Checkbox checked={!!role.transport} />
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    role.transport ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400 group-hover:text-emerald-400"
                  )}>
                    <Bus className="h-4 w-4" />
                  </div>
                  <span className={cn("text-xs font-medium", role.transport ? "text-slate-900" : "text-slate-500")}>Transport</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-600">Additional Notes</Label>
              <Textarea
                value={role.notes || ""}
                onChange={(e) => updateRole("notes", e.target.value)}
                placeholder="Add any special requirements or notes..."
                rows={2}
                className="text-xs bg-white border-slate-200 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button onClick={onClose} className="gap-2">
            <Save className="h-4 w-4" />
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleCriteriaModal;
