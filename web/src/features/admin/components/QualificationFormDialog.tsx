import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  useCreateQualificationMutation,
  useUpdateQualificationMutation,
  type CatalogQualification,
  type QualificationLevel,
} from "../api/catalogSettingsApi";

export const QUALIFICATION_LEVELS = [
  "CERTIFICATE",
  "DIPLOMA",
  "BACHELOR",
  "MASTER",
  "DOCTORATE",
] as const;

export const qualificationFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  shortName: z.string().trim().optional(),
  level: z.enum(QUALIFICATION_LEVELS),
  field: z.string().trim().min(1, "Field is required"),
  program: z.string().trim().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  aliases: z
    .array(
      z.object({
        alias: z.string().trim().min(1, "Alias is required"),
        isCommon: z.boolean().optional(),
      }),
    )
    .optional(),
});

export type QualificationFormValues = z.infer<typeof qualificationFormSchema>;

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

function levelLabel(level: QualificationLevel): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

export interface QualificationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: CatalogQualification | null;
  onSuccess?: (qualification: CatalogQualification) => void;
}

export function QualificationFormDialog({
  open,
  onOpenChange,
  editing = null,
  onSuccess,
}: QualificationFormDialogProps) {
  const [createQualification, { isLoading: creating }] =
    useCreateQualificationMutation();
  const [updateQualification, { isLoading: updating }] =
    useUpdateQualificationMutation();

  const form = useForm<QualificationFormValues>({
    resolver: zodResolver(qualificationFormSchema),
    defaultValues: {
      name: "",
      shortName: "",
      level: "BACHELOR",
      field: "",
      program: "",
      description: "",
      isActive: true,
      aliases: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "aliases",
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        shortName: editing.shortName ?? "",
        level: editing.level,
        field: editing.field,
        program: editing.program ?? "",
        description: editing.description ?? "",
        isActive: editing.isActive ?? true,
        aliases:
          editing.aliases?.map((alias) => ({
            alias: alias.alias,
            isCommon: alias.isCommon,
          })) ?? [],
      });
    } else {
      form.reset({
        name: "",
        shortName: "",
        level: "BACHELOR",
        field: "",
        program: "",
        description: "",
        isActive: true,
        aliases: [],
      });
    }
  }, [open, editing, form]);

  const onSubmit = async (values: QualificationFormValues) => {
    const aliases = (values.aliases ?? [])
      .map((item) => ({
        alias: item.alias.trim(),
        isCommon: item.isCommon ?? false,
      }))
      .filter((item) => item.alias.length > 0);

    const body = {
      name: values.name.trim(),
      shortName: values.shortName?.trim() || undefined,
      level: values.level,
      field: values.field.trim(),
      program: values.program?.trim() || undefined,
      description: values.description?.trim() || undefined,
      isActive: values.isActive ?? true,
      aliases,
    };

    try {
      if (editing) {
        const updated = await updateQualification({
          id: editing.id,
          body,
        }).unwrap();
        toast.success("Qualification updated");
        onOpenChange(false);
        onSuccess?.(updated);
      } else {
        const created = await createQualification(body).unwrap();
        toast.success("Qualification created");
        onOpenChange(false);
        onSuccess?.(created);
      }
    } catch (error) {
      toast.error(errorMessage(error, "Failed to save qualification"));
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
                <GraduationCap
                  className="h-5 w-5 text-primary-600 dark:text-primary-400"
                  aria-hidden
                />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                {editing ? "Edit qualification" : "Create qualification"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Catalog entry used for candidate education and project
                requirements.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="max-h-[min(60vh,32rem)] space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="qual-name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="qual-name"
                  placeholder="e.g. Bachelor of Science in Nursing (BSc Nursing)"
                  className={cn("h-11 rounded-xl", settingsFieldClass)}
                  aria-invalid={Boolean(form.formState.errors.name)}
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qual-short" className="text-sm font-medium">
                  Short name
                </Label>
                <Input
                  id="qual-short"
                  placeholder="e.g. BSc Nursing"
                  className={cn("h-11 rounded-xl", settingsFieldClass)}
                  {...form.register("shortName")}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Level <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch("level")}
                  onValueChange={(value) =>
                    form.setValue("level", value as QualificationLevel, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger
                    className={cn("h-11 rounded-xl", settingsFieldClass)}
                    aria-label="Qualification level"
                  >
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALIFICATION_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {levelLabel(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.level && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.level.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="qual-field" className="text-sm font-medium">
                  Field <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="qual-field"
                  placeholder="e.g. Nursing"
                  className={cn("h-11 rounded-xl", settingsFieldClass)}
                  aria-invalid={Boolean(form.formState.errors.field)}
                  {...form.register("field")}
                />
                {form.formState.errors.field && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.field.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="qual-program" className="text-sm font-medium">
                  Program
                </Label>
                <Input
                  id="qual-program"
                  placeholder="e.g. Bachelor of Science"
                  className={cn("h-11 rounded-xl", settingsFieldClass)}
                  {...form.register("program")}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="qual-desc" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="qual-desc"
                  rows={3}
                  placeholder="Optional short description"
                  className={cn(
                    "min-h-[5.5rem] resize-none rounded-xl",
                    settingsFieldClass,
                  )}
                  {...form.register("description")}
                />
              </div>

              <div className="space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium">Aliases</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg"
                    onClick={() => append({ alias: "", isCommon: false })}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add alias
                  </Button>
                </div>
                {fields.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Optional alternative names used for matching (e.g. RN).
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {fields.map((field, index) => (
                      <li
                        key={field.id}
                        className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-2 dark:!bg-muted/15"
                      >
                        <Input
                          placeholder="Alias"
                          className={cn("h-10 rounded-lg", settingsFieldClass)}
                          aria-label={`Alias ${index + 1}`}
                          {...form.register(`aliases.${index}.alias`)}
                        />
                        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <Checkbox
                            checked={Boolean(form.watch(`aliases.${index}.isCommon`))}
                            onCheckedChange={(checked) =>
                              form.setValue(
                                `aliases.${index}.isCommon`,
                                checked === true,
                                { shouldDirty: true },
                              )
                            }
                            aria-label={`Common alias ${index + 1}`}
                          />
                          Common
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                          aria-label={`Remove alias ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {form.formState.errors.aliases && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.aliases.message ??
                      form.formState.errors.aliases.root?.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3 dark:!bg-muted/15 sm:col-span-2">
                <div className="min-w-0 space-y-0.5">
                  <Label
                    htmlFor="qual-active"
                    className="text-sm font-medium text-foreground"
                  >
                    Active
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive qualifications stay in history but cannot be newly
                    assigned.
                  </p>
                </div>
                <Switch
                  id="qual-active"
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
              {editing ? "Save changes" : "Create qualification"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
