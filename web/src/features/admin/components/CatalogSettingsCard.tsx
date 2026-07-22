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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const PAGE_SIZE = 12;

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
        "flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
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
          className="rounded-xl bg-background"
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Prev
        </Button>
        <span className="min-w-[5.5rem] text-center text-sm font-medium text-foreground">
          Page {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl bg-background"
          disabled={page >= totalPages || isFetching}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CatalogSectionHeader({
  title,
  subtitle,
  accent,
  action,
}: {
  title: string;
  subtitle: string;
  accent: "emerald" | "amber" | "sky";
  action?: ReactNode;
}) {
  const styles = {
    emerald: {
      wrap: "border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-white",
    },
    amber: {
      wrap: "border-amber-100 bg-gradient-to-r from-amber-50 via-white to-white",
    },
    sky: {
      wrap: "border-sky-100 bg-gradient-to-r from-sky-50 via-white to-white",
    },
  }[accent];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between",
        styles.wrap,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function CatalogSettingsCard() {
  const canManage = useCan("manage:system_config");
  const [subTab, setSubTab] = useState("professions");

  return (
    <Card className="overflow-hidden border-border bg-card/95 shadow-sm">
      <div className="h-1 bg-emerald-500" />
      <CardHeader className="relative border-b border-border p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-50/90 via-white to-transparent"
        />
        <div className="relative flex items-start gap-3.5 sm:items-center sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
            <Briefcase className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Master Catalog
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground sm:text-base">
              Create profession types, departments, and roles — then link them
              (e.g. Nurse → Emergency → Emergency Staff Nurse).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <Tabs value={subTab} onValueChange={setSubTab}>
          <TabsList className="mb-5 grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-border bg-muted/40 p-1.5">
            <TabsTrigger
              value="professions"
              className="gap-2 rounded-xl py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Stethoscope className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Professions</span>
            </TabsTrigger>
            <TabsTrigger
              value="departments"
              className="gap-2 rounded-xl py-2.5 data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Building2 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Departments</span>
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="gap-2 rounded-xl py-2.5 data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Briefcase className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="professions" className="mt-0">
            <ProfessionTypesSection canManage={canManage} />
          </TabsContent>
          <TabsContent value="departments" className="mt-0">
            <DepartmentsSection canManage={canManage} />
          </TabsContent>
          <TabsContent value="roles" className="mt-0">
            <RoleCatalogSection canManage={canManage} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
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
      <CatalogSectionHeader
        title="Profession types"
        subtitle={`${allItems.length} total · e.g. Nurse, Doctor, Technician`}
        accent="emerald"
        action={
          canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={openCreate}
              className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add profession
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-card p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search professions..."
            className="bg-background pl-9"
            aria-label="Search professions"
          />
        </div>
        <Select
          value={sectorFilter}
          onValueChange={(v) => setSectorFilter(v as SectorFilter)}
        >
          <SelectTrigger className="w-full bg-background sm:w-[220px]" aria-label="Filter by sector">
            <SelectValue placeholder="Sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sectors</SelectItem>
            <SelectItem value="HEALTHCARE">Healthcare</SelectItem>
            <SelectItem value="NON_HEALTH_CARE">Non-healthcare</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading profession types..." />
      ) : pageItems.length === 0 ? (
        <EmptyState message="No profession types match your filters." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((item, index) => (
            <li
              key={item.id}
              className="flex h-full flex-col gap-3 rounded-2xl border border-emerald-100/80 bg-card p-4 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </div>
                  <span className="truncate font-semibold text-foreground">
                    {item.label}
                  </span>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-emerald-700 hover:bg-emerald-50"
                      aria-label={`Edit ${item.label}`}
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {item.isActive !== false && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-danger-600 hover:bg-danger-50"
                        aria-label={`Delete ${item.label}`}
                        onClick={() => setPendingDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  {item.name}
                </Badge>
                {item.sector === "HEALTHCARE" && (
                  <Badge className="border-teal-200 bg-teal-50 text-teal-700">
                    Healthcare
                  </Badge>
                )}
                {item.sector === "NON_HEALTH_CARE" && (
                  <Badge className="border-sky-200 bg-sky-50 text-sky-700">
                    Non-healthcare
                  </Badge>
                )}
                {item.isActive === false && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
              {item.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
              )}
            </li>
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
        accentClassName="border-emerald-100 bg-emerald-50/60"
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
                className="bg-emerald-600 hover:bg-emerald-700"
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
      <CatalogSectionHeader
        title="Departments"
        subtitle={`${pagination.total} total · e.g. Emergency Department`}
        accent="amber"
        action={
          canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={openCreate}
              className="rounded-xl bg-amber-600 text-white hover:bg-amber-700"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add department
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <LoadingState label="Loading departments..." />
      ) : items.length === 0 ? (
        <EmptyState message="No departments yet. Add Emergency Department or others." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex h-full flex-col gap-3 rounded-2xl border border-amber-100/80 bg-card p-4 shadow-sm transition-all hover:border-amber-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-700">
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </div>
                  <span className="truncate font-semibold text-foreground">
                    {item.label}
                  </span>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-700 hover:bg-amber-50"
                      aria-label={`Edit ${item.label}`}
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {item.isActive !== false && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-danger-600 hover:bg-danger-50"
                        aria-label={`Delete ${item.label}`}
                        onClick={() => setPendingDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                  {item.name}
                </Badge>
                {item.shortName && (
                  <Badge variant="secondary">{item.shortName}</Badge>
                )}
                {item.isActive === false && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
            </li>
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
        accentClassName="border-amber-100 bg-amber-50/60"
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
                className="bg-amber-600 hover:bg-amber-700"
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
      <CatalogSectionHeader
        title="Role catalog"
        subtitle={`${pagination.total} total · link profession + optional department`}
        accent="sky"
        action={
          canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={openCreate}
              className="rounded-xl bg-sky-600 text-white hover:bg-sky-700"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add role
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 rounded-2xl border border-sky-100 bg-card p-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search roles..."
            className="bg-background pl-9"
            aria-label="Search roles"
          />
        </div>
        <Select
          value={sectorFilter}
          onValueChange={(v) => setSectorFilter(v as SectorFilter)}
        >
          <SelectTrigger className="bg-background" aria-label="Filter by sector">
            <SelectValue placeholder="Sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sectors</SelectItem>
            <SelectItem value="HEALTHCARE">Healthcare</SelectItem>
            <SelectItem value="NON_HEALTH_CARE">Non-healthcare</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={professionFilter}
          onValueChange={setProfessionFilter}
        >
          <SelectTrigger className="bg-background" aria-label="Filter by profession type">
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

      {isLoading ? (
        <LoadingState label="Loading role catalog..." />
      ) : items.length === 0 ? (
        <EmptyState message="No roles match your filters." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex h-full flex-col gap-3 rounded-2xl border border-sky-100/80 bg-card p-4 shadow-sm transition-all hover:border-sky-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-xs font-bold text-sky-700">
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </div>
                  <span className="truncate font-semibold text-foreground">
                    {item.label}
                  </span>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-sky-700 hover:bg-sky-50"
                      aria-label={`Edit ${item.label}`}
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {item.isActive !== false && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-danger-600 hover:bg-danger-50"
                        aria-label={`Delete ${item.label}`}
                        onClick={() => setPendingDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className="border-sky-200 bg-sky-50 text-sky-700">
                  {item.name}
                </Badge>
                {item.professionType && (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {item.professionType.label}
                  </Badge>
                )}
                {item.professionType?.sector === "HEALTHCARE" && (
                  <Badge className="border-teal-200 bg-teal-50 text-teal-700">
                    Healthcare
                  </Badge>
                )}
                {item.professionType?.sector === "NON_HEALTH_CARE" && (
                  <Badge className="border-sky-200 bg-sky-50 text-sky-700">
                    Non-healthcare
                  </Badge>
                )}
                {item.roleDepartment && (
                  <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                    {item.roleDepartment.label}
                  </Badge>
                )}
                {item.isActive === false && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <CatalogPagination
        pagination={pagination}
        onPageChange={setPage}
        isFetching={isFetching}
        accentClassName="border-sky-100 bg-sky-50/60"
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
                className="bg-sky-600 hover:bg-sky-700"
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
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
