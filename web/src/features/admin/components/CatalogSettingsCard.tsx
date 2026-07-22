import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { useDebounce } from "@/hooks";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCan } from "@/hooks/useCan";
import { useGetRoleDepartmentsQuery } from "@/features/projects";
import { cn } from "@/lib/utils";
import {
  SettingsCardShell,
  SettingsFormPanel,
  SettingsLoadingCard,
  settingsFieldClass,
} from "./settingsCardUi";
import {
  useCreateProfessionTypeMutation,
  useCreateRoleCatalogMutation,
  useCreateRoleDepartmentMutation,
  useGetAdminProfessionTypesQuery,
  useGetAdminRoleCatalogQuery,
  useSoftDeleteProfessionTypeMutation,
  useSoftDeleteRoleCatalogMutation,
  useSoftDeleteRoleDepartmentMutation,
  useUpdateProfessionTypeMutation,
  useUpdateRoleCatalogMutation,
  useUpdateRoleDepartmentMutation,
  type CatalogProfessionType,
  type CatalogRoleCatalog,
  type CatalogRoleDepartment,
  type ProfessionSector,
} from "../api/catalogSettingsApi";

const PAGE_SIZE = 10;

const professionSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  label: z.string().trim().min(1, "Label is required"),
  description: z.string().optional(),
  sector: z.enum(["HEALTHCARE", "NON_HEALTH_CARE"]).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const departmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  label: z.string().trim().min(1, "Label is required"),
  shortName: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const roleSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  label: z.string().trim().min(1, "Label is required"),
  shortName: z.string().optional(),
  description: z.string().optional(),
  roleDepartmentId: z.string().optional().nullable(),
  professionTypeId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

type ProfessionForm = z.infer<typeof professionSchema>;
type DepartmentForm = z.infer<typeof departmentSchema>;
type RoleForm = z.infer<typeof roleSchema>;

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

const NONE_VALUE = "__none__";

const CATALOG_GRID_CLASS =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

type CatalogAccent = "primary" | "accent";

