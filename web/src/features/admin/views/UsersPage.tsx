import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Users as UsersIcon,
  Mail,
  Phone,
  Calendar,
  Shield,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
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
import { DeleteConfirmationDialog } from "@/components/ui";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import { useSystemConfig, getRoleBadgeVariant } from "@/hooks/useSystemConfig";
import { useGetUsersQuery, useDeleteUserMutation } from "@/features/admin/api";

export default function UsersPage() {
  const navigate = useNavigate();
  const canManageUsers = useCan("manage:users");
  const canReadUsers = useCan("read:users");

  // State for filters and pagination
  const [filters, setFilters] = useState({
    search: "",
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc" as "asc" | "desc",
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
      <div className="min-h-screen p-6 bg-slate-50 dark:bg-black">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-black/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
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
      <div className="min-h-screen p-6 bg-slate-50 dark:bg-black">
        <div className="w-full mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-black/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Loading users...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      <div className="w-full mx-auto space-y-6">
        {/* Search & Filters Section */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-black/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Premium Search Bar with Enhanced Styling */}
              <div className="relative group">
                <div
                  className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300 ${
                    filters.search ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"
                  }`}
                >
                  <Search
                    className={`h-5 w-5 transition-transform duration-300 ${
                      filters.search ? "scale-110" : "scale-100"
                    }`}
                  />
                </div>
                <Input
                  placeholder="Search users by name or email..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-14 h-14 text-base border-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 hover:from-gray-100 hover:to-gray-200 dark:hover:from-slate-900 dark:hover:to-slate-800 focus:from-white focus:to-white dark:focus:from-slate-950 dark:focus:to-slate-950 focus:ring-2 focus:ring-blue-500/30 focus:shadow-lg transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md dark:text-white dark:placeholder:text-slate-500"
                />
                <div
                  className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${
                    filters.search ? "ring-2 ring-blue-500/20" : ""
                  }`}
                />
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Add New User Button */}
                {canManageUsers && (
                  <Button
                    onClick={() => navigate("/admin/users/create")}
                    className="h-10 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 gap-2 text-sm"
                  >
                    <Plus className="h-3 w-3" />
                    Create New User
                  </Button>
                )}

                {/* Export Button */}
                <Button
                  variant="outline"
                  className="h-10 px-3 text-gray-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-gray-900 dark:hover:text-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-slate-800 dark:hover:to-slate-800 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md gap-2 text-sm"
                >
                  <Download className="h-3 w-3" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table Card */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-black/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Users
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              {pagination?.total
                ? `Showing ${users.length} of ${pagination.total} users`
                : "Manage system users and their roles"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-black/50">
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                      User
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                      Contact
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                      Roles
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                      Created
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-slate-200 dark:border-slate-800"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-blue-100 dark:border-blue-900"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-100">
                              {user.name}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Mail className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                              <span className="truncate max-w-[200px]">
                                {user.email}
                              </span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Phone className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
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
                                className="text-xs"
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                {userRole.role.name}
                              </Badge>
                            ))}
                          {user.userRoles.length === 0 && (
                            <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                              No roles
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Calendar className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                          {formatDate(user.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="dark:bg-black dark:border-slate-800">
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/admin/users/${user.id}`)
                              }
                              className="dark:focus:bg-slate-800 dark:text-slate-200"
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
                                  className="dark:focus:bg-slate-800 dark:text-slate-200"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="dark:bg-black" />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteUserClick(user.id, user.name)
                                  }
                                  className="text-red-600 dark:text-red-400 dark:focus:bg-slate-800"
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Empty State */}
            {users.length === 0 && (
              <div className="pt-12 pb-12 text-center">
                <UsersIcon className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  No users found
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {filters.search
                    ? "Try adjusting your search criteria."
                    : "Get started by creating your first user."}
                </p>
                {!filters.search && canManageUsers && (
                  <Button
                    onClick={() => navigate("/admin/users/create")}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First User
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-black/80 backdrop-blur-sm border-slate-200 dark:border-slate-800">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.max(1, prev.page - 1),
                      }))
                    }
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.min(pagination.totalPages, prev.page + 1),
                      }))
                    }
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
