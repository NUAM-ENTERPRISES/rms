import { useState, useMemo } from "react";
import { FileText, Plus, Search, Loader2, AlertCircle, X } from "lucide-react";
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
import { TemplateCard } from "../components/TemplateCard";
import { TemplateFormDialog } from "../components/TemplateFormDialog";
import { MockInterviewTemplate } from "../../types";

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
    MockInterviewTemplate | undefined
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

  const handleCreate = () => {
    setSelectedTemplate(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (template: MockInterviewTemplate) => {
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
                    Interview Templates
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
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">No templates found</p>
                <p className="text-xs mb-4">
                  {filters.search ||
                  filters.roleId !== "all" ||
                  filters.isActive !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by creating your first template"}
                </p>
                {canWrite &&
                  !filters.search &&
                  filters.roleId === "all" &&
                  filters.isActive === "all" && (
                    <Button
                      onClick={handleCreate}
                      size="sm"
                      className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      <Plus className="h-3 w-3" />
                      Create Template
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.keys(templatesByRole).map((roleName) => (
              <Card
                key={roleName}
                className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300"
              >
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          {roleName}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {templatesByRole[roleName].length} template
                          {templatesByRole[roleName].length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {
                        templatesByRole[roleName].filter((t) => t.isActive)
                          .length
                      }{" "}
                      active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templatesByRole[roleName].map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        canEdit={canWrite}
                        canDelete={canDelete}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
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
