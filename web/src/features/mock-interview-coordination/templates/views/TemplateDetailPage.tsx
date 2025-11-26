import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  FileText,
  Loader2,
  AlertCircle,
  ListChecks,
  Briefcase,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import {
  useGetTemplateQuery,
  useDeleteTemplateMutation,
  useDeleteTemplateItemMutation,
} from "../data";
import { TemplateFormDialog, TemplateItemFormDialog } from "../components";
import {
  MockInterviewTemplateItem,
  MOCK_INTERVIEW_CATEGORY,
} from "../../types";

const categoryLabels: Record<string, string> = {
  [MOCK_INTERVIEW_CATEGORY.TECHNICAL_SKILLS]: "Technical Skills",
  [MOCK_INTERVIEW_CATEGORY.COMMUNICATION]: "Communication",
  [MOCK_INTERVIEW_CATEGORY.PROFESSIONALISM]: "Professionalism",
  [MOCK_INTERVIEW_CATEGORY.ROLE_SPECIFIC]: "Role Specific",
};

const categoryColors: Record<string, string> = {
  [MOCK_INTERVIEW_CATEGORY.TECHNICAL_SKILLS]:
    "bg-blue-100 text-blue-800 border-blue-200",
  [MOCK_INTERVIEW_CATEGORY.COMMUNICATION]:
    "bg-green-100 text-green-800 border-green-200",
  [MOCK_INTERVIEW_CATEGORY.PROFESSIONALISM]:
    "bg-purple-100 text-purple-800 border-purple-200",
  [MOCK_INTERVIEW_CATEGORY.ROLE_SPECIFIC]:
    "bg-orange-100 text-orange-800 border-orange-200",
};

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const canWrite = useCan("write:interview_templates");
  const canDelete = useCan("manage:interview_templates");

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<
    MockInterviewTemplateItem | undefined
  >();

  const {
    data: templateData,
    isLoading,
    error,
  } = useGetTemplateQuery(templateId!);

  const [deleteTemplate] = useDeleteTemplateMutation();
  const [deleteItem] = useDeleteTemplateItemMutation();

  const template = templateData?.data;

  // Group items by category
  const itemsByCategory = useMemo(() => {
    if (!template?.items) return {};
    const grouped: Record<string, MockInterviewTemplateItem[]> = {};
    template.items.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    // Sort items within each category by order
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => a.order - b.order);
    });
    return grouped;
  }, [template?.items]);

  const handleEditTemplate = () => {
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = async () => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteTemplate(templateId!).unwrap();
      toast.success("Template deleted successfully");
      navigate("/mock-interviews/templates");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete template");
    }
  };

  const handleAddItem = () => {
    setSelectedItem(undefined);
    setItemDialogOpen(true);
  };

  const handleEditItem = (item: MockInterviewTemplateItem) => {
    setSelectedItem(item);
    setItemDialogOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteItem({
        templateId: templateId!,
        itemId,
      }).unwrap();
      toast.success("Item deleted successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete item");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load template. Please try again.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/mock-interviews/templates")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                {template.name}
              </h1>
              {template.description && (
                <p className="text-muted-foreground mt-2">
                  {template.description}
                </p>
              )}
            </div>
          </div>
          {(canWrite || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canWrite && (
                  <DropdownMenuItem onClick={handleEditTemplate}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Template
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={handleDeleteTemplate}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Template
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Template Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Template Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Role
            </div>
            <div className="font-semibold">
              {template.role?.name || "Unknown"}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Status
            </div>
            <Badge variant={template.isActive ? "default" : "secondary"}>
              {template.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Total Questions
            </div>
            <div className="font-semibold flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              {template.items?.length || 0} questions
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Template Questions
              </CardTitle>
              <CardDescription>
                Questions organized by category. You can add multiple questions
                to each category.
              </CardDescription>
            </div>
            {canWrite && (
              <Button onClick={handleAddItem} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Question
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!template.items || template.items.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No questions added yet. Click "Add Question" to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {Object.entries(itemsByCategory).map(
                ([category, items], categoryIndex) => (
                  <div key={category}>
                    <div className="flex items-center gap-3 mb-4">
                      <Badge
                        variant="outline"
                        className={`${
                          categoryColors[category] ||
                          "bg-gray-100 text-gray-800 border-gray-200"
                        } font-semibold`}
                      >
                        {categoryLabels[category] || category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {items.length}{" "}
                        {items.length === 1 ? "question" : "questions"}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {items.map((item, itemIndex) => (
                        <Card
                          key={item.id}
                          className="border-l-4 border-l-primary/20"
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-start gap-3">
                                  <span className="text-sm font-medium text-muted-foreground mt-1">
                                    {itemIndex + 1}.
                                  </span>
                                  <div className="flex-1">
                                    <div className="font-medium mb-1">
                                      {item.criterion}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Order: {item.order}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {canWrite && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleEditItem(item)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {categoryIndex <
                      Object.keys(itemsByCategory).length - 1 && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TemplateFormDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={template}
        roles={template.role ? [template.role] : []}
      />

      <TemplateItemFormDialog
        open={itemDialogOpen}
        onOpenChange={(open: boolean) => {
          setItemDialogOpen(open);
          if (!open) setSelectedItem(undefined);
        }}
        templateId={templateId!}
        item={selectedItem}
      />
    </div>
  );
}