function CatalogGridCard({
  index,
  label,
  slug,
  slugBadgeClassName,
  description,
  badges,
  accent,
  canManage,
  onEdit,
  onDelete,
  showDelete = true,
}: {
  index: number;
  label: string;
  slug: string;
  slugBadgeClassName: string;
  description?: string | null;
  badges?: ReactNode;
  accent: CatalogAccent;
  canManage: boolean;
  onEdit: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}) {
  const indexStyles =
    accent === "primary"
      ? "bg-primary-50 text-primary-700 dark:!bg-muted/40 dark:text-primary-300"
      : "bg-accent-50 text-accent-700 dark:!bg-muted/40 dark:text-accent-300";
  const hoverBorder =
    accent === "primary"
      ? "hover:border-primary-200 dark:hover:border-border"
      : "hover:border-accent-200 dark:hover:border-border";
  const editBtnStyles =
    accent === "primary"
      ? "text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:!bg-muted/40"
      : "text-accent-700 hover:bg-accent-50 dark:text-accent-300 dark:hover:!bg-muted/40";

  return (
    <li
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md dark:!border-border dark:bg-card dark:hover:border-border/80 dark:hover:shadow-none",
        hoverBorder,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
              indexStyles,
            )}
          >
            {index}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{label}</p>
            <Badge className={cn("mt-1 max-w-full truncate", slugBadgeClassName)}>
              {slug}
            </Badge>
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", editBtnStyles)}
              aria-label={`Edit ${label}`}
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {showDelete && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-danger-600 hover:bg-danger-50 dark:hover:!bg-muted/40"
                aria-label={`Delete ${label}`}
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {(badges || description) && (
        <div className="mt-3 flex flex-1 flex-col gap-2">
          {badges && <div className="flex flex-wrap gap-1.5">{badges}</div>}
          {description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function CatalogPagination({
  pagination,
  onPageChange,
  isFetching,
  accentClassName,
}: {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
  accentClassName: string;
}) {
  const { page, totalPages, total, limit } = pagination;
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border px-4 py-3",
        accentClassName,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{from}</span>–
        <span className="font-semibold text-foreground">{to}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={settingsFieldClass}
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Prev
        </Button>
        <span className="min-w-[5.5rem] text-center text-sm font-medium text-foreground">
          Page {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={settingsFieldClass}
          disabled={page >= totalPages || isFetching}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export function CatalogSettingsCard() {
  const canManage = useCan("manage:system_config");
  const [subTab, setSubTab] = useState("professions");

  return (
    <SettingsCardShell
      accent="primary"
      icon={Briefcase}
      title="Master Catalog"
      description="Create profession types, departments, and roles — then link them (e.g. Nurse → Emergency → Emergency Staff Nurse)."
      canManage={false}
      isEditing={false}
      showRefresh={false}
    >
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="mb-6 grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1.5 dark:!bg-muted/20">
          <TabsTrigger
            value="professions"
            className="gap-2 rounded-lg py-2.5 text-muted-foreground data-[state=active]:bg-primary-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=inactive]:text-muted-foreground"
          >
            <Stethoscope className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Professions</span>
            <span className="sm:hidden">Prof.</span>
          </TabsTrigger>
          <TabsTrigger
            value="departments"
            className="gap-2 rounded-lg py-2.5 text-muted-foreground data-[state=active]:bg-accent-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=inactive]:text-muted-foreground"
          >
            <Building2 className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Departments</span>
            <span className="sm:hidden">Dept.</span>
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="gap-2 rounded-lg py-2.5 text-muted-foreground data-[state=active]:bg-primary-700 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=inactive]:text-muted-foreground"
          >
            <Briefcase className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Roles</span>
            <span className="sm:hidden">Roles</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="professions" className="mt-0 focus-visible:outline-none">
          <ProfessionTypesSection canManage={canManage} />
        </TabsContent>
        <TabsContent value="departments" className="mt-0 focus-visible:outline-none">
          <DepartmentsSection canManage={canManage} />
        </TabsContent>
        <TabsContent value="roles" className="mt-0 focus-visible:outline-none">
          <RoleCatalogSection canManage={canManage} />
        </TabsContent>
      </Tabs>
    </SettingsCardShell>
  );
}

type SectorFilter = "ALL" | ProfessionSector;

function ProfessionTypesSection({ canManage }: { canManage: boolean }) {
  const [page, setPage] = useState(1);
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProfessionType | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<CatalogProfessionType | null>(null);
  const { data, isLoading, isFetching } = useGetAdminProfessionTypesQuery({
    ...(sectorFilter !== "ALL" ? { sector: sectorFilter } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const [createProfession, { isLoading: creating }] =
    useCreateProfessionTypeMutation();
  const [updateProfession, { isLoading: updating }] =
    useUpdateProfessionTypeMutation();
  const [softDeleteProfession, { isLoading: deleting }] =
    useSoftDeleteProfessionTypeMutation();

  const allItems = data?.professionTypes ?? [];
  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return allItems.slice(start, start + PAGE_SIZE);
  }, [allItems, page]);

  useEffect(() => {
    setPage(1);
  }, [sectorFilter, debouncedSearch]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const form = useForm<ProfessionForm>({
    resolver: zodResolver(professionSchema),
    defaultValues: {
      name: "",
      label: "",
      description: "",
      sector: "HEALTHCARE",
      sortOrder: 0,
      isActive: true,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: "",
      label: "",
      description: "",
      sector: "HEALTHCARE",
      sortOrder: 0,
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (item: CatalogProfessionType) => {
    setEditing(item);
    form.reset({
      name: item.name,
      label: item.label,
      description: item.description ?? "",
      sector: item.sector ?? null,
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
    });
    setOpen(true);
  };

  const onSubmit = async (values: ProfessionForm) => {
    try {
      if (editing) {
        await updateProfession({ id: editing.id, body: values }).unwrap();
        toast.success("Profession type updated");
      } else {
        await createProfession(values).unwrap();
        toast.success("Profession type created");
      }
      setOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to save profession type"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await softDeleteProfession(pendingDelete.id).unwrap();
      toast.success(`"${pendingDelete.label}" deleted`);
      setPendingDelete(null);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete profession type"));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 dark:!bg-muted/15 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 ring-1 ring-primary-200/60 dark:!bg-muted/40 dark:ring-border">
            <Stethoscope className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Profession types</h3>
            <p className="text-sm text-muted-foreground">
              {allItems.length} total · e.g. Nurse, Doctor, Technician
            </p>
          </div>
        </div>
        {canManage && (
          <Button type="button" size="sm" onClick={openCreate} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" aria-hidden />
            Add profession
          </Button>
        )}
      </div>

      <SettingsFormPanel accent="primary" className="p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search professions..."
              className={cn("pl-9", settingsFieldClass)}
              aria-label="Search professions"
            />
          </div>
          <Select
            value={sectorFilter}
            onValueChange={(v) => setSectorFilter(v as SectorFilter)}
          >
            <SelectTrigger className={cn("w-full sm:w-[220px]", settingsFieldClass)} aria-label="Filter by sector">
              <SelectValue placeholder="Sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sectors</SelectItem>
              <SelectItem value="HEALTHCARE">Healthcare</SelectItem>
              <SelectItem value="NON_HEALTH_CARE">Non-healthcare</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsFormPanel>

      {isLoading ? (
        <LoadingState label="Loading profession types..." />
      ) : pageItems.length === 0 ? (
        <EmptyState message="No profession types match your filters." />
      ) : (
        <ul className={CATALOG_GRID_CLASS}>
          {pageItems.map((item, index) => (
            <CatalogGridCard
              key={item.id}
              index={(page - 1) * PAGE_SIZE + index + 1}
              label={item.label}
              slug={item.name}
              slugBadgeClassName="border-primary-200 bg-primary-50 text-primary-700 dark:!border-border dark:!bg-muted/40 dark:text-primary-300"
              description={item.description}
              accent="primary"
              canManage={canManage}
              onEdit={() => openEdit(item)}
              onDelete={() => setPendingDelete(item)}
              showDelete={item.isActive !== false}
              badges={
                <>
                  {item.sector === "HEALTHCARE" && (
                    <Badge className="border-success-200 bg-success-50 text-success-700 dark:!border-border dark:!bg-muted/30 dark:text-success-300">
                      Healthcare
                    </Badge>
                  )}
                  {item.sector === "NON_HEALTH_CARE" && (
                    <Badge className="border-primary-200 bg-primary-50 text-primary-600 dark:!border-border dark:!bg-muted/40 dark:text-primary-300">
                      Non-healthcare
                    </Badge>
                  )}
                  {item.isActive === false && (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </>
              }
            />
          ))}
        </ul>
      )}

      <CatalogPagination
        pagination={{
          page,
          limit: PAGE_SIZE,
          total: allItems.length,
          totalPages,
        }}
        onPageChange={setPage}
        isFetching={isFetching}
        accentClassName="border-primary-200/60 bg-primary-50/40 dark:!border-border dark:!bg-muted/20"
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
        variant="destructive"
        title="Delete profession type?"
        description={
          pendingDelete
            ? `"${pendingDelete.label}" will be soft-deleted (marked inactive). This is logged in the audit trail.`
            : ""
        }
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit profession type" : "Create profession type"}
            </DialogTitle>
            <DialogDescription>
              Profession types link candidates and role catalog entries (e.g.
              nurse).
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="pt-name">Name (slug)</Label>
              <Input id="pt-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pt-label">Label</Label>
              <Input id="pt-label" {...form.register("label")} />
              {form.formState.errors.label && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.label.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Sector</Label>
              <Select
                value={form.watch("sector") ?? NONE_VALUE}
                onValueChange={(v) =>
                  form.setValue(
                    "sector",
                    v === NONE_VALUE ? null : (v as ProfessionSector),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  <SelectItem value="HEALTHCARE">Healthcare</SelectItem>
                  <SelectItem value="NON_HEALTH_CARE">Non-healthcare</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pt-desc">Description</Label>
              <Textarea id="pt-desc" {...form.register("description")} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pt-active">Active</Label>
              <Switch
                id="pt-active"
                checked={form.watch("isActive") ?? true}
                onCheckedChange={(checked) =>
                  form.setValue("isActive", checked)
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || updating}
                className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500"
              >
                {(creating || updating) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DepartmentsSection({ canManage }: { canManage: boolean }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRoleDepartment | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<CatalogRoleDepartment | null>(null);
  const { data, isLoading, isFetching } = useGetRoleDepartmentsQuery({
    includeRoles: false,
    page,
    limit: PAGE_SIZE,
  });
  const [createDepartment, { isLoading: creating }] =
    useCreateRoleDepartmentMutation();
  const [updateDepartment, { isLoading: updating }] =
    useUpdateRoleDepartmentMutation();
  const [softDeleteDepartment, { isLoading: deleting }] =
    useSoftDeleteRoleDepartmentMutation();

  const items = data?.data?.departments ?? [];
  const pagination = data?.data?.pagination ?? {
    page,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  const form = useForm<DepartmentForm>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      label: "",
      shortName: "",
      description: "",
      isActive: true,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: "",
      label: "",
      shortName: "",
      description: "",
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (item: CatalogRoleDepartment) => {
    setEditing(item);
    form.reset({
      name: item.name,
      label: item.label,
      shortName: item.shortName ?? "",
      description: item.description ?? "",
      isActive: item.isActive ?? true,
    });
    setOpen(true);
  };

  const onSubmit = async (values: DepartmentForm) => {
    try {
      if (editing) {
        await updateDepartment({ id: editing.id, body: values }).unwrap();
        toast.success("Department updated");
      } else {
        await createDepartment(values).unwrap();
        toast.success("Department created");
        setPage(1);
      }
      setOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to save department"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await softDeleteDepartment(pendingDelete.id).unwrap();
      toast.success(`"${pendingDelete.label}" deleted`);
      setPendingDelete(null);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete department"));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 dark:!bg-muted/15 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 ring-1 ring-accent-200/60 dark:!bg-muted/40 dark:ring-border">
            <Building2 className="h-5 w-5 text-accent-600 dark:text-accent-400" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Departments</h3>
            <p className="text-sm text-muted-foreground">
              {pagination.total} total · e.g. Emergency Department
            </p>
          </div>
        </div>
        {canManage && (
          <Button type="button" size="sm" onClick={openCreate} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" aria-hidden />
            Add department
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState label="Loading departments..." />
      ) : items.length === 0 ? (
        <EmptyState message="No departments yet. Add Emergency Department or others." />
      ) : (
        <ul className={CATALOG_GRID_CLASS}>
          {items.map((item, index) => (
            <CatalogGridCard
              key={item.id}
              index={(page - 1) * PAGE_SIZE + index + 1}
              label={item.label}
              slug={item.name}
              slugBadgeClassName="border-accent-200 bg-accent-50 text-accent-700 dark:!border-border dark:!bg-muted/40 dark:text-accent-300"
              accent="accent"
              canManage={canManage}
              onEdit={() => openEdit(item)}
              onDelete={() => setPendingDelete(item)}
              showDelete={item.isActive !== false}
              badges={
                <>
                  {item.shortName && (
                    <Badge variant="secondary">{item.shortName}</Badge>
                  )}
                  {item.isActive === false && (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </>
              }
            />
          ))}
        </ul>
      )}

      <CatalogPagination
        pagination={{
          page: pagination.page ?? page,
          limit: pagination.limit ?? PAGE_SIZE,
          total: pagination.total ?? 0,
          totalPages: pagination.totalPages ?? 1,
        }}
        onPageChange={setPage}
        isFetching={isFetching}
        accentClassName="border-accent-200/60 bg-accent-50/40 dark:!border-border dark:!bg-muted/20"
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
        variant="destructive"
        title="Delete department?"
        description={
          pendingDelete
            ? `"${pendingDelete.label}" will be soft-deleted (marked inactive). This is logged in the audit trail.`
            : ""
        }
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit department" : "Create department"}
            </DialogTitle>
            <DialogDescription>
              Departments group role catalog entries (e.g. Emergency
              Department).
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="rd-name">Name (slug)</Label>
              <Input id="rd-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rd-label">Label</Label>
              <Input id="rd-label" {...form.register("label")} />
              {form.formState.errors.label && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.label.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rd-short">Short name</Label>
              <Input id="rd-short" {...form.register("shortName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rd-desc">Description</Label>
              <Textarea id="rd-desc" {...form.register("description")} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="rd-active">Active</Label>
              <Switch
                id="rd-active"
                checked={form.watch("isActive") ?? true}
                onCheckedChange={(checked) =>
                  form.setValue("isActive", checked)
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || updating}
                className="bg-accent-600 hover:bg-accent-700 dark:bg-accent-600 dark:hover:bg-accent-500"
              >
                {(creating || updating) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function RoleCatalogSection({ canManage }: { canManage: boolean }) {
  const [page, setPage] = useState(1);
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("ALL");
  const [professionFilter, setProfessionFilter] = useState<string>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRoleCatalog | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<CatalogRoleCatalog | null>(null);

  const { data: rolesData, isLoading, isFetching } = useGetAdminRoleCatalogQuery({
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(sectorFilter !== "ALL" ? { sector: sectorFilter } : {}),
    ...(professionFilter !== "ALL"
      ? { professionTypeId: professionFilter }
      : {}),
  });
  const { data: professionsData } = useGetAdminProfessionTypesQuery();
  const { data: departmentsData } = useGetRoleDepartmentsQuery({
    includeRoles: false,
    page: 1,
    limit: 100,
  });

  const [createRole, { isLoading: creating }] = useCreateRoleCatalogMutation();
  const [updateRole, { isLoading: updating }] = useUpdateRoleCatalogMutation();
  const [softDeleteRole, { isLoading: deleting }] =
    useSoftDeleteRoleCatalogMutation();

  const items = rolesData?.roles ?? [];
  const pagination = rolesData?.pagination ?? {
    page,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };
  const professions = professionsData?.professionTypes ?? [];
  const departments = departmentsData?.data?.departments ?? [];

  useEffect(() => {
    setPage(1);
  }, [sectorFilter, professionFilter, debouncedSearch]);

  const form = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
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

  const activeProfessions = useMemo(
    () => professions.filter((p) => p.isActive !== false),
    [professions],
  );
  const activeDepartments = useMemo(
    () => departments.filter((d) => d.isActive !== false),
    [departments],
  );

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: "",
      label: "",
      shortName: "",
      description: "",
      roleDepartmentId: null,
      professionTypeId: null,
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (item: CatalogRoleCatalog) => {
    setEditing(item);
    form.reset({
      name: item.name,
      label: item.label,
      shortName: item.shortName ?? "",
      description: item.description ?? "",
      roleDepartmentId: item.roleDepartmentId ?? null,
      professionTypeId: item.professionTypeId ?? null,
      isActive: item.isActive ?? true,
    });
    setOpen(true);
  };

  const onSubmit = async (values: RoleForm) => {
    const payload = {
      ...values,
      roleDepartmentId: values.roleDepartmentId || null,
      professionTypeId: values.professionTypeId || null,
    };
    try {
      if (editing) {
        await updateRole({ id: editing.id, body: payload }).unwrap();
        toast.success("Role catalog entry updated");
      } else {
        await createRole(payload).unwrap();
        toast.success("Role catalog entry created");
        setPage(1);
      }
      setOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to save role catalog entry"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await softDeleteRole(pendingDelete.id).unwrap();
      toast.success(`"${pendingDelete.label}" deleted`);
      setPendingDelete(null);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete role catalog entry"));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 dark:!bg-muted/15 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 ring-1 ring-primary-200/60 dark:!bg-muted/40 dark:ring-border">
            <Briefcase className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Role catalog</h3>
            <p className="text-sm text-muted-foreground">
              {pagination.total} total · link profession + optional department
            </p>
          </div>
        </div>
        {canManage && (
          <Button type="button" size="sm" onClick={openCreate} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" aria-hidden />
            Add role
          </Button>
        )}
      </div>

      <SettingsFormPanel accent="primary" className="p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search roles..."
              className={cn("pl-9", settingsFieldClass)}
              aria-label="Search roles"
            />
          </div>
          <Select
            value={sectorFilter}
            onValueChange={(v) => setSectorFilter(v as SectorFilter)}
          >
            <SelectTrigger className={settingsFieldClass} aria-label="Filter by sector">
              <SelectValue placeholder="Sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sectors</SelectItem>
              <SelectItem value="HEALTHCARE">Healthcare</SelectItem>
              <SelectItem value="NON_HEALTH_CARE">Non-healthcare</SelectItem>
            </SelectContent>
          </Select>
          <Select value={professionFilter} onValueChange={setProfessionFilter}>
            <SelectTrigger className={settingsFieldClass} aria-label="Filter by profession type">
              <SelectValue placeholder="Profession type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All professions</SelectItem>
              {activeProfessions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsFormPanel>

      {isLoading ? (
        <LoadingState label="Loading role catalog..." />
      ) : items.length === 0 ? (
        <EmptyState message="No roles match your filters." />
      ) : (
        <ul className={CATALOG_GRID_CLASS}>
          {items.map((item, index) => (
            <CatalogGridCard
              key={item.id}
              index={(page - 1) * PAGE_SIZE + index + 1}
              label={item.label}
              slug={item.name}
              slugBadgeClassName="border-primary-200 bg-primary-50 text-primary-700 dark:!border-border dark:!bg-muted/40 dark:text-primary-300"
              accent="primary"
              canManage={canManage}
              onEdit={() => openEdit(item)}
              onDelete={() => setPendingDelete(item)}
              showDelete={item.isActive !== false}
              badges={
                <>
                  {item.professionType && (
                    <Badge className="border-success-200 bg-success-50 text-success-700 dark:!border-border dark:!bg-muted/30 dark:text-success-300">
                      {item.professionType.label}
                    </Badge>
                  )}
                  {item.professionType?.sector === "HEALTHCARE" && (
                    <Badge className="border-success-200 bg-success-50 text-success-700 dark:!border-border dark:!bg-muted/30 dark:text-success-300">
                      Healthcare
                    </Badge>
                  )}
                  {item.professionType?.sector === "NON_HEALTH_CARE" && (
                    <Badge className="border-primary-200 bg-primary-50 text-primary-600 dark:!border-border dark:!bg-muted/40 dark:text-primary-300">
                      Non-healthcare
                    </Badge>
                  )}
                  {item.roleDepartment && (
                    <Badge className="border-accent-200 bg-accent-50 text-accent-700 dark:!border-border dark:!bg-muted/40 dark:text-accent-300">
                      {item.roleDepartment.label}
                    </Badge>
                  )}
                  {item.isActive === false && (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </>
              }
            />
          ))}
        </ul>
      )}

      <CatalogPagination
        pagination={pagination}
        onPageChange={setPage}
        isFetching={isFetching}
        accentClassName="border-primary-200/60 bg-primary-50/40 dark:!border-border dark:!bg-muted/20"
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
        variant="destructive"
        title="Delete role?"
        description={
          pendingDelete
            ? `"${pendingDelete.label}" will be soft-deleted (marked inactive). This is logged in the audit trail.`
            : ""
        }
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit role catalog entry" : "Create role catalog entry"}
            </DialogTitle>
            <DialogDescription>
              Optionally link a profession type (e.g. nurse) and a department
              (e.g. Emergency Department).
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="rc-name">Name (slug)</Label>
              <Input id="rc-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rc-label">Label</Label>
              <Input id="rc-label" {...form.register("label")} />
              {form.formState.errors.label && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.label.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Profession type (optional)</Label>
              <Select
                value={form.watch("professionTypeId") ?? NONE_VALUE}
                onValueChange={(v) =>
                  form.setValue(
                    "professionTypeId",
                    v === NONE_VALUE ? null : v,
                  )
                }
              >
                <SelectTrigger>
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
              <Label>Department (optional)</Label>
              <Select
                value={form.watch("roleDepartmentId") ?? NONE_VALUE}
                onValueChange={(v) =>
                  form.setValue(
                    "roleDepartmentId",
                    v === NONE_VALUE ? null : v,
                  )
                }
              >
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="rc-short">Short name</Label>
              <Input id="rc-short" {...form.register("shortName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rc-desc">Description</Label>
              <Textarea id="rc-desc" {...form.register("description")} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="rc-active">Active</Label>
              <Switch
                id="rc-active"
                checked={form.watch("isActive") ?? true}
                onCheckedChange={(checked) =>
                  form.setValue("isActive", checked)
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || updating}
                className="bg-primary-700 hover:bg-primary-600 dark:bg-primary-700 dark:hover:bg-primary-600"
              >
                {(creating || updating) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function LoadingState({ label }: { label: string }) {
  return <SettingsLoadingCard label={label} />;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center dark:!bg-muted/10">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
