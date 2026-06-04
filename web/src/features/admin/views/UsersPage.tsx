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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DeleteConfirmationDialog } from "@/components/ui";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import { useSystemConfig, getRoleBadgeVariant } from "@/hooks/useSystemConfig";
import {
  useGetUsersQuery,
  useDeleteUserMutation,
  type UserAccountStatus,
} from "@/features/admin/api";
import { UserAccountStatusBadge } from "@/features/admin/components/UserAccountStatusBadge";
import { UserRatingCell } from "@/features/admin/components/UserRatingCell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const navigate = useNavigate();
  const canManageUsers = useCan("manage:users");
  const canReadUsers = useCan("read:users");

  // State for filters and pagination
  const [filters, setFilters] = useState<{
    search: string;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
    accountStatus: UserAccountStatus | "ALL";
  }>({
    search: "",
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
    accountStatus: "ALL",
  });

  // State for delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: "",
    userName: "",
  });

  // API calls
  const { data: usersData, isLoading } = useGetUsersQuery({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    accountStatus:
      filters.accountStatus === "ALL" ? undefined : filters.accountStatus,
  });

  const { data: systemConfig } = useSystemConfig();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const users = usersData?.data?.users || [];
  const pagination = usersData?.data;

  // Handle search
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  // Handle delete user confirmation
  const handleDeleteUserClick = (userId: string, userName: string) => {
    setDeleteConfirm({
      isOpen: true,
      userId,
      userName,
    });
  };

  // Handle delete user confirmation
  const handleDeleteUserConfirm = async () => {
    try {
      await deleteUser(deleteConfirm.userId).unwrap();
      toast.success("User deleted successfully");
      setDeleteConfirm({ isOpen: false, userId: "", userName: "" });
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete user");
    }
  };

  // Handle delete user cancel
  const handleDeleteUserCancel = () => {
    setDeleteConfirm({ isOpen: false, userId: "", userName: "" });
  };

  // Format date - following FE guidelines: DD MMM YYYY
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Get role badge variant from system config
  const getRoleBadgeVariantLocal = (roleName: string) => {
    return getRoleBadgeVariant(roleName, systemConfig?.data);
  };

  if (!canReadUsers) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to view users.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="w-full mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading users...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 rounded-lg">
                <UsersIcon className="h-5 w-5 text-blue-600" />
              </div>
              User Management
            </h1>
            <p className="text-sm text-slate-500 mt-1 ml-11">
              {pagination?.total
                ? `${pagination.total} total user${pagination.total !== 1 ? "s" : ""}`
                : "Manage system users and their roles"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-slate-600 hover:text-slate-800 gap-2"
                  >
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
                size="sm"
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            )}
          </div>
        </div>

        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-10 bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-lg"
            />
          </div>
          <Select
            value={filters.accountStatus}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                accountStatus: value as UserAccountStatus | "ALL",
                page: 1,
              }))
            }
          >
            <SelectTrigger
              className="w-full sm:w-[180px] h-10 bg-white"
              aria-label="Filter by account status"
            >
              <SelectValue placeholder="Account status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table Card */}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider pl-6">
                      User
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">
                      Contact
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider">
                      Roles
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider hidden xl:table-cell">
                      Rating
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider hidden lg:table-cell">
                      Joined
                    </TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider text-right pr-6 w-[60px]">
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const accountStatus = user.accountStatus ?? "ACTIVE";
                    const isNonActive = accountStatus !== "ACTIVE";
                    return (
                    <TableRow
                      key={user.id}
                      className={cn(
                        "transition-colors cursor-pointer group",
                        isNonActive
                          ? "bg-destructive/10 hover:bg-destructive/15"
                          : "hover:bg-blue-50/40",
                      )}
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      <TableCell className="pl-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-slate-200">
                            {user.profileImage ? (
                              <AvatarImage
                                src={user.profileImage}
                                alt={user.name}
                              />
                            ) : null}
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-semibold">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 text-sm truncate group-hover:text-blue-700 transition-colors">
                              {user.name}
                            </div>
                            {user.employeeCode ? (
                              <div className="mt-1">
                                <Badge
                                  variant="outline"
                                  className="text-[11px] font-semibold tracking-wide bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  {user.employeeCode}
                                </Badge>
                              </div>
                            ) : null}
                            <div className="text-xs text-slate-400 truncate md:hidden">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 hidden md:table-cell">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[220px]">
                              {user.email}
                            </span>
                          </div>
                          {user.mobileNumber && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                              <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                              {user.mobileNumber}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <UserAccountStatusBadge status={accountStatus} />
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.userRoles
                            .filter(
                              (userRole) =>
                                userRole?.role?.name &&
                                typeof userRole.role.name === "string"
                            )
                            .map((userRole, index) => (
                              <Badge
                                key={index}
                                variant={getRoleBadgeVariantLocal(
                                  userRole.role.name
                                )}
                                className="text-[11px] font-medium px-2 py-0.5"
                              >
                                {userRole.role.name}
                              </Badge>
                            ))}
                          {user.userRoles.length === 0 && (
                            <span className="text-xs text-slate-400 italic">
                              No roles
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 hidden xl:table-cell">
                        <UserRatingCell userId={user.id} userRoles={user.userRoles} />
                      </TableCell>
                      <TableCell className="py-3 hidden lg:table-cell">
                        <span className="text-sm text-slate-500">
                          {formatDate(user.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-right pr-6 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/admin/users/${user.id}`)
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canManageUsers && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/admin/users/${user.id}/edit`)
                                  }
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteUserClick(user.id, user.name)
                                  }
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
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

            {/* Empty State */}
            {users.length === 0 && (
              <div className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
                  <UsersIcon className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-1">
                  No users found
                </h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                  {filters.search
                    ? "No users match your search. Try a different keyword."
                    : "Get started by adding your first user to the system."}
                </p>
                {!filters.search && canManageUsers && (
                  <Button
                    onClick={() => navigate("/admin/users/create")}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First User
                  </Button>
                )}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-700">
                    {(pagination.page - 1) * filters.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-slate-700">
                    {Math.min(
                      pagination.page * filters.limit,
                      pagination.total
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-700">
                    {pagination.total}
                  </span>{" "}
                  users
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.max(1, prev.page - 1),
                      }))
                    }
                    disabled={pagination.page <= 1}
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
                      } else if (
                        pagination.page >= pagination.totalPages - 2
                      ) {
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
                          className={`h-8 w-8 p-0 text-xs ${
                            pagination.page === pageNum
                              ? "bg-blue-600 hover:bg-blue-700"
                              : ""
                          }`}
                          onClick={() =>
                            setFilters((prev) => ({ ...prev, page: pageNum }))
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.min(pagination.totalPages, prev.page + 1),
                      }))
                    }
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={handleDeleteUserCancel}
        onConfirm={handleDeleteUserConfirm}
        title={deleteConfirm.userName}
        itemType="user"
        isLoading={isDeleting}
      />
    </div>
  );
}
