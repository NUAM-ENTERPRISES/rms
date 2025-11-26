import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import {
  MockInterviewTemplate,
  CreateTemplateItemRequest,
  MOCK_INTERVIEW_CATEGORY,
} from "../../types";
import { useCreateTemplateMutation, useUpdateTemplateMutation } from "../data";

// Validation schema
const itemSchema = z.object({
  category: z.string().min(1, "Category is required"),
  criterion: z.string().min(3, "Criterion must be at least 3 characters"),
  order: z.coerce.number().int().min(0).default(0),
});

const templateFormSchema = z.object({
  roleId: z.string().min(1, "Role is required"),
  name: z.string().min(3, "Template name must be at least 3 characters"),
  description: z.string().optional(),
  isActive: z.boolean(),
  items: z.array(itemSchema).optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

const categoryLabels: Record<string, string> = {
  [MOCK_INTERVIEW_CATEGORY.TECHNICAL_SKILLS]: "Technical Skills",
  [MOCK_INTERVIEW_CATEGORY.COMMUNICATION]: "Communication",
  [MOCK_INTERVIEW_CATEGORY.PROFESSIONALISM]: "Professionalism",
  [MOCK_INTERVIEW_CATEGORY.ROLE_SPECIFIC]: "Role Specific",
};

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MockInterviewTemplate;
  roles: Array<{ id: string; name: string }>;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  roles,
}: TemplateFormDialogProps) {
  const [createTemplate, { isLoading: isCreating }] =
    useCreateTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] =
    useUpdateTemplateMutation();

  const [items, setItems] = useState<CreateTemplateItemRequest[]>([]);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      roleId: "",
      name: "",
      description: "",
      isActive: true,
      items: [],
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (template) {
      form.reset({
        roleId: template.roleId,
        name: template.name,
        description: template.description || "",
        isActive: template.isActive,
        items: [], // Don't allow editing items in this dialog
      });
      setItems([]);
    } else {
      form.reset({
        roleId: "",
        name: "",
        description: "",
        isActive: true,
        items: [],
      });
      setItems([]);
    }
  }, [template, form, open]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<
      string,
      (CreateTemplateItemRequest & { index: number })[]
    > = {};
    items.forEach((item, index) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push({ ...item, index });
    });
    return grouped;
  }, [items]);

  const addItem = () => {
    setItems([
      ...items,
      {
        category: "",
        criterion: "",
        order: items.length,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof CreateTemplateItemRequest,
    value: string | number
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const onSubmit = async (data: TemplateFormValues) => {
    try {
      // Validate items if creating new template
      if (!template && items.length > 0) {
        // Check for duplicate criteria within the same category
        const criteriaMap = new Map<string, Set<string>>();
        for (const item of items) {
          if (!item.category || !item.criterion) {
            toast.error(
              "Please fill in all required fields for all questions."
            );
            return;
          }
          const category = item.category;
          const criterion = item.criterion.toLowerCase().trim();
          if (!criteriaMap.has(category)) {
            criteriaMap.set(category, new Set());
          }
          if (criteriaMap.get(category)!.has(criterion)) {
            toast.error(
              `Duplicate question found in "${category}" category. Each question must be unique within a category.`
            );
            return;
          }
          criteriaMap.get(category)!.add(criterion);
        }
      }

      const payload = {
        ...data,
        items: !template && items.length > 0 ? items : undefined,
      };

      if (template) {
        await updateTemplate({
          id: template.id,
          data,
        }).unwrap();
        toast.success("Template updated successfully");
      } else {
        await createTemplate(payload).unwrap();
        toast.success("Template created successfully");
      }
      onOpenChange(false);
      form.reset();
      setItems([]);
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
          `Failed to ${template ? "update" : "create"} template`
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Template" : "Create New Template"}
          </DialogTitle>
          <DialogDescription>
            {template
              ? "Update the checklist template details below."
              : "Add a new checklist template with questions organized by category."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isCreating || isUpdating}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Standard RN Interview Template"
                      {...field}
                      disabled={isCreating || isUpdating}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this interview template
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description of what this template covers..."
                      {...field}
                      disabled={isCreating || isUpdating}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Brief description of the template's purpose
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      This template will be available for use
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isCreating || isUpdating}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Questions Section - Only show when creating new template */}
            {!template && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Questions</h3>
                    <p className="text-sm text-muted-foreground">
                      Add questions organized by category. You can add multiple
                      questions to each category.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    disabled={isCreating || isUpdating}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Question
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <p>No questions added yet.</p>
                    <p className="text-sm mt-1">
                      Click "Add Question" to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(itemsByCategory).map(
                      ([category, categoryItems], categoryIndex) => (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="font-semibold">
                              {categoryLabels[category] || category}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {categoryItems.length}{" "}
                              {categoryItems.length === 1
                                ? "question"
                                : "questions"}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {categoryItems.map(({ index, ...item }) => (
                              <Card
                                key={index}
                                className="border-l-4 border-l-primary/20"
                              >
                                <CardContent className="pt-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 space-y-3">
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                                            Category *
                                          </label>
                                          <Select
                                            value={item.category}
                                            onValueChange={(value) =>
                                              updateItem(
                                                index,
                                                "category",
                                                value
                                              )
                                            }
                                            disabled={isCreating || isUpdating}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select category..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {Object.entries(
                                                categoryLabels
                                              ).map(([value, label]) => {
                                                const itemCount = items.filter(
                                                  (i) => i.category === value
                                                ).length;
                                                return (
                                                  <SelectItem
                                                    key={value}
                                                    value={value}
                                                  >
                                                    {label}
                                                    {itemCount > 0 &&
                                                      ` (${itemCount} question${
                                                        itemCount !== 1
                                                          ? "s"
                                                          : ""
                                                      })`}
                                                  </SelectItem>
                                                );
                                              })}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                                            Question/Criterion *
                                          </label>
                                          <Textarea
                                            placeholder="e.g., Ability to explain complex technical concepts clearly"
                                            value={item.criterion}
                                            onChange={(e) =>
                                              updateItem(
                                                index,
                                                "criterion",
                                                e.target.value
                                              )
                                            }
                                            disabled={isCreating || isUpdating}
                                            rows={2}
                                            className="resize-none"
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="text-xs font-medium text-muted-foreground block mb-1">
                                              Order
                                            </label>
                                            <Input
                                              type="number"
                                              min="0"
                                              value={item.order}
                                              onChange={(e) =>
                                                updateItem(
                                                  index,
                                                  "order",
                                                  parseInt(e.target.value) || 0
                                                )
                                              }
                                              disabled={
                                                isCreating || isUpdating
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeItem(index)}
                                        disabled={isCreating || isUpdating}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          {categoryIndex <
                            Object.keys(itemsByCategory).length - 1 && (
                            <Separator className="mt-4" />
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating || isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                )}
                {template ? "Update" : "Create"} Template
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
