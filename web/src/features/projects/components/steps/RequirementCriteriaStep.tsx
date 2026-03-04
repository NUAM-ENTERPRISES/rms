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
import { Plus, Zap, ChevronDown, Building2, Stethoscope, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ProjectFormData } from "../../schemas/project-schemas";
import { JobTitleSelect, DepartmentSelect } from "@/components/molecules";
import { useGetRoleDepartmentsQuery } from "@/features/projects";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { motion, AnimatePresence } from "framer-motion";

interface RequirementCriteriaStepProps {
  control: Control<ProjectFormData>;
  watch: UseFormWatch<ProjectFormData>;
  setValue: UseFormSetValue<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
}

// Friendly type labels & icons
const ROLE_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  nurse: { label: "Nursing Staff", icon: "🩺", color: "text-blue-600 bg-blue-50 border-blue-200" },
  doctor: { label: "Doctors / Physicians", icon: "👨‍⚕️", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  other: { label: "Other Professionals", icon: "👤", color: "text-purple-600 bg-purple-50 border-purple-200" },
};

// Card background colors - rotating light colors
const CARD_BG_COLORS = [
  "bg-blue-50",
  "bg-emerald-50",
  "bg-purple-50",
  "bg-pink-50",
  "bg-orange-50",
  "bg-amber-50",
  "bg-cyan-50",
  "bg-rose-50",
];

export const RequirementCriteriaStep: React.FC<
  RequirementCriteriaStepProps
