import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Users as UsersIcon,
  Mail,
  Phone,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  UserCheck,
  ShieldAlert,
  UserX,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteConfirmationDialog } from "@/components/ui";
import { ImageViewer, ProfessionCoverageBadges } from "@/components/molecules";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import { useDebounce } from "@/hooks/useDebounce";
import { useSystemConfig, getRoleBadgeVariant } from "@/hooks/useSystemConfig";
import {
  useGetUsersQuery,
  useDeleteUserMutation,
  type UserAccountStatus,
} from "@/features/admin/api";
import { UserAccountStatusBadge } from "@/features/admin/components/UserAccountStatusBadge";
import { UserRatingCell } from "@/features/admin/components/UserRatingCell";
import { cn } from "@/lib/utils";

type StatusFilter = UserAccountStatus | "ALL";

const STATUS_FILTERS: Array<{
  id: StatusFilter;
  label: string;
  subtitle: string;
  icon: typeof UsersIcon;
  accent: string;
}> = [
  {
    id: "ALL",
    label: "All Users",
    subtitle: "Everyone in the system",
    icon: UsersIcon,
    accent: "indigo",
  },
  {
    id: "ACTIVE",
    label: "Active",
    subtitle: "Can sign in and work",
    icon: UserCheck,
    accent: "emerald",
  },
  {
    id: "INACTIVE",
    label: "Inactive",
    subtitle: "Account deactivated",
    icon: UserX,
    accent: "amber",
  },
  {
    id: "BLOCKED",
    label: "Blocked",
    subtitle: "Access restricted",
    icon: ShieldAlert,
    accent: "rose",
  },
];

const accentStyles: Record<
  string,
  { card: string; icon: string; iconBg: string; value: string; ring: string; dot: string }
> = {
  indigo: {
    card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100",
    icon: "text-indigo-600",
    iconBg: "bg-indigo-100",
    value: "text-indigo-700",
    ring: "ring-indigo-400/50",
    dot: "bg-indigo-500",
  },
  emerald: {
    card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-100",
    value: "text-emerald-700",
    ring: "ring-emerald-400/50",
    dot: "bg-emerald-500",
  },
  amber: {
    card: "from-amber-50 via-white to-amber-50/30 border-amber-100",
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    value: "text-amber-700",
    ring: "ring-amber-400/50",
    dot: "bg-amber-500",
  },
  rose: {
    card: "from-rose-50 via-white to-rose-50/30 border-rose-100",
    icon: "text-rose-600",
    iconBg: "bg-rose-100",
    value: "text-rose-700",
    ring: "ring-rose-400/50",
    dot: "bg-rose-500",
  },
};

const DEFAULT_PROFILE_IMAGE =
  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg";

