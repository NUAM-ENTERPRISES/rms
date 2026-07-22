import { useEffect, useMemo, useState } from "react";
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
          className="bg-card"
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
          className="bg-card"
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
    <div className="space-y-4">
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-sky-50 via-card to-violet-50">
        <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-500" />
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 p-3 shadow-lg shadow-violet-200">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-foreground">
                Master Catalog
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1 text-base">
                Create profession types, departments, and roles — then link them
                (e.g. Nurse → Emergency → Emergency Staff Nurse).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList className="mb-5 grid w-full grid-cols-3 h-auto gap-1 rounded-xl bg-card/80 p-1.5 border border-border shadow-sm">
              <TabsTrigger
                value="professions"
                className="gap-2 rounded-lg py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                <Stethoscope className="h-4 w-4" />
                <span className="hidden sm:inline">Professions</span>
              </TabsTrigger>
              <TabsTrigger
                value="departments"
                className="gap-2 rounded-lg py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Departments</span>
              </TabsTrigger>
              <TabsTrigger
                value="roles"
                className="gap-2 rounded-lg py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-violet-500 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                <Briefcase className="h-4 w-4" />
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
    </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-3 text-white shadow-md">
        <div>
          <h3 className="font-semibold text-lg">Profession types</h3>
          <p className="text-sm text-teal-50">
            {allItems.length} total · e.g. Nurse, Doctor, Technician
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            size="sm"
            onClick={openCreate}
            className="bg-card text-teal-700 hover:bg-teal-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add profession
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-teal-100 bg-card/80 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search professions..."
            className="pl-9 bg-card"
            aria-label="Search professions"
          />
        </div>
        <Select
          value={sectorFilter}
          onValueChange={(v) => setSectorFilter(v as SectorFilter)}
        >
          <SelectTrigger className="w-full sm:w-[220px] bg-card" aria-label="Filter by sector">
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
        <ul className="grid gap-3">
          {pageItems.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-teal-100 bg-card px-4 py-3 shadow-sm hover:shadow-md hover:border-teal-200 transition-all"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 text-sm font-bold">
                  {(page - 1) * PAGE_SIZE + index + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {item.label}
                    </span>
                    <Badge className="bg-teal-50 text-teal-700 border-teal-200">
                      {item.name}
                    </Badge>
                    {item.sector === "HEALTHCARE" && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Healthcare
                      </Badge>
                    )}
                    {item.sector === "NON_HEALTH_CARE" && (
                      <Badge className="bg-sky-50 text-sky-700 border-sky-200">
                        Non-healthcare
                      </Badge>
                    )}
                    {item.isActive === false && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-teal-700 hover:bg-teal-50"
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
                      className="text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${item.label}`}
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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
        accentClassName="border-teal-100 bg-teal-50/60"
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
                className="bg-teal-600 hover:bg-teal-700"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-white shadow-md">
        <div>
          <h3 className="font-semibold text-lg">Departments</h3>
          <p className="text-sm text-amber-50">
            {pagination.total} total · e.g. Emergency Department
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            size="sm"
            onClick={openCreate}
            className="bg-card text-orange-700 hover:bg-orange-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add department
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState label="Loading departments..." />
      ) : items.length === 0 ? (
        <EmptyState message="No departments yet. Add Emergency Department or others." />
      ) : (
        <ul className="grid gap-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-card px-4 py-3 shadow-sm hover:shadow-md hover:border-amber-200 transition-all"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 text-sm font-bold">
                  {(page - 1) * PAGE_SIZE + index + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {item.label}
                    </span>
                    <Badge className="bg-amber-50 text-amber-800 border-amber-200">
                      {item.name}
                    </Badge>
                    {item.shortName && (
                      <Badge variant="secondary">{item.shortName}</Badge>
                    )}
                    {item.isActive === false && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-orange-700 hover:bg-orange-50"
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
                      className="text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${item.label}`}
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
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
                className="bg-orange-600 hover:bg-orange-700"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 text-white shadow-md">
        <div>
          <h3 className="font-semibold text-lg">Role catalog</h3>
          <p className="text-sm text-indigo-50">
            {pagination.total} total · link profession + optional department
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            size="sm"
            onClick={openCreate}
            className="bg-card text-indigo-700 hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add role
          </Button>
        )}
      </div>

      <div className="grid gap-3 rounded-xl border border-indigo-100 bg-card/80 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search roles..."
            className="pl-9 bg-card"
            aria-label="Search roles"
          />
        </div>
        <Select
          value={sectorFilter}
          onValueChange={(v) => setSectorFilter(v as SectorFilter)}
        >
          <SelectTrigger className="bg-card" aria-label="Filter by sector">
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
          <SelectTrigger className="bg-card" aria-label="Filter by profession type">
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
        <ul className="grid gap-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-card px-4 py-3 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 text-sm font-bold">
                  {(page - 1) * PAGE_SIZE + index + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {item.label}
                    </span>
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      {item.name}
                    </Badge>
                    {item.professionType && (
                      <Badge className="bg-teal-50 text-teal-700 border-teal-200">
                        {item.professionType.label}
                      </Badge>
                    )}
                    {item.professionType?.sector === "HEALTHCARE" && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Healthcare
                      </Badge>
                    )}
                    {item.professionType?.sector === "NON_HEALTH_CARE" && (
                      <Badge className="bg-sky-50 text-sky-700 border-sky-200">
                        Non-healthcare
                      </Badge>
                    )}
                    {item.roleDepartment && (
                      <Badge className="bg-amber-50 text-amber-800 border-amber-200">
                        {item.roleDepartment.label}
                      </Badge>
                    )}
                    {item.isActive === false && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-indigo-700 hover:bg-indigo-50"
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
                      className="text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${item.label}`}
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <CatalogPagination
        pagination={pagination}
        onPageChange={setPage}
        isFetching={isFetching}
        accentClassName="border-indigo-100 bg-indigo-50/60"
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
                className="bg-indigo-600 hover:bg-indigo-700"
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
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center rounded-xl border border-dashed border-border bg-card/70">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/70 px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
