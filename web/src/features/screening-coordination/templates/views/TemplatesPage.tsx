import { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  X,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useGetTemplatesQuery,
  useDeleteTemplateMutation,
} from "../data";
import { useCan } from "@/hooks/useCan";
import { TemplateCard, type ColorScheme } from "../components/TemplateCard";
import { TemplateFormDialog } from "../components/TemplateFormDialog";
import { ScreeningTemplate } from "../../types";
import { DepartmentSelect } from "@/components/molecules/DepartmentSelect";
import { JobTitleSelect } from "@/components/molecules/JobTitleSelect";

export default function TemplatesPage() {
  const canWrite = useCan("write:interview_templates");
  const canDelete = useCan("manage:interview_templates");

  const [filters, setFilters] = useState({
    roleDepartmentId: "all",
    roleId: "all",
    isActive: "all",
    search: "",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    ScreeningTemplate | undefined
  >();

  const queryParams = useMemo(() => {
    const params: any = {};
    if (filters.roleId && filters.roleId !== "all") {
      params.roleId = filters.roleId;
    } else if (filters.roleDepartmentId && filters.roleDepartmentId !== "all") {
      params.roleDepartmentId = filters.roleDepartmentId;
    }
    if (filters.isActive && filters.isActive !== "all") {
      params.isActive = filters.isActive === "true";
    }
    return params;
  }, [filters]);

  const {
    data: templatesData,
    isLoading,
    error,
  } = useGetTemplatesQuery(queryParams);
  const [deleteTemplate] = useDeleteTemplateMutation();

  const templates = useMemo(() => {
    const data: any = templatesData?.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [templatesData]);

  // Filter templates by search
  const filteredTemplates = useMemo((): ScreeningTemplate[] => {
    if (!filters.search) return templates;
    const searchLower = filters.search.toLowerCase();
    return templates.filter(
      (t: ScreeningTemplate) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.role?.name.toLowerCase().includes(searchLower) ||
        t.role?.label?.toLowerCase().includes(searchLower)
    );
  }, [templates, filters.search]);

  // Group templates by role
  const templatesByRole = useMemo(() => {
    const grouped: Record<string, ScreeningTemplate[]> = {};
    filteredTemplates.forEach((template: ScreeningTemplate) => {
      // Use label or shortName, fallback to name or "Generic Template"
      const roleDisplayName =
        template.role?.label ||
        template.role?.shortName ||
        template.role?.name ||
        "Generic Template";

      if (!grouped[roleDisplayName]) {
        grouped[roleDisplayName] = [];
      }
      grouped[roleDisplayName].push(template);
    });
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(
        (a: ScreeningTemplate, b: ScreeningTemplate) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    return grouped;
  }, [filteredTemplates]);

  // Get color scheme for role group (varied colors)
  const getRoleGroupColor = (index: number) => {
    const colors = [
      {
        accent: "from-violet-500 to-purple-600",
        icon: "text-violet-600 dark:text-violet-400",
        iconBg: "bg-gradient-to-br from-violet-500/15 to-purple-600/15",
        iconBorder: "border-violet-500/30",
        badge:
          "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950 dark:text-primary dark:border-violet-800",
        dot: "bg-violet-500",
      },
      {
        accent: "from-blue-500 to-cyan-600",
        icon: "text-blue-600 dark:text-blue-400",
        iconBg: "bg-gradient-to-br from-blue-500/15 to-cyan-600/15",
        iconBorder: "border-blue-500/30",
        badge:
          "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
        dot: "bg-blue-500",
      },
      {
        accent: "from-emerald-500 to-teal-600",
        icon: "text-emerald-600 dark:text-emerald-400",
        iconBg: "bg-gradient-to-br from-emerald-500/15 to-teal-600/15",
        iconBorder: "border-emerald-500/30",
        badge:
          "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
        dot: "bg-emerald-500",
      },
      {
        accent: "from-amber-500 to-orange-600",
        icon: "text-amber-600 dark:text-amber-400",
        iconBg: "bg-gradient-to-br from-amber-500/15 to-orange-600/15",
        iconBorder: "border-amber-500/30",
        badge:
          "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
        dot: "bg-amber-500",
      },
      {
        accent: "from-rose-500 to-pink-600",
        icon: "text-rose-600 dark:text-rose-400",
        iconBg: "bg-gradient-to-br from-rose-500/15 to-pink-600/15",
        iconBorder: "border-rose-500/30",
        badge:
          "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
        dot: "bg-rose-500",
      },
      {
        accent: "from-indigo-500 to-blue-600",
        icon: "text-indigo-600 dark:text-indigo-400",
        iconBg: "bg-gradient-to-br from-indigo-500/15 to-blue-600/15",
        iconBorder: "border-indigo-500/30",
        badge:
          "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800",
        dot: "bg-indigo-500",
      },
    ];
    return colors[index % colors.length];
  };

  // Modern color scheme for template cards - soft, sophisticated palette
  const getTemplateCardColor = (
    templateIndex: number,
    isActive: boolean
  ): ColorScheme => {
    // Active templates - modern, soft color palette
    const activeColors = [
      {
        accent: "from-blue-400 via-indigo-500 to-purple-500",
        icon: "text-blue-600 dark:text-blue-400",
        iconBg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-900",
        questionBadge:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
        roleBadge:
          "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
      },
      {
        accent: "from-emerald-400 via-teal-500 to-cyan-500",
        icon: "text-emerald-600 dark:text-emerald-400",
        iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
        border: "border-emerald-200 dark:border-emerald-900",
        questionBadge:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
        roleBadge:
          "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
      },
      {
        accent: "from-rose-400 via-pink-500 to-fuchsia-500",
        icon: "text-rose-600 dark:text-rose-400",
        iconBg: "bg-rose-50 dark:bg-rose-950/30",
        border: "border-rose-200 dark:border-rose-900",
        questionBadge:
          "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
        roleBadge:
          "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800",
      },
      {
        accent: "from-amber-400 via-orange-500 to-red-500",
        icon: "text-amber-600 dark:text-amber-400",
        iconBg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200 dark:border-amber-900",
        questionBadge:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
        roleBadge:
          "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
      },
      {
        accent: "from-violet-400 via-purple-500 to-indigo-500",
        icon: "text-violet-600 dark:text-violet-400",
        iconBg: "bg-violet-50 dark:bg-violet-950/30",
        border: "border-violet-200 dark:border-violet-900",
        questionBadge:
          "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-primary dark:border-violet-800",
        roleBadge:
          "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
      },
      {
        accent: "from-sky-400 via-cyan-500 to-blue-500",
        icon: "text-sky-600 dark:text-sky-400",
        iconBg: "bg-sky-50 dark:bg-sky-950/30",
        border: "border-sky-200 dark:border-sky-900",
        questionBadge:
          "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
        roleBadge:
          "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800",
      },
    ];
    // Inactive templates - muted, subtle
    const inactiveColors = {
      accent: "from-slate-200 to-slate-300",
      icon: "text-slate-400 dark:text-muted-foreground",
      iconBg: "bg-muted dark:bg-slate-900/50",
      border: "border-border dark:border-slate-800",
      questionBadge:
        "bg-muted text-muted-foreground border-border dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
      roleBadge:
        "bg-muted text-muted-foreground border-border dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
    };
    return isActive
      ? activeColors[templateIndex % activeColors.length]
      : inactiveColors;
  };

  const handleCreate = () => {
    setSelectedTemplate(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (template: ScreeningTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteTemplate(id).unwrap();
      toast.success("Template deleted successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete template");
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedTemplate(undefined);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load templates. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Toolbar */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          <div className="group relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-blue-600" />
            <Input
              placeholder="Search templates by name, description, or role..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="h-11 rounded-xl border-border bg-muted/30 pl-10 focus:bg-card"
              aria-label="Search templates"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(filters.search ||
              filters.roleId !== "all" ||
              filters.roleDepartmentId !== "all" ||
              filters.isActive !== "all") && (
              <Button
                variant="ghost"
                onClick={() =>
                  setFilters({
                    roleDepartmentId: "all",
                    roleId: "all",
                    isActive: "all",
                    search: "",
                  })
                }
                className="h-11 gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
            {canWrite && (
              <Button
                onClick={handleCreate}
                className="h-11 gap-2 rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Department
            </span>
            <DepartmentSelect
              value={
                filters.roleDepartmentId === "all"
                  ? ""
                  : filters.roleDepartmentId
              }
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  roleDepartmentId: value || "all",
                  roleId: "all",
                }))
              }
              className="min-w-[180px]"
              allowEmpty
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Role
            </span>
            <JobTitleSelect
              departmentId={
                filters.roleDepartmentId === "all"
                  ? undefined
                  : filters.roleDepartmentId
              }
              value={filters.roleId === "all" ? "" : filters.roleId}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, roleId: value || "all" }))
              }
              className="min-w-[180px]"
              allowEmpty
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Status
            </span>
            <Select
              value={filters.isActive}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, isActive: value }))
              }
            >
              <SelectTrigger className="h-10 min-w-[140px] rounded-xl border-border bg-muted/30 text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border bg-card">
                <SelectItem value="all" className="rounded-lg">
                  All Status
                </SelectItem>
                <SelectItem value="true" className="rounded-lg">
                  Active Only
                </SelectItem>
                <SelectItem value="false" className="rounded-lg">
                  Inactive Only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredTemplates.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-foreground">No templates found</p>
            <p className="max-w-xs text-center text-sm">
              {filters.search ||
              filters.roleId !== "all" ||
              filters.roleDepartmentId !== "all" ||
              filters.isActive !== "all"
                ? "Try adjusting your filters to find matches."
                : "Get started by creating your first interview template."}
            </p>
            {canWrite &&
              !filters.search &&
              filters.roleId === "all" &&
              filters.roleDepartmentId === "all" &&
              filters.isActive === "all" && (
                <Button
                  onClick={handleCreate}
                  className="mt-1 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(templatesByRole).map(
            (roleName: string, roleIndex: number) => {
              const roleColor = getRoleGroupColor(roleIndex);
              const activeCount = templatesByRole[roleName].filter(
                (t: ScreeningTemplate) => t.isActive,
              ).length;
              const totalCount = templatesByRole[roleName].length;

              return (
                <div
                  key={roleName}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                          <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-foreground">
                            {roleName}
                          </h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {totalCount} template
                            {totalCount !== 1 ? "s" : ""} · {activeCount} active
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`flex h-6 items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium ${roleColor.badge}`}
                      >
                        <div
                          className={`h-2 w-2 rounded-full ${roleColor.dot}`}
                        />
                        {activeCount} active
                      </Badge>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {templatesByRole[roleName].map(
                        (
                          template: ScreeningTemplate,
                          templateIndex: number,
                        ) => {
                          const cardColor = getTemplateCardColor(
                            templateIndex,
                            template.isActive,
                          );
                          return (
                            <TemplateCard
                              key={template.id}
                              template={template}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              canEdit={canWrite}
                              canDelete={canDelete}
                              colorScheme={cardColor}
                            />
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}

      <TemplateFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        template={selectedTemplate}
      />
    </div>
  );
}
