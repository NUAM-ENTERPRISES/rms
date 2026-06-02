import { useMemo, useState } from "react";
import { z } from "zod";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Send,
  UserRoundSearch,
  Minus,
  Plus,
  Users,
  CheckCircle2,
  History,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { RoleNeeded } from "@/features/projects";
import AgentCandidateRequestHistoryModal from "./AgentCandidateRequestHistoryModal";

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
          message: `Cannot exceed ${item.maxCount}.`,
        });
      }
    });
  });

type FormValues = z.infer<typeof formSchema>;

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

interface RequestAgentCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
  projectRoles: RoleNeeded[];
  onSubmit: (payload: {
    items: Array<{ roleNeededId: string; requestedCount: number }>;
    notes?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
  title?: string;
  description?: string;
  submitText?: string;
}

export default function RequestAgentCandidatesModal({
  isOpen,
  onClose,
  projectId,
  projectTitle = "this project",
  projectRoles,
  onSubmit,
  isSubmitting = false,
  title = "Request Agent Candidates",
  description = "Notify Agent Coordinators about the roles and candidate counts you need.",
  submitText = "Send Request",
}: RequestAgentCandidatesModalProps) {
  const [showHistory, setShowHistory] = useState(false);
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
    defaultValues: { items: defaultItems, notes: "" },
  });

  const { fields } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const notesValue = watch("notes") ?? "";

  const selectedCount = watchedItems?.filter((i) => i.selected).length ?? 0;
  const totalRequested =
    watchedItems
      ?.filter((i) => i.selected)
      .reduce((sum, i) => sum + (i.requestedCount || 0), 0) ?? 0;

  const closeAndReset = () => {
    reset({ items: defaultItems, notes: "" });
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
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg">
        {/* Header */}
        <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <UserRoundSearch className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mx-6 h-px bg-border" />

        {/* Scrollable body */}
        <form onSubmit={submitForm} className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1">
            <div className="space-y-5 px-6 py-4">
              {/* Roles section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Project Roles
                  </p>
                  {selectedCount > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {selectedCount} role{selectedCount > 1 ? "s" : ""} selected
                    </span>
                  )}
                </div>

                {fields.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                    No roles defined for this project.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {fields.map((field, index) => {
                      const role = projectRoles.find((r) => r.id === field.roleNeededId);
                      const isSelected = watchedItems?.[index]?.selected ?? false;
                      const currentCount = watchedItems?.[index]?.requestedCount ?? 0;
                      const priorityKey = (role?.priority ?? "").toLowerCase();
                      const priorityStyle = PRIORITY_STYLES[priorityKey];
                      const rowError = (errors.items as any)?.[index]?.requestedCount?.message;

                      return (
                        <div
                          key={field.id}
                          className={cn(
                            "group rounded-xl border p-3.5 transition-all duration-150",
                            isSelected
                              ? "border-indigo-300 bg-indigo-50/60 shadow-sm"
                              : "border-border bg-muted/20 hover:border-slate-300 hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              className="mt-0.5 shrink-0"
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const enabled = checked === true;
                                setValue(`items.${index}.selected`, enabled, {
                                  shouldValidate: true,
                                });
                                if (enabled && !watchedItems?.[index]?.requestedCount) {
                                  setValue(`items.${index}.requestedCount`, 1, {
                                    shouldValidate: true,
                                  });
                                }
                              }}
                              aria-label={`Select ${role?.designation ?? "role"}`}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={cn(
                                    "text-sm font-semibold transition-colors",
                                    isSelected ? "text-indigo-900" : "text-foreground"
                                  )}
                                >
                                  {role?.designation ?? "Unknown role"}
                                </span>
                                {priorityStyle && (
                                  <Badge
                                    variant="outline"
                                    className={cn("px-1.5 py-0 text-[10px] capitalize", priorityStyle)}
                                  >
                                    {role?.priority}
                                  </Badge>
                                )}
                              </div>

                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  {field.maxCount} open position{field.maxCount !== 1 ? "s" : ""}
                                </span>
                                {role?.minExperience != null && (
                                  <span className="text-xs text-muted-foreground">
                                    {role.minExperience}
                                    {role.maxExperience != null
                                      ? `–${role.maxExperience}`
                                      : "+"}{" "}
                                    yrs exp
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Stepper */}
                            <div className="shrink-0">
                              <Label
                                htmlFor={`count-${field.roleNeededId}`}
                                className="sr-only"
                              >
                                Candidates requested
                              </Label>
                              <div
                                className={cn(
                                  "flex items-center rounded-lg border",
                                  isSelected
                                    ? "border-indigo-200 bg-white"
                                    : "border-border bg-background opacity-40"
                                )}
                              >
                                <button
                                  type="button"
                                  disabled={!isSelected || currentCount <= 1}
                                  onClick={() => {
                                    const next = Math.max(1, currentCount - 1);
                                    setValue(`items.${index}.requestedCount`, next, {
                                      shouldValidate: true,
                                    });
                                  }}
                                  className="flex h-8 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label="Decrease count"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <input
                                  id={`count-${field.roleNeededId}`}
                                  type="number"
                                  min={1}
                                  max={field.maxCount}
                                  disabled={!isSelected}
                                  {...register(`items.${index}.requestedCount`, {
                                    valueAsNumber: true,
                                  })}
                                  className="h-8 w-8 bg-transparent text-center text-sm font-semibold tabular-nums outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <button
                                  type="button"
                                  disabled={!isSelected || currentCount >= field.maxCount}
                                  onClick={() => {
                                    const next = Math.min(field.maxCount, currentCount + 1);
                                    setValue(`items.${index}.requestedCount`, next, {
                                      shouldValidate: true,
                                    });
                                  }}
                                  className="flex h-8 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label="Increase count"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              {rowError && (
                                <p className="mt-1 text-right text-[10px] text-destructive">
                                  {rowError}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {errors.items?.message && (
                  <p className="text-xs text-destructive">{errors.items.message}</p>
                )}
              </div>

              {/* Notes section */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="agent-request-notes"
                  className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Notes{" "}
                  <span className="normal-case tracking-normal font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="agent-request-notes"
                  rows={3}
                  placeholder="Add context for the Agent Coordinator team — urgency, special requirements, etc."
                  {...register("notes")}
                  className="resize-none text-sm"
                />
                <p className="text-right text-[10px] text-muted-foreground">
                  {notesValue.length}/500
                </p>
              </div>
            </div>
          </ScrollArea>

          {/* Sticky footer */}
          <div className="shrink-0 space-y-3 border-t border-border bg-background px-6 pb-6 pt-4">
            {/* Summary pill */}
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3.5 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />
                <p className="text-sm text-indigo-700">
                  Requesting{" "}
                  <span className="font-semibold">{totalRequested}</span> candidate
                  {totalRequested !== 1 ? "s" : ""} across{" "}
                  <span className="font-semibold">{selectedCount}</span> role
                  {selectedCount !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowHistory(true)}
                disabled={isSubmitting}
                className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <History className="h-4 w-4" />
                View History
              </Button>

              <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeAndReset}
                disabled={isSubmitting}
                className="h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || selectedCount === 0}
                className="h-9 bg-indigo-600 hover:bg-indigo-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {submitText}
                  </>
                )}
              </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>

      <AgentCandidateRequestHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        projectId={projectId}
        projectTitle={projectTitle}
      />
    </Dialog>
  );
}
