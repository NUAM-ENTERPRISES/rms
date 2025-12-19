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
  useGetRoleCatalogQuery,
} from "../data";
import { useCan } from "@/hooks/useCan";
import { TemplateCard, type ColorScheme } from "../components/TemplateCard";
import { TemplateFormDialog } from "../components/TemplateFormDialog";
import { ScreeningTemplate } from "../../types";

export default function TemplatesPage() {
  const canWrite = useCan("write:interview_templates");
  const canDelete = useCan("manage:interview_templates");

  const [filters, setFilters] = useState({
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
  const { data: roleCatalogData } = useGetRoleCatalogQuery({
    isActive: true,
    limit: 1000,
  });

  const templates = templatesData?.data || [];
  const roles = roleCatalogData?.data?.roles || [];

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!filters.search) return templates;
    const searchLower = filters.search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.role?.name.toLowerCase().includes(searchLower)
    );
  }, [templates, filters.search]);

  // Group templates by role
  const templatesByRole = useMemo(() => {
    const grouped: Record<string, typeof filteredTemplates> = {};
    filteredTemplates.forEach((template) => {
      const roleKey = template.role?.name || "Unknown Role";
      if (!grouped[roleKey]) {
        grouped[roleKey] = [];
      }
      grouped[roleKey].push(template);
    });
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(
        (a, b) =>
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
          "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
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
          "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
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
      icon: "text-slate-400 dark:text-slate-500",
      iconBg: "bg-slate-50 dark:bg-slate-900/50",
      border: "border-slate-200 dark:border-slate-800",
      questionBadge:
        "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
      roleBadge:
        "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
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
    <div className="min-h-screen">
      <div className="w-full mx-auto space-y-6 mt-2">
        {/* Header */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight">
                    Screening Templates
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {filteredTemplates.length} template
                    {filteredTemplates.length !== 1 ? "s" : ""} found •{" "}
                    {filteredTemplates.filter((t) => t.isActive).length} active
                  </CardDescription>
                </div>
              </div>
              {canWrite && (
                <Button
                  onClick={handleCreate}
                  className="gap-2 h-10 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-sm"
                >
                  <Plus className="h-3 w-3" />
                  New Template
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Premium Search Bar with Enhanced Styling */}
              <div className="relative group">
                <div
                  className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300 ${
                    filters.search ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Search
                    className={`h-5 w-5 transition-transform duration-300 ${
                      filters.search ? "scale-110" : "scale-100"
                    }`}
                  />
                </div>
                <Input
                  placeholder="Search templates by name, description, or role..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="pl-14 h-14 text-base border-0 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 focus:shadow-lg transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md"
                />
                <div
                  className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${
                    filters.search ? "ring-2 ring-blue-500/20" : ""
                  }`}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Role Filter */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700 tracking-wide">
                      Role
                    </span>
                  </div>
                  <Select
                    value={filters.roleId}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, roleId: value }))
                    }
                  >
                    <SelectTrigger className="h-11 px-4 border-0 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[180px]">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm max-h-[300px]">
                      <SelectItem
                        value="all"
                        className="rounded-lg hover:bg-blue-50"
                      >
                        All Roles
                      </SelectItem>
                      {roles.map((role) => (
                        <SelectItem
                          key={role.id}
                          value={role.id}
                          className="rounded-lg hover:bg-blue-50"
                        >
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700 tracking-wide">
                      Status
                    </span>
                  </div>
                  <Select
                    value={filters.isActive}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, isActive: value }))
                    }
                  >
                    <SelectTrigger className="h-11 px-4 border-0 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[140px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
                      <SelectItem
                        value="all"
                        className="rounded-lg hover:bg-blue-50"
                      >
                        All Status
                      </SelectItem>
                      <SelectItem
                        value="true"
                        className="rounded-lg hover:bg-blue-50"
                      >
                        Active Only
                      </SelectItem>
                      <SelectItem
                        value="false"
                        className="rounded-lg hover:bg-blue-50"
                      >
                        Inactive Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters Button */}
                {(filters.search ||
                  filters.roleId !== "all" ||
                  filters.isActive !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        roleId: "all",
                        isActive: "all",
                        search: "",
                      })
                    }
                    className="h-10 px-3 text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md gap-2 text-sm"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {filteredTemplates.length === 0 ? (
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="py-12 px-6">
              <div className="text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto">
                  <FileText className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    No templates found
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {filters.search ||
                    filters.roleId !== "all" ||
                    filters.isActive !== "all"
                      ? "Try adjusting your filters to find what you're looking for"
                      : "Get started by creating your first interview template"}
                  </p>
                </div>
                {canWrite &&
                  !filters.search &&
                  filters.roleId === "all" &&
                  filters.isActive === "all" && (
                    <Button
                      onClick={handleCreate}
                      size="default"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Template
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.keys(templatesByRole).map((roleName, roleIndex) => {
              const roleColor = getRoleGroupColor(roleIndex);
              const activeCount = templatesByRole[roleName].filter(
                (t) => t.isActive
              ).length;
              const totalCount = templatesByRole[roleName].length;

              return (
                <Card
                  key={roleName}
                  className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${roleColor.iconBg} border border-slate-200 dark:border-slate-800`}
                        >
                          <BookOpen className={`h-4 w-4 ${roleColor.icon}`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {roleName}
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {totalCount} template{totalCount !== 1 ? "s" : ""} •{" "}
                            {activeCount} active
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium border rounded px-2 py-0.5 h-5 ${roleColor.badge}`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${roleColor.dot} mr-1.5`}
                        />
                        {activeCount}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                      {templatesByRole[roleName].map(
                        (template, templateIndex) => {
                          const cardColor = getTemplateCardColor(
                            templateIndex,
                            template.isActive
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
                        }
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Template Form Dialog */}
        <TemplateFormDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          template={selectedTemplate}
          roles={roles}
        />
      </div>
    </div>
  );
}
