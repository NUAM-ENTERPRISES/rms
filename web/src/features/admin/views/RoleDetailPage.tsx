import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
  Edit,
  Trash2,
  Key,
  Users,
  Calendar,
  User,
  Loader2,
  Eye,
  PenLine,
  Settings,
  Lock,
  Mail,
  Phone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteConfirmationDialog } from "@/components/ui";
import { ImageViewer } from "@/components/molecules";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import {
  useGetRoleByIdQuery,
  useGetRoleAssignedUsersQuery,
  useGetPermissionsCatalogQuery,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} from "@/features/admin/api/roles";
import { RoleTypeBadge } from "@/features/admin/components/RoleTypeBadge";
import { RoleFormDialog } from "@/features/admin/components/RoleFormDialog";
import { UserAccountStatusBadge } from "@/features/admin/components/UserAccountStatusBadge";
import type { RoleFormValues } from "@/features/admin/schemas/role-schemas";
import type { UserAccountStatus } from "@/features/admin/api";
import { DashboardStatTile } from "@/components/molecules/DashboardStatTile";
import { cn } from "@/lib/utils";
import {
  getPermissionBadgeClassName,
  getPermissionDescription,
  getPermissionIcon,
  getPermissionLabel,
  groupPermissionKeysByResource,
} from "@/features/admin/utils/permission-display";

