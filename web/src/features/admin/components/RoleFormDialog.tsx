import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Shield } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  roleFormSchema,
  type RoleFormValues,
} from "@/features/admin/schemas/role-schemas";
import type {
  PermissionCatalogItem,
  Role,
} from "@/features/admin/api/roles";
import { RolePermissionPicker } from "@/features/admin/components/RolePermissionPicker";
import {
  getPermissionAccessLabel,
  getPermissionBadgeClassName,
  getPermissionDescription,
  getPermissionDetail,
  getPermissionLabel,
  isPermissionVisibleInRoleForm,
} from "@/features/admin/utils/permission-display";

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "view";
  role?: Role | null;
  permissions: PermissionCatalogItem[];
  permissionsLoading?: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: RoleFormValues) => void | Promise<void>;
}

export function RoleFormDialog({
  open,
  onOpenChange,
  mode,
  role,
  permissions,
  permissionsLoading = false,
  isSubmitting = false,
  onSubmit,
}: RoleFormDialogProps) {
  const readOnly = mode === "view";
  const [permissionSearch, setPermissionSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCreateValues, setPendingCreateValues] =
    useState<RoleFormValues | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      permissionKeys: [],
    },
  });

  const selectedKeys = watch("permissionKeys") ?? [];
  const roleNameValue = watch("name");

  const hydratedRoleIdRef = useRef<string | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      hydratedRoleIdRef.current = null;
      return;
    }

    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (justOpened) {
      setPermissionSearch("");
      setConfirmOpen(false);
      setPendingCreateValues(null);
    }

    if (mode === "create") {
      if (justOpened) {
        reset({
          name: "",
          description: "",
          permissionKeys: [],
        });
        hydratedRoleIdRef.current = null;
      }
      return;
    }

    if (!role?.id || !role.permissions) return;

    const shouldHydrate =
      justOpened || hydratedRoleIdRef.current !== role.id;

    if (shouldHydrate) {
      reset({
        name: role.name ?? "",
        description: role.description ?? "",
        permissionKeys: role.permissions.filter(
          (key) => key !== "*" && isPermissionVisibleInRoleForm(key),
        ),
      });
      hydratedRoleIdRef.current = role.id;
    }
  }, [open, mode, role?.id, role?.name, role?.description, role?.permissions, reset]);

  const title =
    mode === "create"
      ? "Create role"
      : mode === "edit"
        ? "Edit role"
        : "View role";

  const description =
    mode === "view"
      ? "System roles are read-only. Review what this role can do below."
      : "Name the role, then choose what people with this role can see and do.";

  const permissionsByKey = useMemo(
    () => new Map(permissions.map((item) => [item.key, item])),
    [permissions],
  );

  const roleFormPermissions = useMemo(
    () => permissions.filter((item) => isPermissionVisibleInRoleForm(item.key)),
    [permissions],
  );

  const handleCreateAttempt = handleSubmit((values) => {
    setPendingCreateValues({
      ...values,
      description: values.description?.trim() || undefined,
    });
    setConfirmOpen(true);
  });

  const handleConfirmCreate = async () => {
    if (!pendingCreateValues) return;
    await onSubmit(pendingCreateValues);
    setConfirmOpen(false);
    setPendingCreateValues(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(56rem,95vh)] w-[calc(100vw-1.5rem)] max-w-[90rem] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm sm:max-w-[90rem]">
        <DialogHeader className="shrink-0 space-y-0 border-b border-border bg-gradient-to-r from-muted to-card px-6 py-4 text-left">
          <div className="flex items-center gap-3 pr-8">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
              <Shield className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-base font-bold text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col bg-card"
          onSubmit={handleSubmit(async (values) => {
            if (readOnly) return;
            await onSubmit({
              ...values,
              description: values.description?.trim() || undefined,
            });
          })}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="role-name">
                    Role name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="role-name"
                    placeholder="e.g. Regional Recruiter Lead"
                    disabled={readOnly || isSubmitting}
                    aria-invalid={Boolean(errors.name)}
                    className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card"
                    {...register("name")}
                  />
                  {errors.name ? (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="role-description">Description</Label>
                  <Textarea
                    id="role-description"
                    placeholder="Optional short description of what this role can do"
                    disabled={readOnly || isSubmitting}
                    rows={2}
                    className="min-h-[2.75rem] resize-none rounded-xl border-border bg-muted/30 focus:bg-card"
                    {...register("description")}
                  />
                  {errors.description ? (
                    <p className="text-sm text-destructive">
                      {errors.description.message}
                    </p>
                  ) : null}
                </div>
              </div>

              {errors.permissionKeys ? (
                <p className="text-sm text-destructive">
                  {errors.permissionKeys.message}
                </p>
              ) : null}

              {permissionsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <LoadingSpinner />
                </div>
              ) : (
                <Controller
                  control={control}
                  name="permissionKeys"
                  render={({ field }) => (
                    <RolePermissionPicker
                      permissions={roleFormPermissions}
                      selectedKeys={field.value}
                      onChange={field.onChange}
                      search={permissionSearch}
                      onSearchChange={setPermissionSearch}
                      readOnly={readOnly}
                      disabled={isSubmitting}
                    />
                  )}
                />
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-muted/50 px-6 py-4 sm:justify-between">
            <p className="hidden text-xs text-muted-foreground sm:block">
              {selectedKeys.length > 0
                ? `${selectedKeys.length} action${
                    selectedKeys.length !== 1 ? "s" : ""
                  } selected for this role`
                : "Pick at least one action from the list"}
            </p>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-border hover:bg-muted"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {readOnly ? "Close" : "Cancel"}
              </Button>
              {!readOnly ? (
                mode === "create" ? (
                  <Button
                    type="button"
                    disabled={isSubmitting || permissionsLoading}
                    className="rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                    onClick={() => void handleCreateAttempt()}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner className="mr-2" />
                        Saving…
                      </>
                    ) : (
                      "Create role"
                    )}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting || permissionsLoading}
                    className="rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner className="mr-2" />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                )
              ) : null}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog
        open={confirmOpen}
        onOpenChange={(isOpen) => {
          if (isSubmitting) return;
          setConfirmOpen(isOpen);
          if (!isOpen) setPendingCreateValues(null);
        }}
      >
        <DialogContent className="flex h-[min(52rem,94vh)] w-[calc(100vw-1.5rem)] max-w-[80rem] flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm sm:max-w-[80rem]">
          <DialogHeader className="space-y-0 border-b border-border bg-gradient-to-r from-muted to-card px-6 py-5 text-left">
            <div className="flex items-start gap-3 pr-8">
              <div className="shrink-0 rounded-xl bg-blue-600/10 p-2.5 text-blue-600 shadow-sm dark:text-blue-300">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              </div>
              <div className="space-y-1.5">
                <DialogTitle className="text-lg font-bold text-foreground">
                  Confirm role creation
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Check the name and the access below before you create this
                  role.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-1">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Role name
                  </p>
                  <p className="mt-1.5 break-words text-sm font-semibold text-foreground">
                    {pendingCreateValues?.name || roleNameValue || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {pendingCreateValues?.description || "No description provided"}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Actions selected
                  </p>
                  <p className="mt-1.5 text-2xl font-bold text-foreground">
                    {pendingCreateValues?.permissionKeys.length ?? 0}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    What they will be able to do
                  </p>
                  <Badge
                    variant="outline"
                    className="rounded-lg bg-card text-[10px] font-semibold tabular-nums"
                  >
                    {pendingCreateValues?.permissionKeys.length ?? 0} selected
                  </Badge>
                </div>
                <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                  {pendingCreateValues?.permissionKeys.map((key) => {
                    const item = permissionsByKey.get(key);
                    const label = getPermissionLabel(key);
                    const description = getPermissionDescription(
                      key,
                      item?.description,
                    );
                    const detail = getPermissionDetail(key, item?.description);
                    const access = getPermissionAccessLabel(key);
                    const badgeClass = getPermissionBadgeClassName(key);
                    return (
                      <div
                        key={key}
                        className="rounded-lg border border-border bg-card px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">
                            {label}
                          </p>
                          <span
                            className={cn(
                              "inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                              badgeClass,
                            )}
                          >
                            {access}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {description ?? detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-muted/50 px-6 py-4 sm:justify-between">
            <p className="hidden text-xs text-muted-foreground sm:block">
              Please check these details before creating the role.
            </p>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-border hover:bg-muted"
              onClick={() => {
                setConfirmOpen(false);
                setPendingCreateValues(null);
              }}
              disabled={isSubmitting}
            >
              Back to edit
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              disabled={isSubmitting}
              onClick={() => void handleConfirmCreate()}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Creating...
                </>
              ) : (
                "Confirm & Create role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
