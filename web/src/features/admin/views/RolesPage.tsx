import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Loader2,
  FilterX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/ui";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useGetRolesQuery,
  useGetPermissionsCatalogQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  type Role,
} from "@/features/admin/api/roles";
import { RoleTypeBadge } from "@/features/admin/components/RoleTypeBadge";
import { RoleFormDialog } from "@/features/admin/components/RoleFormDialog";
import type { RoleFormValues } from "@/features/admin/schemas/role-schemas";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";
import { cn } from "@/lib/utils";

type DialogMode = "create" | "edit";
type TypeFilter = "ALL" | "SYSTEM" | "CUSTOM";

const TYPE_FILTERS: Array<{
  id: TypeFilter;
  label: string;
  subtitle: string;
  icon: typeof Shield;
  accent: string;
}> = [
  {
    id: "ALL",
    label: "All Roles",
    subtitle: "System and custom roles",
    icon: Shield,
    accent: "indigo",
  },
  {
    id: "SYSTEM",
    label: "System",
    subtitle: "Seeded, read-only roles",
    icon: ShieldCheck,
    accent: "sky",
  },
  {
    id: "CUSTOM",
    label: "Custom",
    subtitle: "Created by administrators",
    icon: Sparkles,
    accent: "emerald",
  },
];

