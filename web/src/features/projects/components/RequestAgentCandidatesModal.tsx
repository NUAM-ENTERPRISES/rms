import { useMemo } from "react";
import { z } from "zod";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { RoleNeeded } from "@/features/projects";

const itemSchema = z.object({
  roleNeededId: z.string().min(1),
  selected: z.boolean(),
  requestedCount: z.coerce.number().int().min(0),
  maxCount: z.number().int().positive(),
});

const formSchema = z
  .object({
    items: z.array(itemSchema),
    notes: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    const selectedItems = value.items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Select at least one role to request candidates.",
      });
    }
    selectedItems.forEach((item, index) => {
      if (item.requestedCount < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "requestedCount"],
          message: "Requested count must be at least 1.",
        });
      }
      if (item.requestedCount > item.maxCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "requestedCount"],
          message: `Requested count cannot exceed ${item.maxCount}.`,
        });
      }
    });
  });

type FormValues = z.infer<typeof formSchema>;

interface RequestAgentCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectRoles: RoleNeeded[];
  onSubmit: (payload: {
    items: Array<{ roleNeededId: string; requestedCount: number }>;
    notes?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function RequestAgentCandidatesModal({
  isOpen,
  onClose,
  projectRoles,
  onSubmit,
  isSubmitting = false,
}: RequestAgentCandidatesModalProps) {
  const defaultItems = useMemo(
    () =>
      projectRoles.map((role) => ({
        roleNeededId: role.id,
        selected: false,
        requestedCount: 0,
        maxCount: Math.max(role.quantity ?? 1, 1),
      })),
    [projectRoles]
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: defaultItems,
      notes: "",
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "items",
  });

  const selectedValues = watch("items");

  const closeAndReset = () => {
    reset({
      items: defaultItems,
      notes: "",
    });
    onClose();
  };

  const submitForm = handleSubmit(async (values) => {
    const selectedItems = values.items
      .filter((item) => item.selected)
      .map((item) => ({
        roleNeededId: item.roleNeededId,
        requestedCount: item.requestedCount,
      }));

    await onSubmit({
      items: selectedItems,
      notes: values.notes?.trim() || undefined,
    });
    closeAndReset();
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeAndReset()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Agent Candidates</DialogTitle>
          <DialogDescription>
            Select project roles and required candidate counts to notify Agent Coordinators.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submitForm} className="space-y-4">
          <div className="space-y-3">
            {fields.map((field, index) => {
              const role = projectRoles.find((item) => item.id === field.roleNeededId);
              const isSelected = selectedValues?.[index]?.selected ?? false;
              return (
                <div
                  key={field.id}
                  className="grid grid-cols-[auto_1fr_120px] items-center gap-3 rounded-md border border-border p-3"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      const enabled = checked === true;
                      setValue(`items.${index}.selected`, enabled, {
                        shouldValidate: true,
                      });
                      if (enabled && !selectedValues?.[index]?.requestedCount) {
                        setValue(`items.${index}.requestedCount`, 1, {
                          shouldValidate: true,
                        });
                      }
                    }}
                    aria-label={`Select ${role?.designation ?? "role"}`}
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {role?.designation ?? "Unknown role"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Open positions: {field.maxCount}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor={`count-${field.roleNeededId}`} className="sr-only">
                      Requested count
                    </Label>
                    <Input
                      id={`count-${field.roleNeededId}`}
                      type="number"
                      min={1}
                      max={field.maxCount}
                      disabled={!isSelected}
                      {...register(`items.${index}.requestedCount`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                </div>
              );
            })}
            {errors.items?.message && (
              <p className="text-sm text-destructive">{errors.items.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-request-notes">Notes (optional)</Label>
            <Textarea
              id="agent-request-notes"
              rows={3}
              placeholder="Add context for the Agent Coordinator team..."
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeAndReset}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
