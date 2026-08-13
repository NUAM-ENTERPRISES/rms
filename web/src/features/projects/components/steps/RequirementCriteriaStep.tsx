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
import { Plus, Zap, ChevronDown, Building2, Briefcase, Stethoscope, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ProjectFormData } from "../../schemas/project-schemas";
import { JobTitleSelect, DepartmentSelect, ProfessionTypeSelect } from "@/components/molecules";
import { useGetRoleDepartmentsQuery } from "@/features/projects";
import { useGetProfessionTypesQuery } from "@/features/candidates/api";
import {
  useCreateRoleCatalogMutation,
  type CatalogProfessionType,
  type CatalogRoleDepartment,
} from "@/features/admin/api/catalogSettingsApi";
import {
  DepartmentFormDialog,
  labelToShortName,
  labelToSlug,
} from "@/features/admin/components/DepartmentFormDialog";
import { ProfessionTypeFormDialog } from "@/features/admin/components/ProfessionTypeFormDialog";
import { useCan } from "@/hooks/useCan";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  PROJECT_ROLE_VISA_TYPE,
  type ProjectRoleVisaType,
} from "../../constants/project-role-visa-types";
import { PROJECT_SECTOR } from "@/entities/project/constants";

interface RequirementCriteriaStepProps {
  control: Control<ProjectFormData>;
  watch: UseFormWatch<ProjectFormData>;
  setValue: UseFormSetValue<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
  initialDepartmentLabels?: Record<string, string>;
}

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
> = ({ control, watch, setValue, errors, initialDepartmentLabels }) => {
  const watchedRoles = watch("rolesNeeded");
  const projectSector = watch("sector");
  const professionSector =
    projectSector === PROJECT_SECTOR.HEALTHCARE
      ? ("HEALTHCARE" as const)
      : projectSector === PROJECT_SECTOR.NON_HEALTHCARE
        ? ("NON_HEALTH_CARE" as const)
        : undefined;
  const isNonHealthcare = projectSector === PROJECT_SECTOR.NON_HEALTHCARE;
  const canManageCatalog = useCan("manage:system_config");
  const [createRoleCatalog] = useCreateRoleCatalogMutation();

  /** Non-healthcare step 2: pick via departments or direct roles */
  type NonHealthPickMode = "department" | "role";
  const [nonHealthPickMode, setNonHealthPickMode] =
    React.useState<NonHealthPickMode>("role");

  // State for bulk addition tool
  const [quickBuild, setQuickBuild] = React.useState({
    professionTypeId: "",
    departmentIds: [] as string[],
    roleCatalogIds: [] as string[],
    visaType: PROJECT_ROLE_VISA_TYPE.DIRECT_VISA as ProjectRoleVisaType,
    quantity: 1,
  });

  const { data: professionTypesData } = useGetProfessionTypesQuery();
  const selectedProfession =
    professionTypesData?.professionTypes.find(
      (type) => type.id === quickBuild.professionTypeId,
    );
  const selectedProfessionLabel = selectedProfession?.label ?? "profession";

  // List state for pagination and search
  const [searchInput, setSearchInput] = React.useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [deptPage, setDeptPage] = React.useState(1);
  const [rolePage, setRolePage] = React.useState(1);
  const DEPT_LIMIT = 20;

  // Confirm dialog state for clearing all role cards
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [showAddDeptDialog, setShowAddDeptDialog] = React.useState(false);
  const [showAddProfessionDialog, setShowAddProfessionDialog] =
    React.useState(false);

  const handleClearAllConfirm = () => {
    // reset to single empty role (keeps same shape used elsewhere)
    setValue("rolesNeeded", [
      {
        departmentId: undefined,
        roleCatalogId: "",
        designation: "",
        quantity: 1,
        visaType: PROJECT_ROLE_VISA_TYPE.COMPANY_VISA,
        genderRequirement: "all",
        minAge: 18,
        maxAge: 35,
        backgroundCheckRequired: true,
        drugScreeningRequired: true,
        onCallRequired: false,
        relocationAssistance: false,
        requiredSkills: [],
        candidateStates: [],
        candidateReligions: [],
      },
    ]);

    toast.success("All role cards cleared");
    setShowClearConfirm(false);
  };

  // Reset page when search or profession type changes
  React.useEffect(() => {
    setDeptPage(1);
    setRolePage(1);
  }, [debouncedSearch, quickBuild.professionTypeId]);

  // Clear Quick Build staff/depts when project sector changes
  React.useEffect(() => {
    setQuickBuild((prev) => ({
      ...prev,
      professionTypeId: "",
      departmentIds: [],
      roleCatalogIds: [],
    }));
    setDeptPage(1);
    setRolePage(1);
    setNonHealthPickMode("role");
    setSearchInput("");
  }, [projectSector]);

  const pickMode: NonHealthPickMode = isNonHealthcare
    ? nonHealthPickMode
    : "department";

  // Fetch departments with roles for bulk addition (filtered by selected profession)
  const {
    data: deptData,
    isLoading: isLoadingDepts,
    isFetching: isFetchingDepts,
  } = useGetRoleDepartmentsQuery(
    {
      includeRoles: true,
      limit: DEPT_LIMIT,
      page: pickMode === "role" ? rolePage : deptPage,
      search: debouncedSearch,
      professionTypeId: quickBuild.professionTypeId,
    },
    { skip: !quickBuild.professionTypeId },
  );

  const allDepartments = deptData?.data?.departments || [];
  const deptPagination = deptData?.data?.pagination;
  const isLoadingRoles = isLoadingDepts;
  const isFetchingRoles = isFetchingDepts;
  const rolesPagination = deptPagination;

  // Cache department labels and roles to persist across pages during selection
  const [deptLookup, setDeptLookup] = React.useState<
    Record<string, { label: string; shortName?: string; roles: any[] }>
  >({});
  const [roleLookup, setRoleLookup] = React.useState<
    Record<
      string,
      {
        id: string;
        label: string;
        name?: string;
        departmentId?: string | null;
      }
    >
  >({});

  React.useEffect(() => {
    if (allDepartments.length > 0) {
      setDeptLookup((prev) => {
        const next = { ...prev };
        allDepartments.forEach((d) => {
          next[d.id] = {
            label: d.label,
            shortName: d.shortName,
            roles: d.roles || [],
          };
        });
        return next;
      });

      setRoleLookup((prev) => {
        const next = { ...prev };
        allDepartments.forEach((dept) => {
          for (const role of dept.roles || []) {
            if (
              role.professionTypeId &&
              role.professionTypeId !== quickBuild.professionTypeId &&
              role.professionType?.id !== quickBuild.professionTypeId
            ) {
              continue;
            }
            if (!role.id) continue;
            next[role.id] = {
              id: role.id,
              label: role.label || role.name || "Role",
              name: role.name,
              departmentId: dept.id,
            };
          }
        });
        return next;
      });
    }
  }, [allDepartments, quickBuild.professionTypeId]);

  const catalogRoles = React.useMemo(() => {
    const byId = new Map<
      string,
      {
        id: string;
        label: string;
        name?: string;
        departmentId?: string | null;
      }
    >();

    const sources = [
      ...Object.entries(roleLookup).map(([, role]) => role),
      ...allDepartments.flatMap((dept) =>
        (dept.roles || [])
          .filter(
            (role: any) =>
              !role.professionTypeId ||
              role.professionTypeId === quickBuild.professionTypeId ||
              role.professionType?.id === quickBuild.professionTypeId,
          )
          .map((role: any) => ({
            id: role.id as string,
            label: (role.label || role.name || "Role") as string,
            name: role.name as string | undefined,
            departmentId: dept.id as string,
          })),
      ),
    ];

    for (const role of sources) {
      if (!role.id || byId.has(role.id)) continue;
      byId.set(role.id, role);
    }

    return Array.from(byId.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [allDepartments, roleLookup, quickBuild.professionTypeId]);

  const handleDepartmentCreated = async (department: CatalogRoleDepartment) => {
    if (!quickBuild.professionTypeId) {
      toast.error("Select a staff type before adding a department");
      return;
    }

    const professionSlug =
      labelToSlug(selectedProfession?.name || selectedProfessionLabel) ||
      "role";
    const roleName = `${professionSlug}_${department.name}`.replace(
      /_+/g,
      "_",
    );

    try {
      const role = await createRoleCatalog({
        name: roleName,
        label: selectedProfessionLabel,
        shortName: selectedProfession
          ? labelToShortName(selectedProfessionLabel)
          : undefined,
        roleDepartmentId: department.id,
        professionTypeId: quickBuild.professionTypeId,
        isActive: true,
      }).unwrap();

      setDeptLookup((prev) => ({
        ...prev,
        [department.id]: {
          label: department.label,
          shortName: department.shortName ?? undefined,
          roles: [
            {
              id: role.id,
              name: role.name,
              label: role.label,
              shortName: role.shortName,
              professionTypeId: quickBuild.professionTypeId,
              professionType: {
                id: quickBuild.professionTypeId,
                name: selectedProfession?.name ?? "",
                label: selectedProfessionLabel,
              },
            },
          ],
        },
      }));
      setQuickBuild((p) => ({
        ...p,
        departmentIds: p.departmentIds.includes(department.id)
          ? p.departmentIds
          : [...p.departmentIds, department.id],
      }));
      setDeptPage(1);
      toast.success(
        `"${department.label}" linked to ${selectedProfessionLabel}`,
      );
    } catch (error) {
      const message =
        error &&
        typeof error === "object" &&
        "data" in error &&
        error.data &&
        typeof error.data === "object" &&
        "message" in error.data &&
        typeof error.data.message === "string"
          ? error.data.message
          : "Department created, but linking to staff type failed";
      toast.error(message);
    }
  };

  const handleProfessionTypeCreated = (profession: CatalogProfessionType) => {
    setQuickBuild((p) => ({
      ...p,
      professionTypeId: profession.id,
      departmentIds: [],
      roleCatalogIds: [],
    }));
    setDeptPage(1);
    setRolePage(1);
  };

  // Helper: find department label by id
  const getDeptLabel = (id?: string) => {
    if (!id) return "";
    return (
      deptLookup[id]?.label || 
      allDepartments.find(d => d.id === id)?.label || 
      initialDepartmentLabels?.[id] || 
      ""
    );
  };

  // Count of valid (filled) roles
  const filledRolesCount = watchedRoles.filter(r => r.roleCatalogId).length;
  const totalPositions = watchedRoles.reduce((sum, r) => sum + (r.quantity || 0), 0);

  // Toggle department selection for bulk add
  const toggleDepartment = (deptId: string) => {
    setQuickBuild((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter((id) => id !== deptId)
        : [...prev.departmentIds, deptId],
    }));
  };

  const toggleRoleCatalog = (roleId: string) => {
    setQuickBuild((prev) => ({
      ...prev,
      roleCatalogIds: prev.roleCatalogIds.includes(roleId)
        ? prev.roleCatalogIds.filter((id) => id !== roleId)
        : [...prev.roleCatalogIds, roleId],
    }));
  };

  const switchNonHealthPickMode = (mode: NonHealthPickMode) => {
    setNonHealthPickMode(mode);
    setSearchInput("");
    setDeptPage(1);
    setRolePage(1);
    setQuickBuild((prev) => ({
      ...prev,
      departmentIds: [],
      roleCatalogIds: [],
    }));
  };

  // Perform bulk addition
  const handleBulkAdd = () => {
    if (!quickBuild.professionTypeId) {
      toast.error("Please select a staff type");
      return;
    }

    const currentRoles =
      watchedRoles.length === 1 && !watchedRoles[0].roleCatalogId
        ? []
        : watchedRoles;

    const existingKeys = new Set(
      currentRoles
        .filter((r: any) => r.roleCatalogId)
        .map((r: any) => `${r.departmentId || ""}::${r.roleCatalogId}`),
    );

    const newRoles: any[] = [];
    let duplicatesSkipped = 0;

    const pushRoleCard = (opts: {
      departmentId?: string;
      roleCatalogId: string;
      designation: string;
    }) => {
      const key = `${opts.departmentId || ""}::${opts.roleCatalogId}`;
      if (existingKeys.has(key)) {
        duplicatesSkipped += 1;
        return;
      }
      existingKeys.add(key);
      newRoles.push({
        departmentId: opts.departmentId,
        roleCatalogId: opts.roleCatalogId,
        designation: opts.designation,
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
        minAge: 18,
        maxAge: 35,
        educationRequirementsList: [],
        priority: "medium",
      });
    };

    if (pickMode === "role") {
      if (quickBuild.roleCatalogIds.length === 0) {
        toast.error("Please select at least one role");
        return;
      }

      quickBuild.roleCatalogIds.forEach((roleId) => {
        const role =
          roleLookup[roleId] || catalogRoles.find((r) => r.id === roleId);
        if (!role) return;
        pushRoleCard({
          departmentId: role.departmentId || undefined,
          roleCatalogId: role.id,
          designation: role.label || role.name || "Role",
        });
      });
    } else {
      if (quickBuild.departmentIds.length === 0) {
        toast.error("Please select at least one department");
        return;
      }

      quickBuild.departmentIds.forEach((deptId) => {
        const dept =
          deptLookup[deptId] || allDepartments.find((d) => d.id === deptId);
        if (dept && dept.roles) {
          const matchingRole = dept.roles.find(
            (r: any) => r.professionType?.id === quickBuild.professionTypeId,
          );

          if (matchingRole) {
            pushRoleCard({
              departmentId: deptId,
              roleCatalogId: matchingRole.id,
              designation: matchingRole.label || matchingRole.name,
            });
          }
        }
      });
    }

    if (newRoles.length > 0) {
      setValue("rolesNeeded", [...currentRoles, ...newRoles]);

      const addedMsg = `${newRoles.length} role${newRoles.length > 1 ? "s" : ""} added successfully!`;
      if (duplicatesSkipped > 0) {
        toast.success(
          `${addedMsg} ${duplicatesSkipped} duplicate${duplicatesSkipped > 1 ? "s" : ""} skipped.`,
        );
      } else {
        toast.success(addedMsg);
      }

      setQuickBuild((prev) => ({
        ...prev,
        departmentIds: [],
        roleCatalogIds: [],
      }));
    } else if (duplicatesSkipped > 0) {
      toast.error(
        pickMode === "role"
          ? `All selected roles are already added — ${duplicatesSkipped} duplicate${duplicatesSkipped > 1 ? "s" : ""} skipped.`
          : `All selected departments already have this role — ${duplicatesSkipped} duplicate${duplicatesSkipped > 1 ? "s" : ""} skipped.`,
      );
    } else {
      toast.error(
        pickMode === "role"
          ? "No roles could be added from your selection"
          : `No ${selectedProfessionLabel} found in selected departments`,
      );
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
        visaType: PROJECT_ROLE_VISA_TYPE.COMPANY_VISA,
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
        minSalaryRange: undefined,
        maxSalaryRange: undefined,
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
        minAge: 18,
        maxAge: 35,
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
        visaType: PROJECT_ROLE_VISA_TYPE.COMPANY_VISA,
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
      <Card className="relative border-0 shadow-md bg-gradient-to-r from-indigo-50 via-card to-purple-50/50 overflow-hidden">
        <CardHeader className="pb-1 pt-4 px-5 relative">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-100 border border-indigo-200">
              <Zap className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Quick Add — Build Multiple Roles at Once
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0">
                {isNonHealthcare
                  ? "Pick staff type → choose by department or role → generate"
                  : "3 steps: pick staff type → select departments → generate"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative px-5 pb-4 pt-3">
          <div className="flex flex-wrap items-end gap-4">

            {/* Step 1: Staff type */}
            <div className="space-y-1.5 min-w-[160px] flex-1">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">1</span>
                  <Label className="text-xs font-semibold text-muted-foreground">Staff type</Label>
                </div>
                {canManageCatalog && professionSector ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddProfessionDialog(true)}
                    className="h-6 px-2 text-[10px] gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  >
                    <Plus className="h-3 w-3" />
                    Add profession
                  </Button>
                ) : null}
              </div>
              <ProfessionTypeSelect
                value={quickBuild.professionTypeId}
                onValueChange={(v) =>
                  setQuickBuild((p) => ({
                    ...p,
                    professionTypeId: v,
                    departmentIds: [],
                    roleCatalogIds: [],
                  }))
                }
                label=""
                description=""
                placeholder={
                  professionSector
                    ? "Select staff type"
                    : "Set project sector first"
                }
                className="space-y-0"
                triggerClassName="h-9 rounded-lg shadow-sm text-xs"
                sector={professionSector}
                disabled={!professionSector}
                onAddRole={
                  canManageCatalog && professionSector
                    ? () => setShowAddProfessionDialog(true)
                    : undefined
                }
                addRoleLabel="Add profession"
              />
            </div>

            {/* Step 2: Departments / Roles */}
            <div className="space-y-1.5 min-w-[220px] flex-[2]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">2</span>
                  <Label className="text-xs font-semibold text-muted-foreground">
                    {isNonHealthcare ? "Roles" : "Departments"}
                  </Label>
                </div>
                {isNonHealthcare ? (
                  <div
                    className="inline-flex rounded-full bg-muted p-0.5"
                    role="tablist"
                    aria-label="Pick roles by department or by role"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={pickMode === "department"}
                      onClick={() => switchNonHealthPickMode("department")}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all",
                        pickMode === "department"
                          ? "bg-card text-indigo-600 shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      By department
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={pickMode === "role"}
                      onClick={() => switchNonHealthPickMode("role")}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all",
                        pickMode === "role"
                          ? "bg-card text-indigo-600 shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      By role
                    </button>
                  </div>
                ) : null}
              </div>

              {pickMode === "role" ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!quickBuild.professionTypeId}
                      className="w-full h-9 justify-between bg-card border-border rounded-lg hover:bg-muted shadow-sm text-xs disabled:opacity-60"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Briefcase className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        {!quickBuild.professionTypeId
                          ? "Select staff type first"
                          : quickBuild.roleCatalogIds.length === 0
                            ? "Click to pick roles..."
                            : `${quickBuild.roleCatalogIds.length} role${quickBuild.roleCatalogIds.length === 1 ? "" : "s"} selected`}
                      </span>
                      <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 rounded-xl border-border shadow-2xl" align="start">
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Choose Roles</span>
                        <span className="text-[10px] text-slate-400">
                          {quickBuild.roleCatalogIds.length} selected
                        </span>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Search roles..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          className="pl-8 h-8 text-[11px] rounded-lg border-border focus:ring-indigo-500"
                        />
                        {isFetchingRoles && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-1 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                        {catalogRoles.length === 0 && !isLoadingRoles ? (
                          <div className="py-8 text-center">
                            <p className="text-xs text-slate-400">
                              No roles found for this staff type
                            </p>
                          </div>
                        ) : (
                          catalogRoles.map((role) => {
                            const isAlreadyAdded = watchedRoles.some(
                              (r) => r.roleCatalogId === role.id,
                            );
                            const isSelected =
                              quickBuild.roleCatalogIds.includes(role.id) ||
                              isAlreadyAdded;
                            return (
                              <div
                                key={role.id}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all cursor-pointer border",
                                  isSelected
                                    ? "bg-indigo-50 border-indigo-200"
                                    : "border-transparent hover:bg-muted",
                                )}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!isAlreadyAdded) {
                                    toggleRoleCatalog(role.id);
                                  } else {
                                    toast.info(
                                      `${role.label || role.name} is already added`,
                                    );
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  className={cn(
                                    "border-border h-3.5 w-3.5",
                                    isAlreadyAdded
                                      ? "data-[state=checked]:bg-slate-400 data-[state=checked]:border-slate-400"
                                      : "data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600",
                                  )}
                                />
                                <span
                                  className={cn(
                                    "text-[11px] font-medium leading-none truncate",
                                    isSelected
                                      ? isAlreadyAdded
                                        ? "text-muted-foreground italic"
                                        : "text-indigo-700"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {role.label || role.name}
                                  {isAlreadyAdded && " (Added)"}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {rolesPagination && rolesPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t mt-2">
                          <span className="text-[10px] text-slate-400">
                            Page {rolePage} of {rolesPagination.totalPages}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={rolePage <= 1}
                              onClick={() => setRolePage((p) => p - 1)}
                              className="h-7 w-7 p-0 rounded-md"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={rolePage >= rolesPagination.totalPages}
                              onClick={() => setRolePage((p) => p + 1)}
                              className="h-7 w-7 p-0 rounded-md"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!quickBuild.professionTypeId}
                      className="w-full h-9 justify-between bg-card border-border rounded-lg hover:bg-muted shadow-sm text-xs disabled:opacity-60"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        {!quickBuild.professionTypeId
                          ? "Select staff type first"
                          : quickBuild.departmentIds.length === 0
                            ? "Click to pick..."
                            : `${quickBuild.departmentIds.length} selected`}
                      </span>
                      <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 rounded-xl border-border shadow-2xl" align="start">
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Choose Departments</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">
                            {quickBuild.departmentIds.length} selected
                          </span>
                          {canManageCatalog && quickBuild.professionTypeId ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAddDeptDialog(true)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-6 px-2 gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Add
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const allCurrentIds = allDepartments.map((d) => d.id);
                              const isAllCurrentSelected = allCurrentIds.every((id) =>
                                quickBuild.departmentIds.includes(id),
                              );

                              setQuickBuild((p) => ({
                                ...p,
                                departmentIds: isAllCurrentSelected
                                  ? p.departmentIds.filter((id) => !allCurrentIds.includes(id))
                                  : [...new Set([...p.departmentIds, ...allCurrentIds])],
                              }));
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-6 px-2"
                          >
                            {allDepartments.length > 0 &&
                            allDepartments.every((d) =>
                              quickBuild.departmentIds.includes(d.id),
                            )
                              ? "Deselect Page"
                              : "Select Page"}
                          </Button>
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Search departments..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          className="pl-8 h-8 text-[11px] rounded-lg border-border focus:ring-indigo-500"
                        />
                        {isFetchingDepts && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                        {allDepartments.length === 0 && !isLoadingDepts ? (
                          <div className="col-span-2 py-8 text-center space-y-3">
                            <p className="text-xs text-slate-400">
                              No departments found for this staff type
                            </p>
                            {canManageCatalog ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!quickBuild.professionTypeId}
                                onClick={() => setShowAddDeptDialog(true)}
                                className="h-7 text-[11px] gap-1.5 rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                              >
                                <Plus className="h-3 w-3" />
                                Add department
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          allDepartments.map((dept) => {
                            const matchingRoleForType = dept.roles?.find(
                              (ro: any) =>
                                ro.professionType?.id === quickBuild.professionTypeId,
                            );
                            const isAlreadyAdded = watchedRoles.some(
                              (r) =>
                                r.departmentId === dept.id &&
                                r.roleCatalogId === matchingRoleForType?.id,
                            );
                            const isSelected =
                              quickBuild.departmentIds.includes(dept.id) || isAlreadyAdded;

                            return (
                              <div
                                key={dept.id}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all cursor-pointer border",
                                  isSelected
                                    ? "bg-indigo-50 border-indigo-200"
                                    : "border-transparent hover:bg-muted",
                                )}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  if (!isAlreadyAdded) {
                                    toggleDepartment(dept.id);
                                  } else {
                                    toast.info(
                                      `${getDeptLabel(dept.id)} already has this ${selectedProfessionLabel} role`,
                                    );
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  className={cn(
                                    "border-border h-3.5 w-3.5",
                                    isAlreadyAdded
                                      ? "data-[state=checked]:bg-slate-400 data-[state=checked]:border-slate-400"
                                      : "data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600",
                                  )}
                                />
                                <span
                                  className={cn(
                                    "text-[11px] font-medium leading-none truncate",
                                    isSelected
                                      ? isAlreadyAdded
                                        ? "text-muted-foreground italic"
                                        : "text-indigo-700"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {dept.label}
                                  {isAlreadyAdded && " (Added)"}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {deptPagination && deptPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t mt-2">
                          <span className="text-[10px] text-slate-400">
                            Page {deptPage} of {deptPagination.totalPages}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deptPage <= 1}
                              onClick={() => setDeptPage((p) => p - 1)}
                              className="h-7 w-7 p-0 rounded-md"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deptPage >= deptPagination.totalPages}
                              onClick={() => setDeptPage((p) => p + 1)}
                              className="h-7 w-7 p-0 rounded-md"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <DepartmentFormDialog
                open={showAddDeptDialog}
                onOpenChange={setShowAddDeptDialog}
                editing={null}
                onSuccess={(department) => {
                  void handleDepartmentCreated(department);
                }}
              />

              <ProfessionTypeFormDialog
                open={showAddProfessionDialog}
                onOpenChange={setShowAddProfessionDialog}
                editing={null}
                defaultSector={professionSector}
                onSuccess={handleProfessionTypeCreated}
              />
            </div>

            {/* Step 3: Visa Type */}
            <div className="space-y-1.5 min-w-[120px] flex-1">
              <div className="flex items-center gap-1.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">3</span>
                <Label className="text-xs font-semibold text-muted-foreground">Visa Type</Label>
              </div>
              <Select 
                value={quickBuild.visaType} 
                onValueChange={(v: any) => setQuickBuild(p => ({...p, visaType: v}))}
              >
                <SelectTrigger className="bg-card border-border h-9 rounded-lg shadow-sm text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value={PROJECT_ROLE_VISA_TYPE.DIRECT_VISA}>Direct Visa</SelectItem>
                  <SelectItem value={PROJECT_ROLE_VISA_TYPE.COMPANY_VISA}>Company Visa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Step 4: Quantity */}
            <div className="space-y-1.5 w-[80px]">
              <div className="flex items-center gap-1.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">4</span>
                <Label className="text-xs font-semibold text-muted-foreground">Qty</Label>
              </div>
              <Input
                type="number"
                min="1"
                value={quickBuild.quantity}
                onChange={(e) => setQuickBuild(p => ({...p, quantity: parseInt(e.target.value) || 1}))}
                className="bg-card border-border h-9 rounded-lg shadow-sm text-xs text-center font-bold"
              />
            </div>

            {/* Generate Button */}
            <Button
              type="button"
              onClick={handleBulkAdd}
              disabled={
                (pickMode === "department" ? isLoadingDepts : isLoadingRoles) ||
                !quickBuild.professionTypeId ||
                (pickMode === "role"
                  ? quickBuild.roleCatalogIds.length === 0
                  : quickBuild.departmentIds.length === 0)
              }
              className={cn(
                "h-9 px-5 rounded-lg text-white text-xs font-bold shadow-md transition-all gap-1.5",
                quickBuild.professionTypeId &&
                  (pickMode === "role"
                    ? quickBuild.roleCatalogIds.length > 0
                    : quickBuild.departmentIds.length > 0)
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 active:scale-[0.97]"
                  : "bg-slate-300 cursor-not-allowed"
              )}
            >
              {(pickMode === "department" ? isLoadingDepts : isLoadingRoles) ? (
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {!quickBuild.professionTypeId
                ? "Select Staff Type"
                : pickMode === "role"
                  ? quickBuild.roleCatalogIds.length > 0
                    ? `Generate ${quickBuild.roleCatalogIds.length}`
                    : "Select Roles"
                  : quickBuild.departmentIds.length > 0
                    ? `Generate ${quickBuild.departmentIds.length}`
                    : "Select Depts"}
            </Button>
          </div>

          {/* Selected preview chips */}
          {pickMode === "role" &&
          quickBuild.roleCatalogIds.length > 0 &&
          quickBuild.roleCatalogIds.length <= 8 ? (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {quickBuild.roleCatalogIds.map((id) => {
                const role =
                  roleLookup[id] || catalogRoles.find((r) => r.id === id);
                return role ? (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0 h-5"
                  >
                    {role.label || role.name}
                  </Badge>
                ) : null;
              })}
            </div>
          ) : null}
          {pickMode === "department" &&
          quickBuild.departmentIds.length > 0 &&
          quickBuild.departmentIds.length <= 8 ? (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {quickBuild.departmentIds.map((id) => {
                const dept =
                  deptLookup[id] || allDepartments.find((d) => d.id === id);
                return dept ? (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0 h-5"
                  >
                    {dept.shortName || dept.label}
                  </Badge>
                ) : null;
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ───── SECTION 2: Generated Roles ───── */}
      <div className="space-y-3">
        {/* Header with summary stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Stethoscope className="h-4 w-4 text-indigo-500" />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Roles Added
                {filledRolesCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {filledRolesCount} role{filledRolesCount > 1 ? 's' : ''} · {totalPositions} position{totalPositions > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
            </div>
            {/* Inline summary pills */}
            {filledRolesCount > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-2">
                {(() => {
                  const typeGroups: Record<
                    string,
                    { label: string; count: number }
                  > = {};
                  watchedRoles.forEach((r) => {
                    if (!r.roleCatalogId) return;
                    const dept =
                      deptLookup[r.departmentId || ""] ||
                      allDepartments.find((d) => d.id === r.departmentId);
                    const role = dept?.roles?.find(
                      (ro: any) => ro.id === r.roleCatalogId,
                    );
                    const professionType = (role as any)?.professionType;
                    const typeId = professionType?.id || "unknown";
                    const label = professionType?.label || "Unknown";
                    if (!typeGroups[typeId]) {
                      typeGroups[typeId] = { label, count: 0 };
                    }
                    typeGroups[typeId].count += r.quantity || 1;
                  });
                  return Object.entries(typeGroups).map(
                    ([typeId, { label, count }]) => (
                      <Badge
                        key={typeId}
                        variant="outline"
                        className="px-2 py-0 h-5 text-[10px] font-semibold border rounded-full text-muted-foreground bg-muted/50 border-border"
                      >
                        {label} · {count}
                      </Badge>
                    ),
                  );
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
              className="rounded-lg border-red-200 bg-card text-red-600 shadow-sm gap-1.5 h-8 text-xs"
            >
              Clear all
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRole}
              className="rounded-lg border-border bg-card shadow-sm gap-1.5 h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 text-indigo-600" />
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
                    isFilled ? `border-border ${cardBgColor} hover:border-indigo-200` : `border-dashed border-border ${cardBgColor}`,
                    displayError && "border-red-300 ring-1 ring-red-100"
                  )}>
                    {/* Top colored bar */}
                    <div className={cn(
                      "h-1 w-full",
                      !isFilled ? "bg-muted" :
                      role.visaType === PROJECT_ROLE_VISA_TYPE.DIRECT_VISA ? "bg-emerald-400" : "bg-amber-400"
                    )} />

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeRole(index)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-card/80 text-slate-400 hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-200 transition-all opacity-0 group-hover:opacity-100 z-10"
                      title="Remove"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    
                    <CardContent className="px-4 pb-5 pt-4 space-y-3">
                      {/* Number + Department + Role label (compact header) */}
                      <div className="flex items-start gap-2 mb-2">
                        <span className={cn(
                          "inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold flex-shrink-0 mt-0.5",
                          isFilled ? "bg-indigo-100 text-indigo-600" : "bg-muted text-slate-400"
                        )}>
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          {isFilled && deptLabel && (
                            <p className="text-[10px] text-indigo-500 font-bold truncate tracking-wide uppercase w-full">{deptLabel}</p>
                          )}
                          {isFilled && role.designation && (
                            <p className="text-[13px] font-bold text-foreground leading-tight truncate w-full" title={role.designation}>
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
                          className="h-9 text-[10px] shadow-sm w-full overflow-hidden"
                        />
                        
                        <JobTitleSelect
                          value={role.designation}
                          onRoleChange={(r) => {
                            // Clear selection
                            if (!r) {
                              updateRole(index, "roleCatalogId", "");
                              updateRole(index, "designation", "");
                              return;
                            }

                            const deptId = role.departmentId;

                            // If same department + roleCatalog already exists elsewhere, merge quantities instead of creating duplicate
                            if (deptId) {
                              const duplicateIndex = watchedRoles.findIndex((rr: any, i: number) => i !== index && rr.roleCatalogId === r.id && rr.departmentId === deptId);
                              if (duplicateIndex !== -1) {
                                const qtyToAdd = (role.quantity && Number(role.quantity)) ? Number(role.quantity) : 1;
                                const existingQty = (watchedRoles[duplicateIndex].quantity && Number(watchedRoles[duplicateIndex].quantity)) ? Number(watchedRoles[duplicateIndex].quantity) : 0;

                                // increment existing role's quantity
                                updateRole(duplicateIndex, "quantity", existingQty + qtyToAdd);

                                // remove the now-duplicate card
                                removeRole(index);

                                toast.success("Duplicate role merged — quantity updated");
                                return;
                              }
                            }

                            // No duplicate — apply selection to this card
                            updateRole(index, "roleCatalogId", r.id);
                            updateRole(index, "designation", r.label);
                          }}
                          placeholder="Job Title"
                          departmentId={role.departmentId}
                          disabled={!role.departmentId}
                          className={cn(
                            "h-9 text-[10px] shadow-sm w-full overflow-hidden",
                            errors.rolesNeeded?.[index]?.designation ? "border-red-500" : ""
                          )}
                        />
                      </div>

                      {(errors.rolesNeeded?.[index] || qtyMissing) && (
                        <p className="text-[9px] text-red-500 font-medium leading-tight">
                          {errors.rolesNeeded?.[index]
                            ? Object.values(errors.rolesNeeded[index] as any)
                                .map((err: any) => err.message)
                                .filter(Boolean)[0]
                            : "Quantity is required — enter number of positions"}
                        </p>
                      )}

                      {/* Bottom row: Quantity + Visa */}
                      <div className="flex items-end gap-2 pt-3 border-t border-border">
                        <div className="flex-1">
                          <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Qty</Label>
                          <Input
                            type="number"
                            value={role.quantity ?? ""}
                            onChange={(e) =>
                              updateRole(index, "quantity", e.target.value ? parseInt(e.target.value) : undefined)
                            }
                            min="1"
                            className="h-8 rounded-md border-border text-center text-xs font-bold px-1 focus:ring-1 focus:ring-indigo-200"
                          />
                        </div>
                        <div className="flex-[1.4]">
                          <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Visa</Label>
                          <Select
                            value={role.visaType || PROJECT_ROLE_VISA_TYPE.DIRECT_VISA}
                            onValueChange={(v: any) => updateRole(index, "visaType", v)}
                          >
                            <SelectTrigger className="h-8 rounded-md border-border text-[11px] focus:ring-1 focus:ring-indigo-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                              <SelectItem value={PROJECT_ROLE_VISA_TYPE.DIRECT_VISA}>Direct</SelectItem>
                              <SelectItem value={PROJECT_ROLE_VISA_TYPE.COMPANY_VISA}>Company</SelectItem>
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
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <span className="text-sm font-medium text-red-600">
              {errors.rolesNeeded.message}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequirementCriteriaStep;