const DEFAULT_PROFILE_IMAGE =
  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg";

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  headerExtra,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2.5 shadow-md">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground">{title}</h2>
              {description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {headerExtra}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function InfoField({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="flex items-start gap-2.5 text-sm font-medium text-foreground">
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 break-words">{children}</div>
      </div>
    </div>
  );
}

function permissionActionIcon(key: string): LucideIcon {
  return getPermissionIcon(key);
}

function groupPermissionKeys(keys: string[]) {
  return groupPermissionKeysByResource(keys);
}

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canReadRoles = useCan("read:roles");
  const canManageRoles = useCan("manage:roles");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [showAssignedUsers, setShowAssignedUsers] = useState(false);
  const assignedUsersRef = useRef<HTMLDivElement>(null);
  const usersPageSize = 10;

  const {
    data: roleResponse,
    isLoading,
    isError,
    isFetching,
  } = useGetRoleByIdQuery(id ?? "", { skip: !canReadRoles || !id });

  const {
    data: assignedUsersResponse,
    isLoading: assignedUsersLoading,
    isFetching: assignedUsersFetching,
  } = useGetRoleAssignedUsersQuery(
    { roleId: id ?? "", page: usersPage, limit: usersPageSize },
    { skip: !canReadRoles || !id || !showAssignedUsers },
  );

  const { data: permissionsData, isLoading: permissionsLoading } =
    useGetPermissionsCatalogQuery(undefined, {
      skip: !canReadRoles || !editOpen,
    });

  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();

  const role = roleResponse?.data;
  const permissions = permissionsData?.data ?? [];
  const assignedUsers = assignedUsersResponse?.data?.users ?? [];
  const assignedUsersPagination = assignedUsersResponse?.data?.pagination;
  const permissionGroups = useMemo(
    () => groupPermissionKeys(role?.permissions ?? []),
    [role?.permissions],
  );

  useEffect(() => {
    setUsersPage(1);
    setShowAssignedUsers(false);
  }, [id]);

  useEffect(() => {
    if (
      showAssignedUsers &&
      assignedUsersRef.current &&
      typeof assignedUsersRef.current.scrollIntoView === "function"
    ) {
      assignedUsersRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [showAssignedUsers]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleUpdate = async (values: RoleFormValues) => {
    if (!role) return;
    try {
      await updateRole({
        id: role.id,
        body: {
          name: values.name,
          description: values.description || undefined,
          permissionKeys: values.permissionKeys,
        },
      }).unwrap();
      toast.success("Role updated successfully");
      setEditOpen(false);
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to update role";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!role) return;
    try {
      await deleteRole(role.id).unwrap();
      toast.success("Role deleted successfully");
      navigate("/admin/roles");
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to delete role";
      toast.error(message);
    }
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

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !role) {
    return (
      <div className="w-full space-y-6">
        <Button
          variant="ghost"
          className="gap-2 rounded-xl"
          onClick={() => navigate("/admin/roles")}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Roles
        </Button>
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50">
              <ShieldAlert className="h-8 w-8 text-rose-500" />
            </div>
            <p className="font-semibold text-foreground">Role not found</p>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              This role may have been deleted or you don&apos;t have access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          className="w-fit gap-2 rounded-xl"
          onClick={() => navigate("/admin/roles")}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Roles
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
          {!role.isSystem && canManageRoles ? (
            <>
              <Button
                variant="outline"
                className="h-11 gap-2 rounded-xl"
                onClick={() => setEditOpen(true)}
              >
                <Edit className="h-4 w-4" />
                Edit Role
              </Button>
              <Button
                variant="outline"
                className="h-11 gap-2 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-muted to-card px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-3 shadow-md">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {role.name}
                  </h1>
                  <RoleTypeBadge isSystem={role.isSystem} />
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {role.description || "No description provided for this role."}
                </p>
              </div>
            </div>
            {role.isSystem ? (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="inline-flex cursor-help items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm transition-colors hover:border-rose-400 hover:bg-rose-100 dark:border-rose-500/60 dark:bg-rose-950/70 dark:text-rose-300 dark:hover:border-rose-400 dark:hover:bg-rose-900/80"
                      tabIndex={0}
                      aria-label="System role is read-only"
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-300" aria-hidden />
                      System role is read-only
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="end"
                    className="max-w-xs border border-rose-500/30 bg-rose-950 px-3 py-2 text-xs leading-relaxed text-rose-50 shadow-lg dark:border-rose-400/40 dark:bg-rose-950 dark:text-rose-100"
                  >
                    This is a system predefined role. You cannot update or
                    delete it. Only custom roles can be edited.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardStatTile
          accent="indigo"
          label="Permissions"
          value={role.permissions.length}
          subtitle="Assigned permission keys"
          icon={Key}
          as="div"
        />
        <DashboardStatTile
          accent="emerald"
          label="Assigned Users"
          value={role.assignedUserCount ?? 0}
          subtitle="Users currently using this role"
          icon={Users}
          interactive
          active={showAssignedUsers}
          footerText={showAssignedUsers ? "Viewing now" : "Click to view users"}
          onClick={() => {
            setShowAssignedUsers(true);
            setUsersPage(1);
          }}
        />
        <DashboardStatTile
          accent={role.isSystem ? "sky" : "violet"}
          label="Role Type"
          value={role.isSystem ? "System" : "Custom"}
          subtitle={
            role.isSystem
              ? "Seeded by the platform"
              : "Created by an administrator"
          }
          icon={Shield}
          as="div"
        />
      </div>

      {showAssignedUsers ? (
        <div ref={assignedUsersRef}>
          <SectionCard
            title="Assigned users"
            description={`${assignedUsersPagination?.total ?? role.assignedUserCount ?? 0} user${
              (assignedUsersPagination?.total ?? role.assignedUserCount ?? 0) !==
              1
                ? "s"
                : ""
            } with this role`}
            icon={Users}
            headerExtra={
              assignedUsersFetching ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : null
            }
          >
            {assignedUsersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : assignedUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                No users are currently assigned to this role.
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-border">
                  <Table>
                    <TableHeader className="bg-muted/80">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="h-10 px-4 pl-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          User
                        </TableHead>
                        <TableHead className="hidden h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:table-cell">
                          Employee code
                        </TableHead>
                        <TableHead className="hidden h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground md:table-cell">
                          Contact
                        </TableHead>
                        <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Status
                        </TableHead>
                        <TableHead className="hidden h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground lg:table-cell">
                          Created
                        </TableHead>
                        <TableHead className="h-10 w-[60px] px-4 pr-4 text-right" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedUsers.map((user) => (
                        <TableRow
                          key={user.id}
                          className="group cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/60"
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                        >
                          <TableCell className="px-4 py-3 pl-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="shrink-0"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <ImageViewer
                                  title={user.name}
                                  src={user.profileImage || null}
                                  fallbackSrc={DEFAULT_PROFILE_IMAGE}
                                  className="h-10 w-10 rounded-full border border-border shadow-sm"
                                  ariaLabel={`View profile image for ${user.name}`}
                                  enableHoverPreview
                                  hoverPosition="right"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {user.name}
                                </p>
                                {user.employeeCode ? (
                                  <Badge
                                    variant="outline"
                                    className="mt-1 text-[10px] font-semibold tracking-wide sm:hidden"
                                  >
                                    {user.employeeCode}
                                  </Badge>
                                ) : null}
                                <p className="truncate text-xs text-muted-foreground md:hidden">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden px-4 py-3 sm:table-cell">
                            {user.employeeCode ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold tracking-wide"
                              >
                                {user.employeeCode}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden px-4 py-3 md:table-cell">
                            <div className="space-y-1">
                              <div className="flex max-w-[220px] items-center gap-1.5 text-sm text-foreground">
                                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">{user.email}</span>
                              </div>
                              {user.mobileNumber ? (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  {user.mobileNumber}
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <UserAccountStatusBadge
                              status={
                                (user.accountStatus as UserAccountStatus) ??
                                "ACTIVE"
                              }
                            />
                          </TableCell>
                          <TableCell className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell className="px-4 py-3 pr-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-70 group-hover:opacity-100"
                              aria-label={`View ${user.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/users/${user.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {assignedUsersPagination &&
                assignedUsersPagination.totalPages > 1 ? (
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-border bg-muted/50 px-4 py-4 sm:flex-row">
                    <p className="text-xs text-muted-foreground">
                      Showing{" "}
                      <span className="font-semibold text-foreground">
                        {(assignedUsersPagination.page - 1) * usersPageSize + 1}
                      </span>
                      –
                      <span className="font-semibold text-foreground">
                        {Math.min(
                          assignedUsersPagination.page * usersPageSize,
                          assignedUsersPagination.total,
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-foreground">
                        {assignedUsersPagination.total}
                      </span>{" "}
                      users
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-border text-muted-foreground hover:bg-muted"
                        onClick={() =>
                          setUsersPage((p) => Math.max(1, p - 1))
                        }
                        disabled={assignedUsersPagination.page <= 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from(
                        {
                          length: Math.min(
                            5,
                            assignedUsersPagination.totalPages,
                          ),
                        },
                        (_, i) => {
                          let pageNum: number;
                          if (assignedUsersPagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (assignedUsersPagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (
                            assignedUsersPagination.page >=
                            assignedUsersPagination.totalPages - 2
                          ) {
                            pageNum =
                              assignedUsersPagination.totalPages - 4 + i;
                          } else {
                            pageNum = assignedUsersPagination.page - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={
                                assignedUsersPagination.page === pageNum
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className={cn(
                                "h-8 w-8 p-0 text-xs",
                                assignedUsersPagination.page === pageNum
                                  ? "bg-blue-600 shadow-sm hover:bg-blue-700"
                                  : "text-muted-foreground hover:bg-muted",
                              )}
                              onClick={() => setUsersPage(pageNum)}
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
                          setUsersPage((p) =>
                            Math.min(
                              assignedUsersPagination.totalPages,
                              p + 1,
                            ),
                          )
                        }
                        disabled={
                          assignedUsersPagination.page >=
                          assignedUsersPagination.totalPages
                        }
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </SectionCard>
        </div>
      ) : null}

      <SectionCard
        title="Role details"
        description="Basic information and ownership"
        icon={User}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <InfoField icon={Shield} label="Role name">
            {role.name}
          </InfoField>
          <InfoField icon={User} label="Created by">
            {role.isSystem ? "System" : role.createdBy?.name ?? "—"}
          </InfoField>
          <InfoField icon={Calendar} label="Created">
            {formatDate(role.createdAt)}
          </InfoField>
          <InfoField icon={Calendar} label="Last updated">
            {formatDate(role.updatedAt)}
          </InfoField>
          <InfoField icon={Key} label="Description">
            {role.description || "—"}
          </InfoField>
        </div>
      </SectionCard>

      <SectionCard
        title="Permissions"
        description={`${role.permissions.length} permission${
          role.permissions.length !== 1 ? "s" : ""
        } granted by this role`}
        icon={Key}
      >
        {role.permissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No permissions assigned to this role.
          </div>
        ) : (
          <div className="space-y-4">
            {permissionGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
              <div
                key={group.id}
                className="rounded-xl border border-border p-4"
              >
                <div className="mb-3 flex items-start gap-2">
                  <GroupIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      {group.label}
                    </h3>
                    {group.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {group.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.items.map((key) => {
                    const Icon = permissionActionIcon(key);
                    const label = getPermissionLabel(key);
                    const description = getPermissionDescription(key);
                    const badgeClass = getPermissionBadgeClassName(key);
                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex shrink-0 rounded-md border p-1.5",
                            badgeClass,
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {label}
                          </p>
                          {description ? (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <RoleFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        role={role}
        permissions={permissions}
        permissionsLoading={permissionsLoading}
        isSubmitting={isUpdating}
        onSubmit={handleUpdate}
      />

      <DeleteConfirmationDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={role.name}
        itemType="role"
        description={`Delete custom role "${role.name}"? Users must be reassigned before a role can be deleted.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
