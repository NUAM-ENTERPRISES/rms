import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Briefcase, Loader2, Pencil, Plus } from "lucide-react";

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
import { useGetRoleDepartmentsQuery } from "@/features/projects";
import { cn } from "@/lib/utils";
import { settingsFieldClass } from "./settingsCardUi";
import { DepartmentFormDialog, labelToShortName, labelToSlug } from "./DepartmentFormDialog";
import {
  useCreateRoleCatalogMutation,
  useGetAdminProfessionTypesQuery,
  useUpdateRoleCatalogMutation,
  type CatalogRoleCatalog,
  type ProfessionSector,
} from "../api/catalogSettingsApi";

export const roleCatalogFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  label: z.string().trim().min(1, "Label is required"),
  shortName: z.string().optional(),
  description: z.string().optional(),
  roleDepartmentId: z.string().optional().nullable(),
  professionTypeId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type RoleCatalogFormValues = z.infer<typeof roleCatalogFormSchema>;

const NONE_VALUE = "__none__";

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

export interface RoleCatalogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: CatalogRoleCatalog | null;
  defaultProfessionTypeId?: string | null;
  professionSector?: ProfessionSector;
  onSuccess?: (role: CatalogRoleCatalog) => void;
}

export function RoleCatalogFormDialog({
  open,
  onOpenChange,
  editing = null,
  defaultProfessionTypeId = null,
  professionSector,
  onSuccess,
}: RoleCatalogFormDialogProps) {
  const [shortNameManual, setShortNameManual] = useState(false);
  const [departmentFormOpen, setDepartmentFormOpen] = useState(false);
  const [createRole, { isLoading: creating }] = useCreateRoleCatalogMutation();
  const [updateRole, { isLoading: updating }] = useUpdateRoleCatalogMutation();

  const { data: professionsData } = useGetAdminProfessionTypesQuery(
    professionSector ? { sector: professionSector } : undefined,
  );
  const { data: allProfessionsData } = useGetAdminProfessionTypesQuery(
    undefined,
    { skip: !professionSector },
  );
  const { data: departmentsData } = useGetRoleDepartmentsQuery({
    includeRoles: false,
    page: 1,
    limit: 100,
  });

  const form = useForm<RoleCatalogFormValues>({
    resolver: zodResolver(roleCatalogFormSchema),
    defaultValues: {
      name: "",
      label: "",
      shortName: "",
      description: "",
      roleDepartmentId: null,
      professionTypeId: null,
      isActive: true,
    },
  });

  const professions = professionsData?.professionTypes ?? [];
  const allProfessions = allProfessionsData?.professionTypes ?? professions;
  const departments = departmentsData?.data?.departments ?? [];

  const selectedProfessionTypeId = form.watch("professionTypeId");

  const activeProfessions = useMemo(() => {
    const list = professions.filter((p) => p.isActive !== false);
    if (
      selectedProfessionTypeId &&
      professionSector &&
      !list.some((p) => p.id === selectedProfessionTypeId)
    ) {
      const outside = allProfessions.find(
        (p) => p.id === selectedProfessionTypeId,
      );
      if (outside) return [outside, ...list];
    }
    return list;
  }, [
    professions,
    allProfessions,
    professionSector,
    selectedProfessionTypeId,
  ]);

  const activeDepartments = useMemo(
    () => departments.filter((d) => d.isActive !== false),
    [departments],
  );

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setShortNameManual(true);
      form.reset({
        name: editing.name,
        label: editing.label,
        shortName: editing.shortName ?? "",
        description: editing.description ?? "",
        roleDepartmentId: editing.roleDepartmentId ?? null,
        professionTypeId: editing.professionTypeId ?? null,
        isActive: editing.isActive ?? true,
      });
    } else {
      setShortNameManual(false);
      form.reset({
        name: "",
        label: "",
        shortName: "",
        description: "",
        roleDepartmentId: null,
        professionTypeId: defaultProfessionTypeId ?? null,
        isActive: true,
      });
    }
  }, [open, editing, defaultProfessionTypeId, form]);

  const onSubmit = async (values: RoleCatalogFormValues) => {
    const payload = {
      ...values,
      roleDepartmentId: values.roleDepartmentId || null,
      professionTypeId: values.professionTypeId || null,
    };
    try {
      let saved: CatalogRoleCatalog;
      if (editing) {
        saved = await updateRole({ id: editing.id, body: payload }).unwrap();
        toast.success("Role catalog entry updated");
      } else {
        saved = await createRole(payload).unwrap();
        toast.success("Role catalog entry created");
      }
      onOpenChange(false);
      onSuccess?.(saved);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to save role catalog entry"));
    }
  };

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && departmentFormOpen) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm sm:max-w-xl">
        <DialogHeader className="space-y-0 border-b border-border bg-gradient-to-r from-primary-50/80 via-card to-card px-6 py-5 text-left dark:from-muted/40">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 ring-1 ring-primary-200/60 dark:!bg-muted/40 dark:ring-border">
              {editing ? (
                <Pencil
                  className="h-5 w-5 text-primary-600 dark:text-primary-400"
                  aria-hidden
                />
              ) : (
                <Briefcase
                  className="h-5 w-5 text-primary-600 dark:text-primary-400"
                  aria-hidden
                />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                {editing ? "Edit role catalog entry" : "Create role catalog entry"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Optionally link a profession type and department.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="max-h-[min(70vh,36rem)] space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="rc-label" className="text-sm font-medium">
                  Label <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rc-label"
                  placeholder="e.g. Emergency Staff Nurse"
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
                  <Label htmlFor="rc-name" className="text-sm font-medium">
                    Name (slug) <span className="text-destructive">*</span>
                  </Label>
                  {!editing && form.watch("name") ? (
                    <Badge className="max-w-[12rem] truncate border-primary-200 bg-primary-50 font-mono text-[11px] text-primary-700 dark:!border-border dark:!bg-muted/40 dark:text-primary-300">
                      {form.watch("name")}
                    </Badge>
                  ) : null}
                </div>
                <Input
                  id="rc-name"
                  placeholder="auto-generated from label"
                  className={cn(
                    "h-11 rounded-xl font-mono text-sm",
                    settingsFieldClass,
                    !editing && "bg-muted/40",
                  )}
                  readOnly={!editing}
                  aria-invalid={Boolean(form.formState.errors.name)}
                  aria-describedby="rc-name-hint"
                  {...form.register("name")}
                />
                <p id="rc-name-hint" className="text-xs text-muted-foreground">
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

              <div className="space-y-2">
                <Label className="text-sm font-medium">Profession type</Label>
                <Select
                  value={form.watch("professionTypeId") ?? NONE_VALUE}
                  onValueChange={(v) =>
                    form.setValue(
                      "professionTypeId",
                      v === NONE_VALUE ? null : v,
                    )
                  }
                >
                  <SelectTrigger
                    className={cn("h-11 rounded-xl", settingsFieldClass)}
                  >
                    <SelectValue placeholder="Select profession" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {activeProfessions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium">Department</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 rounded-lg"
                    onClick={() => setDepartmentFormOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add
                  </Button>
                </div>
                <Select
                  value={form.watch("roleDepartmentId") ?? NONE_VALUE}
                  onValueChange={(v) =>
                    form.setValue(
                      "roleDepartmentId",
                      v === NONE_VALUE ? null : v,
                    )
                  }
                >
                  <SelectTrigger
                    className={cn("h-11 rounded-xl", settingsFieldClass)}
                  >
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {activeDepartments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="rc-short" className="text-sm font-medium">
                    Short name
                  </Label>
                  {!editing && form.watch("shortName") ? (
                    <Badge className="border-primary-200 bg-primary-50 font-mono text-[11px] text-primary-700 dark:!border-border dark:!bg-muted/40 dark:text-primary-300">
                      {form.watch("shortName")}
                    </Badge>
                  ) : null}
                </div>
                <Input
                  id="rc-short"
                  placeholder="3-letter code"
                  maxLength={3}
                  className={cn(
                    "h-11 max-w-[8rem] rounded-xl font-mono uppercase tracking-wider",
                    settingsFieldClass,
                  )}
                  aria-describedby="rc-short-hint"
                  {...form.register("shortName", {
                    onChange: () => {
                      if (!editing) setShortNameManual(true);
                    },
                  })}
                />
                <p id="rc-short-hint" className="text-xs text-muted-foreground">
                  Auto-filled from the label — you can edit it anytime.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="rc-desc" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="rc-desc"
                  rows={3}
                  placeholder="Optional short description of this role"
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
                    htmlFor="rc-active"
                    className="text-sm font-medium text-foreground"
                  >
                    Active
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive roles stay in history but cannot be newly assigned.
                  </p>
                </div>
                <Switch
                  id="rc-active"
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
              {editing ? "Save changes" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <DepartmentFormDialog
      open={departmentFormOpen}
      onOpenChange={setDepartmentFormOpen}
      onSuccess={(department) => {
        form.setValue("roleDepartmentId", department.id, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }}
    />
    </>
  );
}
