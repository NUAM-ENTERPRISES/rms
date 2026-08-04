import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, Loader2, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { settingsFieldClass } from "./settingsCardUi";
import {
  useCreateRoleDepartmentMutation,
  useUpdateRoleDepartmentMutation,
  type CatalogRoleDepartment,
} from "../api/catalogSettingsApi";

export const departmentFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  label: z.string().trim().min(1, "Label is required"),
  shortName: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

/** Lowercase slug from a label: letters only, words joined with `_`. */
export function labelToSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

/** Uppercase 3-letter short name from a label. */
export function labelToShortName(label: string): string {
  return label.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
}

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

export interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: CatalogRoleDepartment | null;
  onSuccess?: (department: CatalogRoleDepartment) => void;
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  editing = null,
  onSuccess,
}: DepartmentFormDialogProps) {
  const [shortNameManual, setShortNameManual] = useState(false);
  const [createDepartment, { isLoading: creating }] =
    useCreateRoleDepartmentMutation();
  const [updateDepartment, { isLoading: updating }] =
    useUpdateRoleDepartmentMutation();

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: "",
      label: "",
      shortName: "",
      description: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setShortNameManual(true);
      form.reset({
        name: editing.name,
        label: editing.label,
        shortName: editing.shortName ?? "",
        description: editing.description ?? "",
        isActive: editing.isActive ?? true,
      });
    } else {
      setShortNameManual(false);
      form.reset({
        name: "",
        label: "",
        shortName: "",
        description: "",
        isActive: true,
      });
    }
  }, [open, editing, form]);

  const onSubmit = async (values: DepartmentFormValues) => {
    try {
      let saved: CatalogRoleDepartment;
      if (editing) {
        saved = await updateDepartment({
          id: editing.id,
          body: values,
        }).unwrap();
        toast.success("Department updated");
      } else {
        saved = await createDepartment(values).unwrap();
        toast.success("Department created");
      }
      onOpenChange(false);
      onSuccess?.(saved);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to save department"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm sm:max-w-lg">
        <DialogHeader className="space-y-0 border-b border-border bg-gradient-to-r from-accent-50/80 via-card to-card px-6 py-5 text-left dark:from-muted/40">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 ring-1 ring-accent-200/60 dark:!bg-muted/40 dark:ring-border">
              {editing ? (
                <Pencil
                  className="h-5 w-5 text-accent-600 dark:text-accent-400"
                  aria-hidden
                />
              ) : (
                <Building2
                  className="h-5 w-5 text-accent-600 dark:text-accent-400"
                  aria-hidden
                />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                {editing ? "Edit department" : "Create department"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Groups role catalog entries (e.g. Emergency Department).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="rd-label" className="text-sm font-medium">
                  Label <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rd-label"
                  placeholder="e.g. Emergency Department"
                  className={cn("h-11 rounded-xl", settingsFieldClass)}
                  aria-invalid={Boolean(form.formState.errors.label)}
                  {...form.register("label", {
                    onChange: (e) => {
                      if (!editing) {
                        const value = e.target.value;
                        form.setValue("name", labelToSlug(value), {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        if (!shortNameManual) {
                          form.setValue("shortName", labelToShortName(value), {
                            shouldDirty: true,
                          });
                        }
                      }
                    },
                  })}
                />
                {form.formState.errors.label && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.label.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="rd-name" className="text-sm font-medium">
                    Name (slug) <span className="text-destructive">*</span>
                  </Label>
                  {!editing && form.watch("name") ? (
                    <Badge className="max-w-[12rem] truncate border-accent-200 bg-accent-50 font-mono text-[11px] text-accent-700 dark:!border-border dark:!bg-muted/40 dark:text-accent-300">
                      {form.watch("name")}
                    </Badge>
                  ) : null}
                </div>
                <Input
                  id="rd-name"
                  placeholder="auto-generated from label"
                  className={cn(
                    "h-11 rounded-xl font-mono text-sm",
                    settingsFieldClass,
                    !editing && "bg-muted/40",
                  )}
                  readOnly={!editing}
                  aria-invalid={Boolean(form.formState.errors.name)}
                  aria-describedby="rd-name-hint"
                  {...form.register("name")}
                />
                <p id="rd-name-hint" className="text-xs text-muted-foreground">
                  {editing
                    ? "Stable identifier used in the catalog. Change carefully."
                    : "Auto-generated lowercase slug from the label."}
                </p>
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="rd-short" className="text-sm font-medium">
                    Short name
                  </Label>
                  {!editing && form.watch("shortName") ? (
                    <Badge className="border-accent-200 bg-accent-50 font-mono text-[11px] text-accent-700 dark:!border-border dark:!bg-muted/40 dark:text-accent-300">
                      {form.watch("shortName")}
                    </Badge>
                  ) : null}
                </div>
                <Input
                  id="rd-short"
                  placeholder="3-letter code"
                  maxLength={3}
                  className={cn(
                    "h-11 max-w-[8rem] rounded-xl font-mono uppercase tracking-wider",
                    settingsFieldClass,
                  )}
                  aria-describedby="rd-short-hint"
                  {...form.register("shortName", {
                    onChange: () => {
                      if (!editing) setShortNameManual(true);
                    },
                  })}
                />
                <p id="rd-short-hint" className="text-xs text-muted-foreground">
                  Auto-filled from the label — you can edit it anytime.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="rd-desc" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="rd-desc"
                  rows={3}
                  placeholder="Optional short description of this department"
                  className={cn(
                    "min-h-[5.5rem] resize-none rounded-xl",
                    settingsFieldClass,
                  )}
                  {...form.register("description")}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3 dark:!bg-muted/15 sm:col-span-2">
                <div className="min-w-0 space-y-0.5">
                  <Label
                    htmlFor="rd-active"
                    className="text-sm font-medium text-foreground"
                  >
                    Active
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive departments stay in history but cannot be newly
                    assigned.
                  </p>
                </div>
                <Switch
                  id="rd-active"
                  checked={form.watch("isActive") ?? true}
                  onCheckedChange={(checked) =>
                    form.setValue("isActive", checked)
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-muted/20 px-6 py-4 dark:!bg-muted/10 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || updating}
              className="h-10 gap-2 rounded-xl bg-accent-600 shadow-sm hover:bg-accent-700 dark:bg-accent-600 dark:hover:bg-accent-500"
            >
              {(creating || updating) && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              {editing ? "Save changes" : "Create department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
