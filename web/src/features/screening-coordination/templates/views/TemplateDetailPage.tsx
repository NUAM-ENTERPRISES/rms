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
  Building2,
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
import { cn } from "@/lib/utils";

const categoryConfig: Record<
  string,
  {
    label: string;
    badge: string;
    iconBg: string;
    icon: string;
    bar: string;
    number: string;
  }
> = {
  [SCREENING_CATEGORY.TECHNICAL_SKILLS]: {
    label: "Technical Skills",
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    iconBg: "bg-sky-100",
    icon: "text-sky-700",
    bar: "bg-sky-500",
    number: "text-sky-700",
  },
  [SCREENING_CATEGORY.COMMUNICATION]: {
    label: "Communication",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    iconBg: "bg-emerald-100",
    icon: "text-emerald-700",
    bar: "bg-emerald-500",
    number: "text-emerald-700",
  },
  [SCREENING_CATEGORY.PROFESSIONALISM]: {
    label: "Professionalism",
    badge: "border-teal-200 bg-teal-50 text-teal-700",
    iconBg: "bg-teal-100",
    icon: "text-teal-700",
    bar: "bg-teal-500",
    number: "text-teal-700",
  },
  [SCREENING_CATEGORY.ROLE_SPECIFIC]: {
    label: "Role Specific",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    iconBg: "bg-amber-100",
    icon: "text-amber-700",
    bar: "bg-amber-500",
    number: "text-amber-700",
  },
};

function errorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message;
  }
  return fallback;
}

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

  const itemsByCategory = useMemo(() => {
    if (!template?.items) return {};
    const grouped: Record<string, ScreeningTemplateItem[]> = {};
    template.items.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => a.order - b.order);
    });
    return grouped;
  }, [template?.items]);

  const categoryCount = Object.keys(itemsByCategory).length;

  const handleEditTemplate = () => setTemplateDialogOpen(true);

  const handleDeleteTemplate = async () => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteTemplate(templateId!).unwrap();
      toast.success("Template deleted successfully");
      navigate("/screenings/templates");
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Failed to delete template"));
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
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Failed to delete item"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load template. Please try again.
          </AlertDescription>
        </Alert>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => navigate("/screenings/templates")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back to Templates
        </Button>
      </div>
    );
  }

  const totalQuestions = template.items?.length || 0;
  const roleLabel =
    template.role?.label || template.role?.name || "Unknown role";
  const departmentLabel = template.role?.roleDepartment?.name;

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

      {/* Back + actions */}
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl"
          onClick={() => navigate("/screenings/templates")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Templates
        </Button>

        {(canWrite || canDelete) && (
          <div className="flex items-center gap-2">
            {canWrite && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl"
                onClick={handleEditTemplate}
              >
                <Edit className="h-4 w-4" aria-hidden />
                Edit Template
              </Button>
            )}
            {canDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl border-danger-200 text-danger-700 hover:bg-danger-50 hover:text-danger-800"
                onClick={handleDeleteTemplate}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Hero header */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-card/90 shadow-sm backdrop-blur-sm">
        <div className="h-1 bg-teal-500" />
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-teal-50/80 via-sky-50/30 to-transparent"
        />
        <div className="relative space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-600 shadow-lg shadow-teal-200/60 sm:h-16 sm:w-16">
                <FileText
                  className="h-7 w-7 text-white sm:h-8 sm:w-8"
                  aria-hidden
                />
              </div>
              <div className="min-w-0 space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {template.name}
                </h1>
                {template.description ? (
                  <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                    {template.description}
                  </p>
                ) : null}
              </div>
            </div>

            {template.isActive ? (
              <Badge
                variant="outline"
                className="w-fit gap-1.5 border-success-200 bg-success-50 px-3 py-1 text-success-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Active
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="w-fit gap-1.5 border-danger-200 bg-danger-50 px-3 py-1 text-danger-700"
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden />
                Inactive
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-3.5">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-teal-700">
                <Briefcase className="h-3.5 w-3.5" aria-hidden />
                Role
              </div>
              <p className="truncate text-sm font-semibold text-foreground">
                {roleLabel}
              </p>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3.5">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-sky-700">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                Department
              </div>
              <p className="truncate text-sm font-semibold text-foreground">
                {departmentLabel || "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-emerald-700">
                <ListChecks className="h-3.5 w-3.5" aria-hidden />
                Questions
              </div>
              <p className="text-sm font-semibold text-foreground">
                {totalQuestions}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-amber-800">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Categories
              </div>
              <p className="text-sm font-semibold text-foreground">
                {categoryCount}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Questions */}
      <Card className="overflow-hidden border-border bg-card/95 shadow-sm">
        <div className="h-1 bg-sky-500" />
        <CardHeader className="border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <ListChecks className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Template Questions
                </CardTitle>
                <CardDescription>
                  {totalQuestions} question{totalQuestions !== 1 ? "s" : ""}
                  {categoryCount > 0
                    ? ` across ${categoryCount} categor${categoryCount === 1 ? "y" : "ies"}`
                    : ""}
                </CardDescription>
              </div>
            </div>

            {canWrite && (
              <Button
                type="button"
                onClick={handleAddItem}
                size="sm"
                className="gap-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add Question
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {!template.items || template.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <ListChecks className="h-7 w-7" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                No questions yet
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Add your first screening question to start building this
                template.
              </p>
              {canWrite && (
                <Button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-5 gap-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add Question
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(itemsByCategory).map(([category, items]) => {
                const config =
                  categoryConfig[category] ||
                  categoryConfig[SCREENING_CATEGORY.TECHNICAL_SKILLS];

                return (
                  <section
                    key={category}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                  >
                    <div className={cn("h-1", config.bar)} />
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            config.iconBg,
                            config.icon,
                          )}
                        >
                          <ListChecks className="h-4 w-4" aria-hidden />
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            config.badge,
                          )}
                        >
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {items.length} question
                          {items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <ul className="divide-y divide-border">
                      {items.map((item, itemIndex) => (
                        <li
                          key={item.id}
                          className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold",
                              config.number,
                            )}
                          >
                            {itemIndex + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-relaxed text-foreground">
                              {item.criterion}
                            </p>
                          </div>
                          {canWrite && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                  aria-label={`Actions for question ${itemIndex + 1}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
