import { useEffect } from "react";
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";
import { toast } from "sonner";
import {
  MockInterviewChecklistTemplate,
  MOCK_INTERVIEW_CATEGORY,
} from "../../types";
import { useCreateTemplateMutation, useUpdateTemplateMutation } from "../data";

// Validation schema
const templateFormSchema = z.object({
  roleId: z.string().min(1, "Role is required"),
  category: z.string().min(1, "Category is required"),
  criterion: z.string().min(3, "Criterion must be at least 3 characters"),
  order: z.coerce.number().int().min(0, "Order must be a positive number"),
  isActive: z.boolean(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MockInterviewChecklistTemplate;
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

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      roleId: "",
      category: "",
      criterion: "",
      order: 0,
      isActive: true,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (template) {
      form.reset({
        roleId: template.roleId,
        category: template.category,
        criterion: template.criterion,
        order: template.order,
        isActive: template.isActive,
      });
    } else {
      form.reset({
        roleId: "",
        category: "",
        criterion: "",
        order: 0,
        isActive: true,
      });
    }
  }, [template, form, open]);

  const onSubmit = async (data: TemplateFormValues) => {
    try {
      if (template) {
        await updateTemplate({
          id: template.id,
          data,
        }).unwrap();
        toast.success("Template updated successfully");
      } else {
        await createTemplate(data).unwrap();
        toast.success("Template created successfully");
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
          `Failed to ${template ? "update" : "create"} template`
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
            {template ? "Edit Template" : "Create New Template"}
          </DialogTitle>
          <DialogDescription>
            {template
              ? "Update the checklist template details below."
              : "Add a new checklist template for role-based mock interviews."}
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isCreating || isUpdating}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="criterion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Criterion *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Ability to explain complex technical concepts clearly"
                      {...field}
                      disabled={isCreating || isUpdating}
                    />
                  </FormControl>
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
                      disabled={isCreating || isUpdating}
                    />
                  </FormControl>
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