> = ({ control, watch, setValue, errors }) => {
  const watchedRoles = watch("rolesNeeded");

  // State for bulk addition tool
  const [quickBuild, setQuickBuild] = React.useState({
    roleType: "nurse",
    departmentIds: [] as string[],
    visaType: "permanent" as "contract" | "permanent",
    quantity: 1,
  });

  // List state for pagination and search
  const [searchInput, setSearchInput] = React.useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [deptPage, setDeptPage] = React.useState(1);
  const DEPT_LIMIT = 20;

  // Confirm dialog state for clearing all role cards
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  const handleClearAllConfirm = () => {
    // reset to single empty role (keeps same shape used elsewhere)
    setValue("rolesNeeded", [
      {
        departmentId: undefined,
        roleCatalogId: "",
        designation: "",
        quantity: 1,
        visaType: "contract",
        genderRequirement: "all",
      } as any,
    ]);

    toast.success("All role cards cleared");
    setShowClearConfirm(false);
  };

  // Reset page when search changes
  React.useEffect(() => {
    setDeptPage(1);
  }, [debouncedSearch]);

  // Fetch departments with roles for bulk addition
  const { data: deptData, isLoading: isLoadingDepts, isFetching: isFetchingDepts } = useGetRoleDepartmentsQuery({ 
    includeRoles: true, 
    limit: DEPT_LIMIT,
    page: deptPage,
    search: debouncedSearch
  });
  
  const allDepartments = deptData?.data?.departments || [];
  const deptPagination = deptData?.data?.pagination;

  // Cache department labels and roles to persist across pages during selection
  const [deptLookup, setDeptLookup] = React.useState<Record<string, { label: string, shortName?: string, roles: any[] }>>({});

  React.useEffect(() => {
    if (allDepartments.length > 0) {
      setDeptLookup(prev => {
        const next = { ...prev };
        allDepartments.forEach(d => {
          next[d.id] = { label: d.label, shortName: d.shortName, roles: d.roles || [] };
        });
        return next;
      });
    }
  }, [allDepartments]);

  // Helper: find department label by id
  const getDeptLabel = (id?: string) => {
    if (!id) return "";
    return deptLookup[id]?.label || allDepartments.find(d => d.id === id)?.label || "";
  };

  // Count of valid (filled) roles
  const filledRolesCount = watchedRoles.filter(r => r.roleCatalogId).length;
  const totalPositions = watchedRoles.reduce((sum, r) => sum + (r.quantity || 0), 0);

  // Toggle department selection for bulk add
  const toggleDepartment = (deptId: string) => {
    setQuickBuild(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...prev.departmentIds, deptId]
    }));
  };

  // Perform bulk addition
  const handleBulkAdd = () => {
    if (quickBuild.departmentIds.length === 0) {
      toast.error("Please select at least one department");
      return;
    }

    // Normalize current roles so we can detect duplicates by departmentId+roleCatalogId
    const currentRoles = watchedRoles.length === 1 && !watchedRoles[0].roleCatalogId
      ? []
      : watchedRoles;

    const existingKeys = new Set(
      currentRoles
        .filter((r: any) => r.roleCatalogId)
        .map((r: any) => `${r.departmentId || ""}::${r.roleCatalogId}`)
    );

    const newRoles: any[] = [];
    let duplicatesSkipped = 0;

    quickBuild.departmentIds.forEach(deptId => {
      const dept = deptLookup[deptId] || allDepartments.find(d => d.id === deptId);
      if (dept && dept.roles) {
        const matchingRole = dept.roles.find((r: any) => r.type === quickBuild.roleType);

        if (matchingRole) {
          const key = `${deptId || ""}::${matchingRole.id}`;
          if (existingKeys.has(key)) {
            duplicatesSkipped += 1;
            return; // skip duplicate
          }

          existingKeys.add(key);
          newRoles.push({
            departmentId: deptId,
            roleCatalogId: matchingRole.id,
            designation: matchingRole.label || matchingRole.name,
            quantity: quickBuild.quantity,
            visaType: quickBuild.visaType,
            genderRequirement: "all",
            requiredSkills: [],
            candidateStates: [],
            candidateReligions: [],
            backgroundCheckRequired: true,
            drugScreeningRequired: true,
            onCallRequired: false,
            relocationAssistance: false,
            ageRequirement: "",
            educationRequirementsList: [],
            priority: "medium",
          });
        }
      }
    });

    if (newRoles.length > 0) {
      setValue("rolesNeeded", [...currentRoles, ...newRoles]);

      const addedMsg = `${newRoles.length} role${newRoles.length > 1 ? "s" : ""} added successfully!`;
      if (duplicatesSkipped > 0) {
        toast.success(`${addedMsg} ${duplicatesSkipped} duplicate${duplicatesSkipped > 1 ? "s" : ""} skipped.`);
      } else {
        toast.success(addedMsg);
      }

      setQuickBuild(prev => ({ ...prev, departmentIds: [] }));
    } else if (duplicatesSkipped > 0) {
      // All selected items were duplicates
      toast.error(`All selected departments already have this role — ${duplicatesSkipped} duplicate${duplicatesSkipped > 1 ? "s" : ""} skipped.`);
    } else {
      toast.error(`No ${ROLE_TYPE_CONFIG[quickBuild.roleType]?.label || quickBuild.roleType} found in selected departments`);
    }
  };

  // Add new role manually — prevent duplicate empty placeholder
  const addRole = () => {
    const currentRoles = watch("rolesNeeded") || [];

    // If there's already an empty placeholder (no department & no role selected), don't add another
    const hasEmptyPlaceholder = currentRoles.some((r: any) => !r.roleCatalogId && !r.designation && !r.departmentId);
    if (hasEmptyPlaceholder) {
      toast.info("Please fill the existing empty role card before adding a new one");
      return;
    }

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
    } else {
      setValue("rolesNeeded", [{
        departmentId: undefined,
        roleCatalogId: "",
        designation: "",
        quantity: 1,
        visaType: "contract",
        genderRequirement: "all",
      } as any]);
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
    <div className="space-y-8">

      {/* ───── SECTION 1: Quick Build ───── */}
   <Card className="relative border-0 shadow-md bg-gradient-to-r from-indigo-50 via-white to-purple-50/50 dark:bg-black dark:from-black dark:via-black dark:to-black overflow-hidden">
  <CardHeader className="pb-1 pt-4 px-5 relative border-b border-slate-200 dark:border-slate-800">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50">
        <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Quick Add — Build Multiple Roles at Once
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0">
          3 steps: pick staff type → select departments → generate
        </CardDescription>
      </div>
    </div>
  </CardHeader>

  <CardContent className="relative px-5 pb-4 pt-3 bg-white dark:bg-black">
    <div className="flex flex-wrap items-end gap-4">

      {/* Step 1: Job Type */}
      <div className="space-y-1.5 min-w-[160px] flex-1">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">1</span>
          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Staff type</Label>
        </div>
        <Select 
          value={quickBuild.roleType} 
          onValueChange={(v) => setQuickBuild(p => ({...p, roleType: v}))}
        >
          <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 rounded-lg shadow-sm text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
            <SelectItem value="nurse"><span className="flex items-center gap-1.5 text-xs">🩺 Nurses</span></SelectItem>
            <SelectItem value="doctor"><span className="flex items-center gap-1.5 text-xs">👨‍⚕️ Doctors</span></SelectItem>
            <SelectItem value="other"><span className="flex items-center gap-1.5 text-xs">👤 Other</span></SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Step 2: Departments */}
      <div className="space-y-1.5 min-w-[220px] flex-[2]">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">2</span>
          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Departments</Label>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full h-9 justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm text-xs text-slate-900 dark:text-slate-100"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                {quickBuild.departmentIds.length === 0 
                  ? "Click to pick..." 
                  : `${quickBuild.departmentIds.length} selected`}
              </span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50 text-slate-400 dark:text-slate-500" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 rounded-xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-black">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Choose Departments</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {quickBuild.departmentIds.length} selected
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      const allCurrentIds = allDepartments.map(d => d.id);
                      const isAllCurrentSelected = allCurrentIds.every(id => quickBuild.departmentIds.includes(id));
                      
                      setQuickBuild(p => ({
                        ...p, 
                        departmentIds: isAllCurrentSelected 
                          ? p.departmentIds.filter(id => !allCurrentIds.includes(id))
                          : [...new Set([...p.departmentIds, ...allCurrentIds])]
                      }));
                    }}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 h-6 px-2"
                  >
                    {allDepartments.length > 0 && allDepartments.every(d => quickBuild.departmentIds.includes(d.id))
                      ? "Deselect Page" 
                      : "Select Page"}
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <Input 
                  placeholder="Search departments..." 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8 h-8 text-[11px] rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-indigo-500 dark:focus:ring-indigo-500 focus:border-indigo-500 dark:focus:border-indigo-500"
                />
                {isFetchingDepts && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 border-2 border-indigo-600/30 dark:border-indigo-400/30 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-1 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {allDepartments.length === 0 && !isLoadingDepts ? (
                  <div className="col-span-2 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No departments found
                  </div>
                ) : (
                  allDepartments.map((dept) => {
                    const isSelected = quickBuild.departmentIds.includes(dept.id);
                    return (
                      <div 
                        key={dept.id} 
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all cursor-pointer border",
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50" 
                            : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleDepartment(dept.id);
                        }}
                      >
                        <Checkbox 
                          checked={isSelected}
                          className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-indigo-600 dark:data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:border-indigo-600 pointer-events-none h-3.5 w-3.5"
                        />
                        <span className={cn(
                          "text-[11px] font-medium leading-none cursor-pointer truncate",
                          isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-600 dark:text-slate-300"
                        )}>
                          {dept.shortName || dept.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Bar */}
              {deptPagination && deptPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 mt-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Page {deptPage} of {deptPagination.totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deptPage <= 1}
                      onClick={() => setDeptPage(p => p - 1)}
                      className="h-7 w-7 p-0 rounded-md border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deptPage >= deptPagination.totalPages}
                      onClick={() => setDeptPage(p => p + 1)}
                      className="h-7 w-7 p-0 rounded-md border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Step 3: Visa Type */}
      <div className="space-y-1.5 min-w-[120px] flex-1">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">3</span>
          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Employment</Label>
        </div>
        <Select 
          value={quickBuild.visaType} 
          onValueChange={(v: any) => setQuickBuild(p => ({...p, visaType: v}))}
        >
          <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 rounded-lg shadow-sm text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
            <SelectItem value="permanent">Permanent</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Step 4: Quantity */}
      <div className="space-y-1.5 w-[80px]">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">4</span>
          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Qty</Label>
        </div>
        <Input
          type="number"
          min="1"
          value={quickBuild.quantity}
          onChange={(e) => setQuickBuild(p => ({...p, quantity: parseInt(e.target.value) || 1}))}
          className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 rounded-lg shadow-sm text-xs text-center font-bold text-slate-900 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-500"
        />
      </div>

      {/* Generate Button */}
      <Button
        type="button"
        onClick={handleBulkAdd}
        disabled={isLoadingDepts || quickBuild.departmentIds.length === 0}
        className={cn(
          "h-9 px-5 rounded-lg text-white text-xs font-bold shadow-md transition-all gap-1.5",
          quickBuild.departmentIds.length > 0 
            ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 shadow-indigo-200 dark:shadow-indigo-900/30 active:scale-[0.97]" 
            : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
        )}
      >
        {isLoadingDepts ? (
          <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
        ) : (
          <Zap className="h-3.5 w-3.5" />
        )}
        {quickBuild.departmentIds.length > 0 
          ? `Generate ${quickBuild.departmentIds.length}`
          : "Select Depts"}
      </Button>
    </div>

    {/* Selected departments preview chips */}
    {quickBuild.departmentIds.length > 0 && quickBuild.departmentIds.length <= 8 && (
      <div className="flex flex-wrap gap-1 mt-2.5">
        {quickBuild.departmentIds.map(id => {
          const dept = deptLookup[id] || allDepartments.find(d => d.id === id);
          return dept ? (
            <Badge 
              key={id} 
              variant="secondary" 
              className="text-[9px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 px-1.5 py-0 h-5"
            >
              {dept.shortName || dept.label}
            </Badge>
          ) : null;
        })}
      </div>
    )}
  </CardContent>
</Card>
      {/* ───── SECTION 2: Generated Roles ───── */}
     <div className="space-y-3">
  {/* Header with summary stats */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Stethoscope className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          Roles Added
          {filledRolesCount > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
              {filledRolesCount} role{filledRolesCount > 1 ? 's' : ''} · {totalPositions} position{totalPositions > 1 ? 's' : ''}
            </span>
          )}
        </h3>
      </div>
      {/* Inline summary pills */}
      {filledRolesCount > 0 && (
        <div className="flex flex-wrap gap-1.5 ml-2">
          {(() => {
            const typeGroups: Record<string, number> = {};
            watchedRoles.forEach(r => {
              if (!r.roleCatalogId) return;
              const dept = deptLookup[r.departmentId || ""] || allDepartments.find(d => d.id === r.departmentId);
              const role = dept?.roles?.find((ro: any) => ro.id === r.roleCatalogId);
              const type = (role as any)?.type || "other";
              typeGroups[type] = (typeGroups[type] || 0) + (r.quantity || 1);
            });
            return Object.entries(typeGroups).map(([type, count]) => {
              const config = ROLE_TYPE_CONFIG[type] || ROLE_TYPE_CONFIG.other;
              return (
                <Badge 
                  key={type} 
                  variant="outline" 
                  className={cn(
                    "px-2 py-0 h-5 text-[10px] font-semibold border rounded-full",
                    config.color,
                    "dark:bg-transparent dark:border-indigo-800/50 dark:text-indigo-300"
                  )}
                >
                  {config.icon} {count}
                </Badge>
              );
            });
          })()}
        </div>
      )}
    </div>
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowClearConfirm(true)}
        className="rounded-lg border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm gap-1.5 h-8 text-xs hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300"
      >
        Clear all
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRole}
        className="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm gap-1.5 h-8 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
      >
        <Plus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        Add Role
      </Button>
    </div>

    <ConfirmDialog
      open={showClearConfirm}
      onOpenChange={setShowClearConfirm}
      onConfirm={handleClearAllConfirm}
      title="Clear all roles?"
      description="This will remove all roles you've added and reset to a single empty role. This action cannot be undone in this form."
      confirmText="Clear All"
      variant="destructive"
    />
  </div>

  {/* The Role Cards Grid */}
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
    <AnimatePresence mode="popLayout">
      {watchedRoles.map((role, index) => {
        const deptLabel = getDeptLabel(role.departmentId);
        const isFilled = !!role.roleCatalogId;
        const cardBgColor = CARD_BG_COLORS[index % CARD_BG_COLORS.length];

        // Local UI validation: require quantity > 0
        const qtyMissing = role.quantity == null || role.quantity <= 0;
        const displayError = !!(errors.rolesNeeded?.[index] || qtyMissing);

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, delay: index * 0.02 }}
            className="group relative"
          >
            <Card className={cn(
              "h-full border shadow-sm hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden",
              isFilled 
                ? `border-slate-200 dark:border-slate-800 ${cardBgColor} dark:bg-slate-900/70 hover:border-indigo-200 dark:hover:border-indigo-700` 
                : `border-dashed border-slate-300 dark:border-slate-700 ${cardBgColor} dark:bg-slate-900/50`,
              displayError && "border-red-300 dark:border-red-700 ring-1 ring-red-100 dark:ring-red-900/50"
            )}>
              {/* Top colored bar */}
              <div className={cn(
                "h-1 w-full",
                !isFilled ? "bg-slate-200 dark:bg-slate-700" :
                role.visaType === "permanent" ? "bg-emerald-400 dark:bg-emerald-600" : "bg-amber-400 dark:bg-amber-600"
              )} />

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeRole(index)}
                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/80 dark:bg-slate-900/80 text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all opacity-0 group-hover:opacity-100 z-10"
                title="Remove"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              
              <CardContent className="px-4 pb-5 pt-4 space-y-3 bg-transparent">
                {/* Number + Department + Role label (compact header) */}
                <div className="flex items-start gap-2 mb-2">
                  <span className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold flex-shrink-0 mt-0.5",
                    isFilled ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                  )}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {isFilled && deptLabel && (
                      <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold truncate tracking-wide uppercase w-full">{deptLabel}</p>
                    )}
                    {isFilled && role.designation && (
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-tight truncate w-full" title={role.designation}>
                        {role.designation}
                      </p>
                    )}
                  </div>
                </div>

                {/* Selectors */}
                <div className="space-y-3 min-w-0">
                  <DepartmentSelect
                    value={role.departmentId}
                    onValueChange={(value) => {
                      updateRole(index, "departmentId", value);
                      updateRole(index, "designation", "");
                      updateRole(index, "roleCatalogId", "");
                    }}
                    placeholder="Department"
                    includeRoles={true}
                    pageSize={DEPT_LIMIT}
                    className="h-9 text-[10px] shadow-sm w-full overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                  
                  <JobTitleSelect
                    value={role.designation}
                    onRoleChange={(r) => {
                      // ... (unchanged logic)
                    }}
                    placeholder="Job Title"
                    departmentId={role.departmentId}
                    disabled={!role.departmentId}
                    className={cn(
                      "h-9 text-[10px] shadow-sm w-full overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100",
                      errors.rolesNeeded?.[index]?.designation ? "border-red-500 dark:border-red-500" : ""
                    )}
                  />
                </div>

                {(errors.rolesNeeded?.[index] || qtyMissing) && (
                  <p className="text-[9px] text-red-500 dark:text-red-400 font-medium leading-tight">
                    {errors.rolesNeeded?.[index]
                      ? Object.values(errors.rolesNeeded[index] as any)
                          .map((err: any) => err.message)
                          .filter(Boolean)[0]
                      : "Quantity is required — enter number of positions"}
                  </p>
                )}

                {/* Bottom row: Quantity + Visa */}
                <div className="flex items-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex-1">
                    <Label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Qty</Label>
                    <Input
                      type="number"
                      value={role.quantity ?? ""}
                      onChange={(e) =>
                        updateRole(index, "quantity", e.target.value ? parseInt(e.target.value) : undefined)
                      }
                      min="1"
                      className="h-8 rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-center text-xs font-bold px-1 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex-[1.4]">
                    <Label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Type</Label>
                    <Select
                      value={role.visaType || "permanent"}
                      onValueChange={(v: any) => updateRole(index, "visaType", v)}
                    >
                      <SelectTrigger className="h-8 rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-[11px] text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                        <SelectItem value="permanent">Perm</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>

  {/* Error message */}
  {errors.rolesNeeded && !Array.isArray(errors.rolesNeeded) && (
    <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-center">
      <span className="text-sm font-medium text-red-600 dark:text-red-400">
        {errors.rolesNeeded.message}
      </span>
    </div>
  )}
</div>
    </div>
  );
};

export default RequirementCriteriaStep;
