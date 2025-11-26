import { useEffect, useMemo } from "react";
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
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";
import { toast } from "sonner";
import {
  MockInterviewTemplateItem,
  MOCK_INTERVIEW_CATEGORY,
} from "../../types";
import {
  useAddTemplateItemMutation,
  useUpdateTemplateItemMutation,
  useGetTemplateQuery,
} from "../data";

// Validation schema
const itemFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  criterion: z.string().min(3, "Criterion must be at least 3 characters"),
  order: z.number().int().min(0, "Order must be a positive number"),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

interface TemplateItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  item?: MockInterviewTemplateItem;
}

export function TemplateItemFormDialog({
  open,
  onOpenChange,
  templateId,
  item,
}: TemplateItemFormDialogProps) {
  const [addItem, { isLoading: isAdding }] = useAddTemplateItemMutation();
  const [updateItem, { isLoading: isUpdating }] =
    useUpdateTemplateItemMutation();
  const { data: templateData } = useGetTemplateQuery(templateId);

  const template = templateData?.data;
  const existingCriteria = useMemo(() => {
    if (!template?.items) return new Map<string, Set<string>>();
    const map = new Map<string, Set<string>>();
    template.items.forEach((i) => {
      if (!map.has(i.category)) {
        map.set(i.category, new Set());
      }
      map.get(i.category)!.add(i.criterion.toLowerCase().trim());
    });
    return map;
  }, [template?.items]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      category: "",
      criterion: "",
      order: 0,
    },
    mode: "onChange",
  });

  // Populate form when editing
  useEffect(() => {
    if (item) {
      form.reset({
        category: item.category,
        criterion: item.criterion,
        order: item.order,
      });
    } else {
      form.reset({
        category: "",
        criterion: "",
        order: 0,
      });
    }
  }, [item, form, open]);

  const onSubmit = async (data: ItemFormValues) => {
    try {
      // Check for duplicate criterion in the selected category
      const categoryCriteria = existingCriteria.get(data.category);
      if (categoryCriteria && !item) {
        const criterionLower = data.criterion.toLowerCase().trim();
        if (categoryCriteria.has(criterionLower)) {
          toast.error(
            `This question already exists in the "${data.category}" category. Please use a different question.`
          );
          return;
        }
      }

      if (item) {
        await updateItem({
          templateId,
          itemId: item.id,
          data,
        }).unwrap();
        toast.success("Question updated successfully");
      } else {
        await addItem({
          templateId,
          data,
        }).unwrap();
        toast.success("Question added successfully");
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(
        error?.data?.message || `Failed to ${item ? "update" : "add"} question`
      );
    }
  };

  const categoryOptions = [
    {
      value: MOCK_INTERVIEW_CATEGORY.TECHNICAL_SKILLS,
      label: "Technical Skills",
    },
    {
      value: MOCK_INTERVIEW_CATEGORY.COMMUNICATION,
      label: "Communication",
    },
    {
      value: MOCK_INTERVIEW_CATEGORY.PROFESSIONALISM,
      label: "Professionalism",
    },
    {
      value: MOCK_INTERVIEW_CATEGORY.ROLE_SPECIFIC,
      label: "Role Specific",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit Question" : "Add Question to Template"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Update the question details below."
              : "Add a new question to this template. You can add multiple questions to the same category."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isAdding || isUpdating || !!item}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((option) => {
                        const itemCount =
                          template?.items?.filter(
                            (i) => i.category === option.value
                          ).length || 0;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                            {itemCount > 0 &&
                              ` (${itemCount} question${
                                itemCount !== 1 ? "s" : ""
                              })`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {item
                      ? "Category cannot be changed after creation"
                      : "Select a category. You can add multiple questions to the same category."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="criterion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question/Criterion *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Ability to explain complex technical concepts clearly"
                      {...field}
                      disabled={isAdding || isUpdating}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    The question or criterion to evaluate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                      value={field.value}
                      disabled={isAdding || isUpdating}
                    />
                  </FormControl>
                  <FormDescription>
                    Display order within the category (lower numbers appear
                    first)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isAdding || isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAdding || isUpdating}>
                {(isAdding || isUpdating) && (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                )}
                {item ? "Update" : "Add"} Question
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
