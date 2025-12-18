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
  CheckCircle2,
  XCircle,
  MoreVertical,
  Sparkles,
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
  ScreeningTemplateItem,
  SCREENING_CATEGORY,
} from "../../types";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { cn } from "@/lib/utils";

// Purposeful color scheme - each category has distinct colors
const categoryConfig: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    iconBg: string;
    accent: string;
    borderLeft: string;
  }
> = {
  [SCREENING_CATEGORY.TECHNICAL_SKILLS]: {
    label: "Technical Skills",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    accent: "from-blue-500 to-blue-600",
    borderLeft: "border-l-blue-500",
  },
  [SCREENING_CATEGORY.COMMUNICATION]: {
    label: "Communication",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    accent: "from-emerald-500 to-emerald-600",
    borderLeft: "border-l-emerald-500",
  },
  [SCREENING_CATEGORY.PROFESSIONALISM]: {
    label: "Professionalism",
    bg: "bg-purple-50 dark:bg-purple-950/20",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    accent: "from-purple-500 to-purple-600",
    borderLeft: "border-l-purple-500",
  },
  [SCREENING_CATEGORY.ROLE_SPECIFIC]: {
    label: "Role Specific",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    accent: "from-amber-500 to-amber-600",
    borderLeft: "border-l-amber-500",
  },
};

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const canWrite = useCan("write:interview_templates");
  const canDelete = useCan("manage:interview_templates");

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<
    ScreeningTemplateItem | undefined
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
    const grouped: Record<string, ScreeningTemplateItem[]> = {};
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
      navigate("/screenings/templates");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete template");
    }
  };

  const handleAddItem = () => {
    setSelectedItem(undefined);
    setItemDialogOpen(true);
  };

  const handleEditItem = (item: ScreeningTemplateItem) => {
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
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load template. Please try again.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/screenings/templates")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
      </div>
    );
  }

  const totalQuestions = template.items?.length || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto py-2 max-w-7xl space-y-4">
        {/* Combined Template Info Card */}
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-blue-500/5 rounded-full blur-3xl -translate-y-24 translate-x-24" />
          <CardContent className="p-3 relative">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Template Name & Description */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                    {template.name}
                  </h1>
                  {template.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Actions & Compact Stats */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Compact Stats */}
                <div className="flex items-center gap-3">
                  {/* Role - Compact */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      {template.role?.name || "Unknown"}
                    </span>
                  </div>

                  {/* Status - Compact */}
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border",
                      template.isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                    )}
                  >
                    {template.isActive ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    )}
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        template.isActive
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-red-700 dark:text-red-300"
                      )}
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Questions - Compact */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <ListChecks className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {totalQuestions}
                    </span>
                  </div>
                </div>

                {/* Actions Menu */}
                {(canWrite || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <MoreVertical className="h-4 w-4" />
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
          </CardContent>
        </Card>

        {/* Questions Section */}
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
                  <ListChecks className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Template Questions
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Questions organized by category
                  </CardDescription>
                </div>
              </div>
              {canWrite && (
                <Button onClick={handleAddItem} size="sm" className="gap-2 h-8">
                  <Plus className="h-3.5 w-3.5" />
                  Add Question
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!template.items || template.items.length === 0 ? (
              <div className="py-12 text-center">
                <div className="max-w-xs mx-auto">
                  <DotLottieReact
                    src="https://lottie.host/059d48f3-3d30-41a0-bffb-3f5e9680c9ff/iTt1pDCekJ.lottie"
                    loop
                    autoplay
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-4">
                  No questions yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  Get started by adding your first question
                </p>
                {canWrite && (
                  <Button onClick={handleAddItem} size="sm" className="gap-2">
                    <Plus className="h-3.5 w-3.5" />
                    Add Question
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(itemsByCategory).map(([category, items]) => {
                    const config =
                    categoryConfig[category] ||
                    categoryConfig[SCREENING_CATEGORY.TECHNICAL_SKILLS];
                  return (
                    <Card
                      key={category}
                      className={cn(
                        "border-l-4 transition-all duration-200",
                        config.borderLeft,
                        "border-0 shadow-sm"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                config.iconBg
                              )}
                            >
                              <Sparkles
                                className={cn("h-4 w-4", config.text)}
                              />
                            </div>
                            <div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs font-semibold border",
                                  config.bg,
                                  config.text,
                                  config.border
                                )}
                              >
                                {config.label}
                              </Badge>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {items.length}{" "}
                              {items.length === 1 ? "question" : "questions"}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {items.map((item, itemIndex) => (
                            <div
                              key={item.id}
                              className="flex items-start justify-between gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group"
                            >
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <span
                                  className={cn(
                                    "text-xs font-semibold mt-0.5 flex-shrink-0",
                                    config.text
                                  )}
                                >
                                  {itemIndex + 1}.
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                                    {item.criterion}
                                  </div>
                                </div>
                              </div>
                              {canWrite && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleEditItem(item)}
                                    >
                                      <Edit className="h-3.5 w-3.5 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
    </div>
  );
}
