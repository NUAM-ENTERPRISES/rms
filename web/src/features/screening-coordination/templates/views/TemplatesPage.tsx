import { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  X,
  BookOpen,
  FilterX,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

const ROLE_GROUP_COLORS = [
  {
    icon: "text-sky-700",
    iconBg: "bg-sky-100",
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  {
    icon: "text-teal-700",
    iconBg: "bg-teal-100",
    badge: "border-teal-200 bg-teal-50 text-teal-700",
    dot: "bg-teal-500",
    bar: "bg-teal-500",
  },
  {
    icon: "text-emerald-700",
    iconBg: "bg-emerald-100",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  {
    icon: "text-amber-700",
    iconBg: "bg-amber-100",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  {
    icon: "text-rose-700",
    iconBg: "bg-rose-100",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
  {
    icon: "text-cyan-700",
    iconBg: "bg-cyan-100",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700",
    dot: "bg-cyan-500",
    bar: "bg-cyan-500",
  },
] as const;

const ACTIVE_CARD_COLORS: ColorScheme[] = [
  {
    accent: "bg-sky-500",
    icon: "text-sky-700",
    iconBg: "bg-sky-100",
    border: "border-sky-100",
    questionBadge: "border-sky-200 bg-sky-50 text-sky-700",
    roleBadge: "border-teal-200 bg-teal-50 text-teal-700",
  },
  {
    accent: "bg-teal-500",
    icon: "text-teal-700",
    iconBg: "bg-teal-100",
    border: "border-teal-100",
    questionBadge: "border-teal-200 bg-teal-50 text-teal-700",
    roleBadge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    accent: "bg-emerald-500",
    icon: "text-emerald-700",
    iconBg: "bg-emerald-100",
    border: "border-emerald-100",
    questionBadge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    roleBadge: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    accent: "bg-amber-500",
    icon: "text-amber-700",
    iconBg: "bg-amber-100",
    border: "border-amber-100",
    questionBadge: "border-amber-200 bg-amber-50 text-amber-800",
    roleBadge: "border-orange-200 bg-orange-50 text-orange-700",
  },
  {
    accent: "bg-cyan-500",
    icon: "text-cyan-700",
    iconBg: "bg-cyan-100",
    border: "border-cyan-100",
    questionBadge: "border-cyan-200 bg-cyan-50 text-cyan-700",
    roleBadge: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    accent: "bg-rose-500",
    icon: "text-rose-700",
    iconBg: "bg-rose-100",
    border: "border-rose-100",
    questionBadge: "border-rose-200 bg-rose-50 text-rose-700",
    roleBadge: "border-pink-200 bg-pink-50 text-pink-700",
  },
];

const INACTIVE_CARD_COLOR: ColorScheme = {
  accent: "bg-muted-300",
  icon: "text-muted-foreground",
  iconBg: "bg-muted",
  border: "border-border",
  questionBadge: "border-border bg-muted/60 text-muted-foreground",
  roleBadge: "border-border bg-muted/60 text-muted-foreground",
};

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
    const params: {
      roleId?: string;
      roleDepartmentId?: string;
      isActive?: boolean;
    } = {};
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

  const templates = useMemo((): ScreeningTemplate[] => {
    const data = templatesData?.data as
      | ScreeningTemplate[]
      | { items?: ScreeningTemplate[] }
      | undefined;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [templatesData]);

  const filteredTemplates = useMemo((): ScreeningTemplate[] => {
    if (!filters.search) return templates;
    const searchLower = filters.search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.role?.name.toLowerCase().includes(searchLower) ||
        t.role?.label?.toLowerCase().includes(searchLower),
    );
  }, [templates, filters.search]);

  const templatesByRole = useMemo(() => {
    const grouped: Record<string, ScreeningTemplate[]> = {};
    filteredTemplates.forEach((template) => {
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
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
    return grouped;
  }, [filteredTemplates]);

  const hasActiveFilters =
    !!filters.search ||
    filters.roleId !== "all" ||
    filters.roleDepartmentId !== "all" ||
    filters.isActive !== "all";

  const activeCount = filteredTemplates.filter((t) => t.isActive).length;
  const roleGroupCount = Object.keys(templatesByRole).length;

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
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data &&
        typeof err.data.message === "string"
          ? err.data.message
          : "Failed to delete template";
      toast.error(message);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedTemplate(undefined);
  };

  const clearFilters = () => {
    setFilters({
      roleDepartmentId: "all",
      roleId: "all",
      isActive: "all",
      search: "",
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
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
    <div className="relative w-full space-y-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-48 overflow-hidden rounded-b-[2rem]"
      >
        <div className="absolute -left-16 top-0 h-40 w-40 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute left-1/3 top-6 h-36 w-52 rounded-full bg-sky-200/25 blur-3xl" />
        <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-emerald-200/25 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-card/90 shadow-sm backdrop-blur-sm">
        <div className="h-1 bg-teal-500" />
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-teal-50/80 via-sky-50/30 to-transparent"
        />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-600 shadow-lg shadow-teal-200/60 sm:h-16 sm:w-16">
              <FileText className="h-7 w-7 text-white sm:h-8 sm:w-8" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Screening Templates
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Build and manage interview templates by role
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <Badge
                  variant="outline"
                  className="border-teal-200 bg-teal-50 text-teal-700"
                >
                  {filteredTemplates.length} template
                  {filteredTemplates.length !== 1 ? "s" : ""}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-success-200 bg-success-50 text-success-700"
                >
                  {activeCount} active
                </Badge>
                {roleGroupCount > 0 && (
                  <Badge
                    variant="outline"
                    className="border-sky-200 bg-sky-50 text-sky-700"
                  >
                    {roleGroupCount} role group
                    {roleGroupCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {canWrite && (
            <Button
              type="button"
              onClick={handleCreate}
              className="h-11 shrink-0 gap-2 rounded-xl bg-teal-600 px-5 text-white hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New Template
            </Button>
          )}
        </div>
      </header>

      {/* Filters */}
      <Card className="overflow-hidden border-border bg-card/95 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="relative">
            <Search
              className={cn(
                "absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
                filters.search ? "text-teal-600" : "text-muted-foreground",
              )}
              aria-hidden
            />
            <Input
              placeholder="Search templates by name, description, or role..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="h-11 rounded-xl border-border bg-muted/30 pl-10 focus:bg-background"
              aria-label="Search templates"
            />
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Department
              </p>
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
                className="w-full"
                allowEmpty
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Role
              </p>
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
                className="w-full"
                allowEmpty
              />
            </div>

            <div className="w-full space-y-1.5 sm:w-44">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <Select
                value={filters.isActive}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, isActive: value }))
                }
              >
                <SelectTrigger
                  className="h-10 rounded-xl"
                  aria-label="Filter by status"
                >
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active Only</SelectItem>
                  <SelectItem value="false">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="h-10 gap-2 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <FilterX className="h-4 w-4" aria-hidden />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredTemplates.length === 0 ? (
        <Card className="overflow-hidden border-border bg-card shadow-sm">
          <div className="h-1 bg-teal-500" />
          <CardContent className="px-6 py-16">
            <div className="mx-auto max-w-md space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                <FileText className="h-8 w-8" aria-hidden />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">
                  No Templates Found
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Try adjusting your filters to find matches."
                    : "Get started by creating your first interview template."}
                </p>
              </div>
              {canWrite && !hasActiveFilters && (
                <Button
                  type="button"
                  onClick={handleCreate}
                  className="gap-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Create Template
                </Button>
              )}
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="gap-2 rounded-xl"
                >
                  <X className="h-4 w-4" aria-hidden />
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.keys(templatesByRole).map((roleName, roleIndex) => {
            const roleColor =
              ROLE_GROUP_COLORS[roleIndex % ROLE_GROUP_COLORS.length];
            const groupTemplates = templatesByRole[roleName];
            const groupActiveCount = groupTemplates.filter((t) => t.isActive)
              .length;
            const totalCount = groupTemplates.length;

            return (
              <Card
                key={roleName}
                className="overflow-hidden border-border bg-card/95 shadow-sm"
              >
                <div className={cn("h-1", roleColor.bar)} />
                <CardHeader className="border-b border-border px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          roleColor.iconBg,
                          roleColor.icon,
                        )}
                      >
                        <BookOpen className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <CardTitle className="text-lg font-semibold text-foreground">
                          {roleName}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          {totalCount} template{totalCount !== 1 ? "s" : ""} ·{" "}
                          {groupActiveCount} active
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        roleColor.badge,
                      )}
                    >
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", roleColor.dot)}
                      />
                      {groupActiveCount} active
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {groupTemplates.map((template, templateIndex) => {
                      const cardColor = template.isActive
                        ? ACTIVE_CARD_COLORS[
                            templateIndex % ACTIVE_CARD_COLORS.length
                          ]
                        : INACTIVE_CARD_COLOR;
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
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