export default function RolesPage() {
  const navigate = useNavigate();
  const canReadRoles = useCan("read:roles");
  const canManageRoles = useCan("manage:roles");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    role: Role | null;
  }>({ isOpen: false, role: null });

  const pageSize = 10;

  const { data: rolesData, isLoading, isFetching, isError } = useGetRolesQuery(
    {
      page,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      type: typeFilter,
    },
    { skip: !canReadRoles },
  );
  const { data: permissionsData, isLoading: permissionsLoading } =
    useGetPermissionsCatalogQuery(undefined, {
      skip: !canReadRoles || !dialogOpen,
    });

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();

  const roles = rolesData?.data?.roles ?? [];
  const pagination = rolesData?.data?.pagination;
  const counts = rolesData?.data?.counts;
  const permissions = permissionsData?.data ?? [];

  const hasActiveFilters = search.trim().length > 0 || typeFilter !== "ALL";

  const getTileValue = (filterId: TypeFilter): number | "—" => {
    if (isLoading && !counts) return "—";
    switch (filterId) {
      case "ALL":
        return counts?.all ?? 0;
      case "SYSTEM":
        return counts?.system ?? 0;
      case "CUSTOM":
        return counts?.custom ?? 0;
      default:
        return "—";
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setPage(1);
  };

  const openCreate = () => {
    setSelectedRole(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEdit = (role: Role) => {
    setSelectedRole(role);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const goToDetails = (roleId: string) => {
    navigate(`/admin/roles/${roleId}`);
  };

  const handleSubmit = async (values: RoleFormValues) => {
    try {
      if (dialogMode === "create") {
        const result = await createRole({
          name: values.name,
          description: values.description || undefined,
          permissionKeys: values.permissionKeys,
        }).unwrap();
        toast.success("Role created successfully");
        setDialogOpen(false);
        setSelectedRole(null);
        navigate(`/admin/roles/${result.data.id}`);
        return;
      }
      if (dialogMode === "edit" && selectedRole) {
        await updateRole({
          id: selectedRole.id,
          body: {
            name: values.name,
            description: values.description || undefined,
            permissionKeys: values.permissionKeys,
          },
        }).unwrap();
        toast.success("Role updated successfully");
      }
      setDialogOpen(false);
      setSelectedRole(null);
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to save role";
      toast.error(message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.role) return;
    try {
      await deleteRole(deleteConfirm.role.id).unwrap();
      toast.success("Role deleted successfully");
      setDeleteConfirm({ isOpen: false, role: null });
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to delete role";
      toast.error(message);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (!canReadRoles) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card className="max-w-md border-border shadow-lg">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100">
              <ShieldAlert className="h-7 w-7 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You don&apos;t have permission to view roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Toolbar */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          <div className="group relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-blue-600" />
            <Input
              placeholder="Search by role name or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border-border bg-muted/30 pl-10 focus:bg-card"
              aria-label="Search roles"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="h-11 gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <FilterX className="h-4 w-4" />
                Reset
              </Button>
            )}
            {canManageRoles && (
              <Button
                onClick={openCreate}
                className="h-11 gap-2 rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create Role
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Type filter tiles */}
      <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-3">
        {TYPE_FILTERS.map((tile) => {
          const isActive = typeFilter === tile.id;
          return (
            <DashboardStatTile
              key={tile.id}
              accent={tile.accent}
              label={tile.label}
              value={getTileValue(tile.id)}
              subtitle={tile.subtitle}
              icon={tile.icon}
              active={isActive}
              interactive
              footerText={isActive ? "Viewing now" : "Click to filter"}
              onClick={() => {
                setTypeFilter(tile.id);
                setPage(1);
              }}
            />
          );
        })}
      </div>

      {/* Roles table */}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-opacity",
          isFetching && !isLoading && "opacity-70",
        )}
      >
        <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Roles Directory
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {pagination?.total ?? 0} role
                  {(pagination?.total ?? 0) !== 1 ? "s" : ""} matching · Click a
                  row to view details
                </p>
              </div>
            </div>
            {isFetching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50">
                <ShieldAlert className="h-8 w-8 text-rose-500" />
              </div>
              <p className="font-semibold text-foreground">Failed to load roles</p>
              <p className="max-w-xs text-center text-sm">
                Something went wrong while loading roles. Please try again.
              </p>
            </div>
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Shield className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-foreground">No roles found</p>
              <p className="max-w-xs text-center text-sm">
                {hasActiveFilters
                  ? "No roles match your filters. Try adjusting search or type."
                  : "Get started by creating your first custom role."}
              </p>
              {!hasActiveFilters && canManageRoles && (
                <Button
                  onClick={openCreate}
                  className="mt-1 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create First Role
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/80">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="h-10 px-4 pl-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Role
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Type
                    </TableHead>
                    <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Permissions
                    </TableHead>
                    <TableHead className="hidden h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground md:table-cell">
                      Created by
                    </TableHead>
                    <TableHead className="hidden h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground lg:table-cell">
                      Created
                    </TableHead>
                    <TableHead className="h-10 w-[60px] px-4 pr-6 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow
                      key={role.id}
                      className="group cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/60"
                      onClick={() => goToDetails(role.id)}
                    >
                      <TableCell className="px-4 py-3 pl-6">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {role.name}
                          </p>
                          {role.description ? (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {role.description}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground/70">
                              No description
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <RoleTypeBadge isSystem={role.isSystem} />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="rounded-lg bg-muted/40 text-xs font-semibold tabular-nums"
                        >
                          {role.permissions.length} permission
                          {role.permissions.length !== 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {role.isSystem
                          ? "System"
                          : role.createdBy?.name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                        {formatDate(role.createdAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3 pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg opacity-70 group-hover:opacity-100"
                              aria-label={`Actions for ${role.name}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                goToDetails(role.id);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            {!role.isSystem && canManageRoles ? (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEdit(role);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm({
                                      isOpen: true,
                                      role,
                                    });
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && !isLoading && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-muted/50 px-6 py-4 sm:flex-row">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {(pagination.page - 1) * pageSize + 1}
                </span>
                –
                <span className="font-semibold text-foreground">
                  {Math.min(pagination.page * pageSize, pagination.total)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {pagination.total}
                </span>{" "}
                roles
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-border text-muted-foreground hover:bg-muted"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={
                          pagination.page === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        className={cn(
                          "h-8 w-8 p-0 text-xs",
                          pagination.page === pageNum
                            ? "bg-blue-600 shadow-sm hover:bg-blue-700"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  },
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-border text-muted-foreground hover:bg-muted"
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <RoleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        role={selectedRole}
        permissions={permissions}
        permissionsLoading={permissionsLoading}
        isSubmitting={isCreating || isUpdating}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, role: null })}
        onConfirm={handleDeleteConfirm}
        title={deleteConfirm.role?.name ?? "role"}
        itemType="role"
        description={
          deleteConfirm.role
            ? `Delete custom role "${deleteConfirm.role.name}"? Users must be reassigned before a role can be deleted.`
            : undefined
        }
        isLoading={isDeleting}
      />
    </div>
  );
}
