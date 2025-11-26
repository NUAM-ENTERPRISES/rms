import { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Upload,
  X,
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
import { TemplateCard } from "../components/TemplateCard";
import { TemplateFormDialog } from "../components/TemplateFormDialog";
import { BulkTemplateDialog } from "../components/BulkTemplateDialog";
import {
  MockInterviewChecklistTemplate,
  MOCK_INTERVIEW_CATEGORY,
} from "../../types";

export default function TemplatesPage() {
  const canWrite = useCan("write:interview_templates");
  const canDelete = useCan("manage:interview_templates");

  const [filters, setFilters] = useState({
    roleId: "all",
    category: "all",
    isActive: "all",
    search: "",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    MockInterviewChecklistTemplate | undefined
  >();

  const queryParams = useMemo(() => {
    const params: any = {};
    if (filters.roleId && filters.roleId !== "all") {
      params.roleId = filters.roleId;
    }
    if (filters.category && filters.category !== "all") {
      params.category = filters.category;
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
        t.criterion.toLowerCase().includes(searchLower) ||
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
      grouped[key].sort((a, b) => a.order - b.order);
    });
    return grouped;
  }, [filteredTemplates]);

  const handleCreate = () => {
    setSelectedTemplate(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (template: MockInterviewChecklistTemplate) => {
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

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    {
      value: MOCK_INTERVIEW_CATEGORY.TECHNICAL_SKILLS,
      label: "Technical Skills",
    },
    { value: MOCK_INTERVIEW_CATEGORY.COMMUNICATION, label: "Communication" },
    {
      value: MOCK_INTERVIEW_CATEGORY.PROFESSIONALISM,
      label: "Professionalism",
    },
    { value: MOCK_INTERVIEW_CATEGORY.ROLE_SPECIFIC, label: "Role Specific" },
  ];

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
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Interview Templates
            </h1>
          </div>
          {canWrite && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setBulkDialogOpen(true)}
                className="gap-2 hover:bg-accent/50"
              >
                <Upload className="h-4 w-4" />
                Bulk Manage
              </Button>
              <Button
                onClick={handleCreate}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates by criterion or role..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-10"
              />
            </div>

            <Select
              value={filters.roleId}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, roleId: value }))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.category}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.isActive}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, isActive: value }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active Only</SelectItem>
                <SelectItem value="false">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            {(filters.search ||
              filters.roleId !== "all" ||
              filters.category !== "all" ||
              filters.isActive !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters({
                    roleId: "all",
                    category: "all",
                    isActive: "all",
                    search: "",
                  })
                }
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No templates found</p>
              <p className="text-sm mb-4">
                {filters.search ||
                filters.roleId !== "all" ||
                filters.category !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first template"}
              </p>
              {canWrite &&
                !filters.search &&
                filters.roleId === "all" &&
                filters.category === "all" && (
                  <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Template
                  </Button>
                )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.keys(templatesByRole).map((roleName) => (
            <Card key={roleName}>
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{roleName}</CardTitle>
                      <CardDescription>
                        {templatesByRole[roleName].length} template
                        {templatesByRole[roleName].length !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {templatesByRole[roleName].filter((t) => t.isActive).length}{" "}
                    active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Bulk Template Dialog */}
      <BulkTemplateDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        roles={roles}
      />
    </div>
  );
}
