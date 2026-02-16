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
    limit: 100,
  });

  const templates = useMemo(() => {
    const data: any = templatesData?.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [templatesData]);

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
   <Card className="border-0 shadow-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30 transition-all duration-300 hover:shadow-3xl hover:ring-indigo-300/50">
  <CardHeader className="pb-3 border-b border-indigo-200/50">
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
          <div className="relative p-2.5 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-md transform transition-transform duration-300 group-hover:scale-105">
            <FileText className="h-6 w-6 text-white drop-shadow-md" />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
            Screening Templates
          </CardTitle>
          <CardDescription className="text-sm text-slate-600 mt-1 font-medium">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} found •{" "}
            {filteredTemplates.filter((t) => t.isActive).length} active
          </CardDescription>
        </div>
      </div>

      {canWrite && (
       <Button
  onClick={handleCreate}
  className="relative group overflow-hidden gap-2 h-11 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] text-white font-medium text-sm tracking-wide"
>
  {/* Subtle shine effect on hover */}
  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out" />
  
  <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
  New Template
</Button>
      )}
    </div>
  </CardHeader>

  <CardContent className="p-6">
    <div className="space-y-6">
      {/* Premium Search Bar */}
      <div className="relative group">
        <div
          className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-300 ${
            filters.search ? "text-indigo-600 scale-110" : "text-slate-400"
          }`}
        >
          <Search className="h-5 w-5 transition-transform duration-300" />
        </div>
        <Input
          placeholder="Search templates by name, description, or role..."
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className="pl-12 h-12 text-base rounded-xl border-0 bg-white/80 backdrop-blur-sm shadow-inner hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all duration-300 placeholder:text-slate-400"
        />
        <div
          className={`absolute inset-0 rounded-xl pointer-events-none transition-all duration-300 ${
            filters.search ? "ring-2 ring-indigo-400/20 shadow-lg" : ""
          }`}
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Role Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-slate-700 tracking-wide">
              Role
            </span>
          </div>
          <Select
            value={filters.roleId}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, roleId: value }))}
          >
            <SelectTrigger className="h-10 px-4 border-0 bg-white/80 backdrop-blur-sm rounded-xl shadow-inner hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-indigo-400/30 transition-all duration-300 min-w-[180px] text-sm">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm max-h-[300px]">
              <SelectItem value="all" className="rounded-lg hover:bg-indigo-50">
                All Roles
              </SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id} className="rounded-lg hover:bg-indigo-50">
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-slate-700 tracking-wide">
              Status
            </span>
          </div>
          <Select
            value={filters.isActive}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, isActive: value }))}
          >
            <SelectTrigger className="h-10 px-4 border-0 bg-white/80 backdrop-blur-sm rounded-xl shadow-inner hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-indigo-400/30 transition-all duration-300 min-w-[140px] text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
              <SelectItem value="all" className="rounded-lg hover:bg-indigo-50">
                All Status
              </SelectItem>
              <SelectItem value="true" className="rounded-lg hover:bg-indigo-50">
                Active Only
              </SelectItem>
              <SelectItem value="false" className="rounded-lg hover:bg-indigo-50">
                Inactive Only
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {(filters.search || filters.roleId !== "all" || filters.isActive !== "all") && (
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
            className="h-10 px-4 text-sm text-slate-600 hover:text-slate-900 hover:bg-indigo-50/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 gap-2"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
    </div>
  </CardContent>
</Card>
        {/* Content */}
        {filteredTemplates.length === 0 ? (
         <Card className="border-0 shadow-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30 transition-all duration-300 hover:shadow-3xl hover:ring-indigo-300/50">
  <CardContent className="py-16 px-8">
    <div className="text-center max-w-md mx-auto space-y-6">
      {/* Perfectly centered premium icon with glow */}
      <div className="relative mx-auto w-20 h-20">
        {/* Glow background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full blur-3xl opacity-30 animate-pulse-slow"></div>
        
        {/* Icon container - centered with flex */}
        <div className="relative w-full h-full rounded-2xl bg-white/90 backdrop-blur-lg border border-indigo-200/50 flex items-center justify-center shadow-xl transform transition-transform duration-300 hover:scale-105">
          <FileText className="h-10 w-10 text-indigo-600 drop-shadow-md" />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
          No Templates Found
        </h3>
        <p className="text-base text-slate-600 leading-relaxed font-medium">
          {filters.search ||
          filters.roleId !== "all" ||
          filters.isActive !== "all"
            ? "Try adjusting your filters to find matches"
            : "Get started by creating your first interview template"}
        </p>
      </div>

      {canWrite &&
        !filters.search &&
        filters.roleId === "all" &&
        filters.isActive === "all" && (
          <Button
            onClick={handleCreate}
            size="lg"
            className="gap-2 h-12 px-8 mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-base font-medium"
          >
            <Plus className="h-5 w-5" />
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
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white/90 to-indigo-50/50 dark:from-slate-900/90 dark:to-indigo-950/50 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30 dark:ring-indigo-800/30 transition-all duration-300 hover:shadow-2xl hover:ring-indigo-300/50 dark:hover:ring-indigo-700/50">
  <CardHeader className="pb-3 border-b border-indigo-200/50 dark:border-indigo-800/50">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${roleColor.iconBg} border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm`}
        >
          <BookOpen className={`h-5 w-5 ${roleColor.icon}`} />
        </div>
        <div>
          <CardTitle className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent tracking-tight">
            {roleName}
          </CardTitle>
          <CardDescription className="text-xs mt-1 text-slate-600 dark:text-slate-400 font-medium">
            {totalCount} template{totalCount !== 1 ? "s" : ""} • {activeCount} active
          </CardDescription>
        </div>
      </div>

      <Badge
        variant="outline"
        className={`text-xs font-medium border rounded px-3 py-1 h-6 flex items-center gap-1.5 shadow-sm ${roleColor.badge}`}
      >
        <div
          className={`w-2 h-2 rounded-full ${roleColor.dot} animate-pulse`}
        />
        {activeCount} active
      </Badge>
    </div>
  </CardHeader>

  <CardContent className="p-5">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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
