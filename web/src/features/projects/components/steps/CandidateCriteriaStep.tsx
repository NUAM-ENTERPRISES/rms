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
  Zap,
  ChevronDown,
  Home,
  Utensils,
  Bus,
  Briefcase,
  Calendar,
  Edit3,
  AlertCircle,
} from "lucide-react";
import {
  ProjectQualificationSelect,
  type EducationRequirement,
} from "@/features/projects";
import { useGetSystemConfigQuery } from "@/shared/hooks/useSystemConfig";
import { ProjectFormData } from "../../schemas/project-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { RoleCriteriaModal } from "../RoleCriteriaModal";

// Card background colors - rotating light colors (matching RequirementCriteriaStep)
const CARD_BG_COLORS = [
  "bg-blue-50/40",
  "bg-emerald-50/40",
  "bg-purple-50/40",
  "bg-pink-50/40",
  "bg-orange-50/40",
  "bg-amber-50/40",
  "bg-cyan-50/40",
  "bg-rose-50/40",
];

interface CandidateCriteriaStepProps {
  control: Control<ProjectFormData>;
  watch: UseFormWatch<ProjectFormData>;
  setValue: UseFormSetValue<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
}

export const CandidateCriteriaStep: React.FC<CandidateCriteriaStepProps> = ({
  watch,
  setValue,
  errors,
}) => {
  const { data: systemConfig } = useGetSystemConfigQuery("religions,states");
  const watchedRoles = watch("rolesNeeded");
  
  // State for bulk update tool
  const [bulkCriteria, setBulkCriteria] = useState({
    minExperience: undefined as number | undefined,
    maxExperience: undefined as number | undefined,
    shiftType: undefined as "day" | "night" | "rotating" | "flexible" | undefined,
    genderRequirement: "all" as "all" | "female" | "male" | "other",
    ageRequirement: "",
    accommodation: false,
    food: false,
    transport: false,
    requiredSkills: [] as string[],
    requiredCertifications: "",
    candidateStates: [] as string[],
    candidateReligions: [] as string[],
    educationRequirementsList: [] as EducationRequirement[],
    minSalaryRange: undefined as number | undefined,
    maxSalaryRange: undefined as number | undefined,
  });

  const [bulkSkillInput, setBulkSkillInput] = useState("");
  
  // State for modal
  const [selectedRoleIndex, setSelectedRoleIndex] = useState<number | null>(null);

  const religions = systemConfig?.data?.constants?.religions || [];
  const indianStates = systemConfig?.data?.constants?.indianStates || [];

  // Apply bulk criteria to all roles
  const handleBulkApply = () => {
    if (watchedRoles.length === 0) return;

    const updatedRoles = watchedRoles.map(role => ({
      ...role,
      minExperience: bulkCriteria.minExperience,
      maxExperience: bulkCriteria.maxExperience,
      shiftType: bulkCriteria.shiftType,
      genderRequirement: bulkCriteria.genderRequirement,
      ageRequirement: bulkCriteria.ageRequirement,
      accommodation: bulkCriteria.accommodation,
      food: bulkCriteria.food,
      transport: bulkCriteria.transport,
      requiredSkills: [...bulkCriteria.requiredSkills],
      requiredCertifications: bulkCriteria.requiredCertifications,
      candidateStates: [...bulkCriteria.candidateStates],
      candidateReligions: [...bulkCriteria.candidateReligions],
      educationRequirementsList: [...bulkCriteria.educationRequirementsList],
      minSalaryRange: bulkCriteria.minSalaryRange,
      maxSalaryRange: bulkCriteria.maxSalaryRange,
    }));

    setValue("rolesNeeded", updatedRoles);
    toast.success(`Applied criteria to all ${watchedRoles.length} roles!`);
  };

  return (
    <div className="space-y-6">
      {/* ───── BULK UPDATE TOOL ───── */}
      <Card className="relative border-0 shadow-md bg-gradient-to-r from-emerald-50 via-white to-teal-50/50 overflow-hidden">
        <CardHeader className="pb-1 pt-4 px-5 relative">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 border border-emerald-200">
              <Zap className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Bulk Update — Set Same Criteria for All Roles
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0">
                Fill these once and apply to every role in this project
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative px-5 pb-5 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
            
            {/* Experience */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <User className="h-3 w-3" /> Experience (Min-Max)
              </Label>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  placeholder="Min"
                  value={bulkCriteria.minExperience || ""}
                  onChange={(e) => setBulkCriteria(p => ({...p, minExperience: parseInt(e.target.value) || undefined}))}
                  className="bg-white border-slate-200 h-8 rounded-lg text-xs"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={bulkCriteria.maxExperience || ""}
                  onChange={(e) => setBulkCriteria(p => ({...p, maxExperience: parseInt(e.target.value) || undefined}))}
                  className="bg-white border-slate-200 h-8 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Shift & Gender */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Shift & Gender
              </Label>
              <div className="flex gap-1.5">
                <Select
                  value={bulkCriteria.shiftType || "none"}
                  onValueChange={(v: any) => setBulkCriteria(p => ({...p, shiftType: v === "none" ? undefined : v}))}
                >
                  <SelectTrigger className="bg-white border-slate-200 h-8 rounded-lg text-xs flex-1">
                    <SelectValue placeholder="Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any Shift</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                    <SelectItem value="rotating">Rotating</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={bulkCriteria.genderRequirement}
                  onValueChange={(v: any) => setBulkCriteria(p => ({...p, genderRequirement: v}))}
                >
                  <SelectTrigger className="bg-white border-slate-200 h-8 rounded-lg text-xs flex-1">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Gender</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Salary Range */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Award className="h-3 w-3" /> Salary (Min-Max)
              </Label>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  placeholder="Min"
                  value={bulkCriteria.minSalaryRange || ""}
                  onChange={(e) => setBulkCriteria(p => ({...p, minSalaryRange: parseInt(e.target.value) || undefined}))}
                  className="bg-white border-slate-200 h-8 rounded-lg text-xs"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={bulkCriteria.maxSalaryRange || ""}
                  onChange={(e) => setBulkCriteria(p => ({...p, maxSalaryRange: parseInt(e.target.value) || undefined}))}
                  className="bg-white border-slate-200 h-8 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Multi-select Popovers (Location & Religion) */}
            <div className="space-y-1.5 lg:col-span-1 xl:col-span-1">
              <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location & Religion
              </Label>
              <div className="flex gap-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 text-[10px] flex-1 justify-between bg-white border-slate-200">
                      <span className="truncate">{bulkCriteria.candidateStates.length === 0 ? "Any State" : `${bulkCriteria.candidateStates.length} States`}</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      <div 
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-md cursor-pointer"
                        onClick={() => setBulkCriteria(p => ({...p, candidateStates: []}))}
                      >
                        <Checkbox checked={bulkCriteria.candidateStates.length === 0} />
                        <span className="text-xs">All India</span>
                      </div>
                      {indianStates.map(state => (
                        <div 
                          key={state.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-md cursor-pointer"
                          onClick={() => {
                            const current = bulkCriteria.candidateStates;
                            const next = current.includes(state.id) 
                              ? current.filter(id => id !== state.id)
                              : [...current, state.id];
                            setBulkCriteria(p => ({...p, candidateStates: next}))
                          }}
                        >
                          <Checkbox checked={bulkCriteria.candidateStates.includes(state.id)} />
                          <span className="text-xs">{state.name}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 text-[10px] flex-1 justify-between bg-white border-slate-200">
                      <span className="truncate">{bulkCriteria.candidateReligions.length === 0 ? "Any Religion" : `${bulkCriteria.candidateReligions.length} Rel.`}</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2">
                    <div className="space-y-1">
                      {religions.map(r => (
                        <div 
                          key={r.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-md cursor-pointer"
                          onClick={() => {
                            const current = bulkCriteria.candidateReligions;
                            const next = current.includes(r.id) 
                              ? current.filter(id => id !== r.id)
                              : [...current, r.id];
                            setBulkCriteria(p => ({...p, candidateReligions: next}))
                          }}
                        >
                          <Checkbox checked={bulkCriteria.candidateReligions.includes(r.id)} />
                          <span className="text-xs">{r.name}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Education Bulk */}
            <div className="space-y-1.5 lg:col-span-1 xl:col-span-1">
              <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Education Requirements
              </Label>
              <ProjectQualificationSelect
                countryCode={watch("countryCode") || undefined}
                value={bulkCriteria.educationRequirementsList}
                onChange={(requirements) => setBulkCriteria(p => ({...p, educationRequirementsList: requirements}))}
              />
            </div>

            {/* Skills Bulk */}
            <div className="space-y-1.5 lg:col-span-1 xl:col-span-1">
              <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Award className="h-3 w-3" /> Common Skills
              </Label>
              <div className="flex gap-1">
                <Input
                  placeholder="Add skill..."
                  value={bulkSkillInput}
                  onChange={(e) => setBulkSkillInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (bulkSkillInput.trim()) {
                        setBulkCriteria(p => ({...p, requiredSkills: [...p.requiredSkills, bulkSkillInput.trim()]}));
                        setBulkSkillInput("");
                      }
                    }
                  }}
                  className="bg-white border-slate-200 h-8 rounded-lg text-xs"
                />
                <Button 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={() => {
                    if (bulkSkillInput.trim()) {
                      setBulkCriteria(p => ({...p, requiredSkills: [...p.requiredSkills, bulkSkillInput.trim()]}));
                      setBulkSkillInput("");
                    }
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {bulkCriteria.requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {bulkCriteria.requiredSkills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="px-1 py-0 text-[9px] bg-white border-slate-100">
                      {s}
                      <X className="h-2 w-2 ml-1 cursor-pointer" onClick={() => setBulkCriteria(p => ({...p, requiredSkills: p.requiredSkills.filter((_, idx) => idx !== i)}))} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Checkboxes & Age */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 border-t border-emerald-100/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setBulkCriteria(p => ({...p, accommodation: !p.accommodation}))}>
                  <Checkbox checked={bulkCriteria.accommodation} />
                  <span className="text-[11px] font-medium text-slate-700">Accommodation</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setBulkCriteria(p => ({...p, food: !p.food}))}>
                  <Checkbox checked={bulkCriteria.food} />
                  <span className="text-[11px] font-medium text-slate-700">Food</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setBulkCriteria(p => ({...p, transport: !p.transport}))}>
                  <Checkbox checked={bulkCriteria.transport} />
                  <span className="text-[11px] font-medium text-slate-700">Transport</span>
                </div>
              </div>

              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1 max-w-[200px] flex items-center gap-2">
                  <Label className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">Age Req.</Label>
                  <Input
                    placeholder="e.g. 21-35"
                    value={bulkCriteria.ageRequirement}
                    onChange={(e) => setBulkCriteria(p => ({...p, ageRequirement: e.target.value}))}
                    className="bg-white border-slate-200 h-8 rounded-lg text-xs"
                  />
                </div>

                <div className="flex-1 flex items-center gap-2">
                  <Label className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">Certs.</Label>
                  <Input
                    placeholder="e.g. RN, ACLS"
                    value={bulkCriteria.requiredCertifications}
                    onChange={(e) => setBulkCriteria(p => ({...p, requiredCertifications: e.target.value}))}
                    className="bg-white border-slate-200 h-8 rounded-lg text-xs"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleBulkApply}
                className="h-9 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold gap-2 shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all ml-auto"
              >
                <Zap className="h-3.5 w-3.5" />
                Apply to All Roles
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ───── COMPACT ROLE CARDS GRID ───── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Role Criteria
              <span className="ml-2 text-xs font-normal text-slate-500">
                {watchedRoles.length} role{watchedRoles.length > 1 ? 's' : ''} · Click to edit
              </span>
            </h3>
          </div>
          {errors.rolesNeeded?.root && (
            <p className="text-xs font-medium text-destructive animate-pulse bg-destructive/10 px-2 py-1 rounded-md border border-destructive/20">
              {errors.rolesNeeded.root.message}
            </p>
          )}
          {errors.rolesNeeded && !Array.isArray(errors.rolesNeeded) && (errors.rolesNeeded as any).message && (
             <p className="text-xs font-medium text-destructive animate-pulse bg-destructive/10 px-2 py-1 rounded-md border border-destructive/20">
              {(errors.rolesNeeded as any).message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
          <AnimatePresence mode="popLayout">
            {watchedRoles.map((role, index) => {
              const cardBgColor = CARD_BG_COLORS[index % CARD_BG_COLORS.length];
              const hasExperience = role.minExperience || role.maxExperience;
              const firstEducation = role.educationRequirementsList?.[0];
              const hasBenefits = role.accommodation || role.food || role.transport;
              const schemaError = errors.rolesNeeded?.[index];

              // Local (UI-only) validation required for Candidate Criteria step & modal
              const localValidationMessages: string[] = [];
              if (role.minExperience == null || role.maxExperience == null) {
                localValidationMessages.push("Provide both minimum and maximum experience");
              } else if ((role.minExperience as number) > (role.maxExperience as number)) {
                localValidationMessages.push("Minimum experience must be less than or equal to maximum experience");
              }
              if (!role.ageRequirement || !/^\s*\d+\s*to\s*\d+\s*$/.test(role.ageRequirement)) {
                localValidationMessages.push("Age is required in format '18 to 25'");
              }
              if (!role.educationRequirementsList || role.educationRequirementsList.length === 0) {
                localValidationMessages.push("Add at least one education requirement");
              }

              const hasLocalError = localValidationMessages.length > 0;
              const displayError = !!schemaError || hasLocalError;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, delay: index * 0.02 }}
                  className="group relative cursor-pointer"
                  onClick={() => setSelectedRoleIndex(index)}
                >
                  <Card className={cn(
                    "h-full border shadow-sm hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden",
                    `border-slate-200 ${cardBgColor} hover:border-emerald-300 hover:ring-1 hover:ring-emerald-100`,
                    displayError && "border-destructive ring-1 ring-destructive/20 hover:border-destructive hover:ring-destructive/30"
                  )}>
                    {/* Top colored bar */}
                    <div className={cn(
                      "h-1 w-full",
                      displayError ? "bg-destructive" : (
                        role.genderRequirement === "female" ? "bg-pink-400" :
                        role.genderRequirement === "male" ? "bg-blue-400" : "bg-emerald-400"
                      )
                    )} />

                    {/* Edit indicator */}
                    <div className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/80 text-slate-400 border border-transparent group-hover:border-emerald-200 group-hover:text-emerald-600 transition-all opacity-0 group-hover:opacity-100 z-10">
                      <Edit3 className="h-3 w-3" />
                    </div>

                    {/* Error indicator (moved to bottom-right so it doesn't overlap Edit) */}
                    {displayError && (
                      <div className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-destructive/10 text-destructive z-20 pointer-events-none">
                        <AlertCircle className="h-3 w-3" />
                      </div>
                    )}
                    
                    <CardContent className="px-3 pb-3 pt-2.5 space-y-2">
                      {/* Header: Role number + name */}
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold flex-shrink-0 bg-emerald-100 text-emerald-600">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                            {role.designation || `Role ${index + 1}`}
                          </h4>
                          <p className="text-[9px] text-slate-400 truncate">
                            Qty: {role.quantity || 1}
                          </p>
                        </div>
                      </div>

                      {/* Key Info Grid */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        {/* Experience */}
                        <div className="flex items-center gap-1 bg-white/60 rounded px-1.5 py-1">
                          <Briefcase className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span className="text-slate-600 truncate">
                            {hasExperience 
                              ? `${role.minExperience || 0}-${role.maxExperience || '∞'} yrs` 
                              : 'Any exp'}
                          </span>
                        </div>

                        {/* Gender */}
                        <div className="flex items-center gap-1 bg-white/60 rounded px-1.5 py-1">
                          <User className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          <span className="text-slate-600 truncate capitalize">
                            {role.genderRequirement === "all" ? "Any" : role.genderRequirement || "Any"}
                          </span>
                        </div>

                        {/* Education */}
                        <div className="flex items-center gap-1 bg-white/60 rounded px-1.5 py-1">
                          <BookOpen className="h-3 w-3 text-purple-500 flex-shrink-0" />
                          <span className="text-slate-600 truncate">
                            {firstEducation
                              ? `${role.educationRequirementsList?.length} req`
                              : 'Any edu'}
                          </span>
                        </div>

                        {/* Age */}
                        <div className="flex items-center gap-1 bg-white/60 rounded px-1.5 py-1">
                          <Calendar className="h-3 w-3 text-orange-500 flex-shrink-0" />
                          <span className="text-slate-600 truncate">
                            {role.ageRequirement || 'Any age'}
                          </span>
                        </div>
                      </div>

                      {/* Benefits Icons Row */}
                      {hasBenefits && (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                          {role.accommodation && (
                            <div className="flex items-center justify-center w-5 h-5 rounded bg-blue-50 border border-blue-100" title="Accommodation">
                              <Home className="h-3 w-3 text-blue-500" />
                            </div>
                          )}
                          {role.food && (
                            <div className="flex items-center justify-center w-5 h-5 rounded bg-orange-50 border border-orange-100" title="Food">
                              <Utensils className="h-3 w-3 text-orange-500" />
                            </div>
                          )}
                          {role.transport && (
                            <div className="flex items-center justify-center w-5 h-5 rounded bg-green-50 border border-green-100" title="Transport">
                              <Bus className="h-3 w-3 text-green-500" />
                            </div>
                          )}
                        </div>
                      )}

                      {(schemaError || hasLocalError) && (
                        <div className="bg-red-50 p-1.5 rounded-md border border-red-100 flex items-start gap-1">
                          <AlertCircle className="h-2.5 w-2.5 text-red-500 mt-0.5 flex-shrink-0" />
                          <p className="text-[9px] text-red-600 font-bold leading-tight">
                            {schemaError
                              ? Object.values(schemaError as any)
                                  .map((err: any) => err.message)
                                  .filter(Boolean)[0]
                              : localValidationMessages[0]}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Role Criteria Modal */}
      <RoleCriteriaModal
        isOpen={selectedRoleIndex !== null}
        onClose={() => setSelectedRoleIndex(null)}
        roleIndex={selectedRoleIndex ?? 0}
        watch={watch}
        setValue={setValue}
        errors={errors}
        religions={religions}
        indianStates={indianStates}
        countryCode={watch("countryCode") || undefined}
      />
    </div>
  );
};

export default CandidateCriteriaStep;
