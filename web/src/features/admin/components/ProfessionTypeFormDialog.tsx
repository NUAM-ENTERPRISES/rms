import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Pencil, Stethoscope } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { settingsFieldClass } from "./settingsCardUi";
import { labelToSlug } from "./DepartmentFormDialog";
import {
  useCreateProfessionTypeMutation,
  useUpdateProfessionTypeMutation,
  type CatalogProfessionType,
  type ProfessionSector,
} from "../api/catalogSettingsApi";

export const professionTypeFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  label: z.string().trim().min(1, "Label is required"),
  description: z.string().optional(),
  sector: z.enum(["HEALTHCARE", "NON_HEALTH_CARE"]).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type ProfessionTypeFormValues = z.infer<typeof professionTypeFormSchema>;

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

export interface ProfessionTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: CatalogProfessionType | null;
  /** Prefills sector when creating (e.g. from project sector). */
  defaultSector?: ProfessionSector | null;
  onSuccess?: (profession: CatalogProfessionType) => void;
}

export function ProfessionTypeFormDialog({
  open,
  onOpenChange,
  editing = null,
  defaultSector = null,
  onSuccess,
}: ProfessionTypeFormDialogProps) {
  const [createProfession, { isLoading: creating }] =
    useCreateProfessionTypeMutation();
  const [updateProfession, { isLoading: updating }] =
    useUpdateProfessionTypeMutation();

  const form = useForm<ProfessionTypeFormValues>({
    resolver: zodResolver(professionTypeFormSchema),
    defaultValues: {
      name: "",
      label: "",
      description: "",
      sector: defaultSector ?? null,
      sortOrder: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        label: editing.label,
        description: editing.description ?? "",
        sector: editing.sector ?? null,
        sortOrder: editing.sortOrder ?? 0,
        isActive: editing.isActive ?? true,
      });
    } else {
      form.reset({
        name: "",
        label: "",
        description: "",
        sector: defaultSector ?? null,
        sortOrder: 0,
        isActive: true,
      });
    }
  }, [open, editing, defaultSector, form]);

  const onSubmit = async (values: ProfessionTypeFormValues) => {
    try {
      if (editing) {
        const updated = await updateProfession({
          id: editing.id,
          body: values,
        }).unwrap();
        toast.success("Profession type updated");
        onOpenChange(false);
        onSuccess?.(updated);
      } else {
        const created = await createProfession(values).unwrap();
        toast.success("Profession type created");
        onOpenChange(false);
        onSuccess?.(created);
      }
    } catch (error) {
      toast.error(errorMessage(error, "Failed to save profession type"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm sm:max-w-lg">
        <DialogHeader className="space-y-0 border-b border-border bg-gradient-to-r from-primary-50/80 via-card to-card px-6 py-5 text-left dark:from-muted/40">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 ring-1 ring-primary-200/60 dark:!bg-muted/40 dark:ring-border">
              {editing ? (
                <Pencil
                  className="h-5 w-5 text-primary-600 dark:text-primary-400"
                  aria-hidden
                />
              ) : (
                <Stethoscope
                  className="h-5 w-5 text-primary-600 dark:text-primary-400"
                  aria-hidden
                />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                {editing ? "Edit profession type" : "Create profession type"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Links candidates and role catalog entries (e.g. Nurse, Doctor).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pt-label" className="text-sm font-medium">
                  Label <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pt-label"
                  placeholder="e.g. Staff Nurse"
                  className={cn("h-11 rounded-xl", settingsFieldClass)}
                  aria-invalid={Boolean(form.formState.errors.label)}
                  {...form.register("label", {
                    onChange: (e) => {
                      if (!editing) {
                        form.setValue("name", labelToSlug(e.target.value), {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
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
                  <Label htmlFor="pt-name" className="text-sm font-medium">
                    Name (slug) <span className="text-destructive">*</span>
                  </Label>
                  {!editing && form.watch("name") ? (
                    <Badge className="max-w-[12rem] truncate border-primary-200 bg-primary-50 font-mono text-[11px] text-primary-700 dark:!border-border dark:!bg-muted/40 dark:text-primary-300">
                      {form.watch("name")}
                    </Badge>
                  ) : null}
                </div>
                <Input
                  id="pt-name"
                  placeholder="auto-generated from label"
                  className={cn(
                    "h-11 rounded-xl font-mono text-sm",
                    settingsFieldClass,
                    !editing && "bg-muted/40",
                  )}
                  readOnly={!editing}
                  aria-invalid={Boolean(form.formState.errors.name)}
                  aria-describedby="pt-name-hint"
                  {...form.register("name")}
                />
                <p id="pt-name-hint" className="text-xs text-muted-foreground">
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
                <Label className="text-sm font-medium">
                  Sector <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch("sector") ?? undefined}
                  onValueChange={(v) =>
                    form.setValue("sector", v as ProfessionSector, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger
                    className={cn("h-11 rounded-xl", settingsFieldClass)}
                  >
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HEALTHCARE">Healthcare</SelectItem>
                    <SelectItem value="NON_HEALTH_CARE">
                      Non-healthcare
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pt-desc" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="pt-desc"
                  rows={3}
                  placeholder="Optional short description of this profession type"
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
                    htmlFor="pt-active"
                    className="text-sm font-medium text-foreground"
                  >
                    Active
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive types stay in history but cannot be newly assigned.
                  </p>
                </div>
                <Switch
                  id="pt-active"
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
              className="h-10 gap-2 rounded-xl bg-primary-600 shadow-sm hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500"
            >
              {(creating || updating) && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              {editing ? "Save changes" : "Create profession"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