export default function UsersPage() {
  const navigate = useNavigate();
  const canManageUsers = useCan("manage:users");
  const canReadUsers = useCan("read:users");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [accountStatus, setAccountStatus] = useState<StatusFilter>("ALL");
  const debouncedSearch = useDebounce(search, 400);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: "",
    userName: "",
  });

  const queryArgs = {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    sortBy: "createdAt",
    sortOrder: "desc" as const,
    accountStatus: accountStatus === "ALL" ? undefined : accountStatus,
  };

  const searchParam = debouncedSearch || undefined;
  const countQueryBase = {
    page: 1,
    limit: 1,
    search: searchParam,
    sortBy: "createdAt",
    sortOrder: "desc" as const,
  };

  const { data: usersData, isLoading, isFetching } = useGetUsersQuery(queryArgs, {
    skip: !canReadUsers,
  });

  const { data: allUsersCountData, isLoading: isAllCountLoading } = useGetUsersQuery(
    countQueryBase,
    { skip: !canReadUsers },
  );
  const { data: activeCountData, isLoading: isActiveCountLoading } = useGetUsersQuery(
    { ...countQueryBase, accountStatus: "ACTIVE" },
    { skip: !canReadUsers },
  );
  const { data: inactiveCountData, isLoading: isInactiveCountLoading } =
    useGetUsersQuery(
      { ...countQueryBase, accountStatus: "INACTIVE" },
      { skip: !canReadUsers },
    );
  const { data: blockedCountData, isLoading: isBlockedCountLoading } = useGetUsersQuery(
    { ...countQueryBase, accountStatus: "BLOCKED" },
    { skip: !canReadUsers },
  );

  const { data: systemConfig } = useSystemConfig();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const users = usersData?.data?.users ?? [];
  const pagination = usersData?.data;

  const hasActiveFilters = search.trim().length > 0 || accountStatus !== "ALL";

  const statusCounts = {
    all: allUsersCountData?.data?.total ?? 0,
    active: activeCountData?.data?.total ?? 0,
    inactive: inactiveCountData?.data?.total ?? 0,
    blocked: blockedCountData?.data?.total ?? 0,
  };
  const isTileCountsLoading =
    isAllCountLoading ||
    isActiveCountLoading ||
    isInactiveCountLoading ||
    isBlockedCountLoading;

  const getTileValue = (filterId: StatusFilter): number | "—" => {
    if (isTileCountsLoading) return "—";

    switch (filterId) {
      case "ALL":
        return statusCounts.all;
      case "ACTIVE":
        return statusCounts.active;
      case "INACTIVE":
        return statusCounts.inactive;
      case "BLOCKED":
        return statusCounts.blocked;
      default:
        return "—";
    }
  };

  const handleDeleteUserConfirm = async () => {
    try {
      await deleteUser(deleteConfirm.userId).unwrap();
      toast.success("User deleted successfully");
      setDeleteConfirm({ isOpen: false, userId: "", userName: "" });
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to delete user";
      toast.error(message);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getRoleBadgeVariantLocal = (roleName: string) =>
    getRoleBadgeVariant(roleName, systemConfig?.data);

  const handleResetFilters = () => {
    setSearch("");
    setAccountStatus("ALL");
    setPage(1);
  };

  if (!canReadUsers) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card className="max-w-md border-border shadow-lg">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100">
              <ShieldAlert className="h-7 w-7 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You don&apos;t have permission to view users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Toolbar */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          <div className="group relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-indigo-500" />
            <Input
              placeholder="Search by name, email, or employee code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border-border bg-muted/30 pl-10 focus:bg-background"
              aria-label="Search users"
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="h-11 gap-2 rounded-xl">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export users list</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {canManageUsers && (
              <Button
                onClick={() => navigate("/admin/users/create")}
                className="h-11 gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:from-indigo-700 hover:to-violet-700"
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status filter tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATUS_FILTERS.map((tile) => {
          const Icon = tile.icon;
          const s = accentStyles[tile.accent];
          const isActive = accountStatus === tile.id;
          const value = getTileValue(tile.id);

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => {
                setAccountStatus(tile.id);
                setPage(1);
              }}
              className={cn(
                "group relative rounded-2xl border bg-gradient-to-br p-5 text-left shadow-sm transition-all duration-200 focus:outline-none",
                s.card,
                isActive
                  ? `ring-2 shadow-md ${s.ring}`
                  : "hover:-translate-y-0.5 hover:shadow-md",
              )}
            >
              {isActive && (
                <span
                  className={cn(
                    "absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full",
                    s.dot,
                  )}
                />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {tile.label}
                  </p>
                  <p className={cn("text-3xl font-bold tabular-nums", s.value)}>
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground">{tile.subtitle}</p>
                </div>
                <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
                  <Icon className={cn("h-5 w-5", s.icon)} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                <span>{isActive ? "Viewing now" : "Click to filter"}</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Users table */}
      <Card
        className={cn(
          "overflow-hidden border-border shadow-sm transition-opacity",
          isFetching && !isLoading && "opacity-70",
        )}
      >
        <div className="border-b border-border bg-gradient-to-r from-muted/50 to-background px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 p-2.5 shadow-md">
                <UsersIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Team Directory</h2>
                <p className="text-xs text-muted-foreground">
                  {pagination?.total ?? 0} user
                  {(pagination?.total ?? 0) !== 1 ? "s" : ""} matching · Click a row
                  to view profile
                </p>
              </div>
            </div>
            {isFetching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <UsersIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-foreground">No users found</p>
              <p className="max-w-xs text-center text-sm">
                {hasActiveFilters
                  ? "No users match your filters. Try adjusting search or status."
                  : "Get started by adding your first user to the system."}
              </p>
              {!hasActiveFilters && canManageUsers && (
                <Button
                  onClick={() => navigate("/admin/users/create")}
                  className="mt-1 gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Add First User
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-10 pl-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      User
                    </TableHead>
                    <TableHead className="hidden h-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground md:table-cell">
                      Contact
                    </TableHead>
                    <TableHead className="h-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="h-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Roles
                    </TableHead>
                    <TableHead className="hidden h-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground lg:table-cell">
                      Profession Coverage
                    </TableHead>
                    <TableHead className="hidden h-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground xl:table-cell">
                      Rating
                    </TableHead>
                    <TableHead className="hidden h-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground lg:table-cell">
                      Joined
                    </TableHead>
                    <TableHead className="h-10 w-[60px] pr-6 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const status = user.accountStatus ?? "ACTIVE";
                    const isNonActive = status !== "ACTIVE";

                    return (
                      <TableRow
                        key={user.id}
                        className={cn(
                          "group cursor-pointer border-b border-border/60 transition-colors last:border-b-0",
                          isNonActive
                            ? "bg-destructive/5 hover:bg-destructive/10"
                            : "hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20",
                        )}
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                      >
                        <TableCell className="py-3 pl-6">
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
                              <p className="truncate text-sm font-semibold text-foreground group-hover:text-indigo-700">
                                {user.name}
                              </p>
                              {user.employeeCode ? (
                                <Badge
                                  variant="outline"
                                  className="mt-1 text-[10px] font-semibold tracking-wide"
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
                        <TableCell className="hidden py-3 md:table-cell">
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
                        <TableCell className="py-3">
                          <UserAccountStatusBadge status={status} />
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex max-w-[200px] flex-wrap gap-1">
                            {user.userRoles
                              .filter(
                                (userRole) =>
                                  userRole?.role?.name &&
                                  typeof userRole.role.name === "string",
                              )
                              .map((userRole, index) => (
                                <Badge
                                  key={index}
                                  variant={getRoleBadgeVariantLocal(userRole.role.name)}
                                  className="px-2 py-0.5 text-[10px] font-medium"
                                >
                                  {userRole.role.name}
                                </Badge>
                              ))}
                            {user.userRoles.length === 0 && (
                              <span className="text-xs italic text-muted-foreground">
                                No roles
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-3 lg:table-cell">
                          {user.userProfessionScopes &&
                          user.userProfessionScopes.length > 0 ? (
                            <ProfessionCoverageBadges
                              scopes={user.userProfessionScopes}
                              emptyMessage="-"
                            />
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              None
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden py-3 xl:table-cell">
                          <UserRatingCell userId={user.id} userRoles={user.userRoles} />
                        </TableCell>
                        <TableCell className="hidden py-3 lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell
                          className="py-3 pr-6 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                aria-label={`Actions for ${user.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => navigate(`/admin/users/${user.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {canManageUsers && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      navigate(`/admin/users/${user.id}/edit`)
                                    }
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setDeleteConfirm({
                                        isOpen: true,
                                        userId: user.id,
                                        userName: user.name,
                                      })
                                    }
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete User
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && !isLoading && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-muted/30 px-6 py-4 sm:flex-row">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {(pagination.page - 1) * 20 + 1}
                </span>
                –
                <span className="font-semibold text-foreground">
                  {Math.min(pagination.page * 20, pagination.total)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {pagination.total}
                </span>{" "}
                users
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
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
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-8 w-8 p-0 text-xs",
                          pagination.page === pageNum &&
                            "bg-indigo-600 hover:bg-indigo-700",
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
                  className="h-8 w-8 p-0"
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
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() =>
          setDeleteConfirm({ isOpen: false, userId: "", userName: "" })
        }
        onConfirm={handleDeleteUserConfirm}
        title={deleteConfirm.userName}
        itemType="user"
        isLoading={isDeleting}
      />
    </div>
  );
}
