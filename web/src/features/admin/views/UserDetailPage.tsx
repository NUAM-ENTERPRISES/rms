import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
  Calendar,
  Shield,
  Edit,
  Trash2,
  User,
  Clock,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteConfirmationDialog } from "@/components/ui";
import { UpdatePasswordDialog, ImageViewer } from "@/components/molecules";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import { useSystemConfig, getRoleBadgeVariant } from "@/hooks/useSystemConfig";
import {
  useGetUserQuery,
  useGetUserPermissionsQuery,
  useDeleteUserMutation,
  useUpdateUserPasswordMutation,
} from "@/features/admin/api";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canManageUsers = useCan("manage:users");
  const canReadUsers = useCan("read:users");

  // Check if current user can update passwords (Manager, CEO, Director, System Admin)
  // For now, we'll use the manage:users permission as a proxy
  const canUpdatePassword = useCan("manage:users");

  const { data: userData, isLoading, error } = useGetUserQuery(id!);
  const { data: permissionsData } = useGetUserPermissionsQuery(id!);
  const { data: systemConfig } = useSystemConfig();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [updatePassword, { isLoading: isUpdatingPassword }] =
    useUpdateUserPasswordMutation();

  const user = userData?.data;
  const roles = user?.userRoles?.map((userRole) => userRole.role.name) || [];
  const permissions = permissionsData?.data || [];

  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // State for update password dialog
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);

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

  const handleDeleteUserClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteUserConfirm = async () => {
    if (!user) return;

    try {
      await deleteUser(id!).unwrap();
      toast.success("User deleted successfully");
      navigate("/admin/users");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete user");
    }
  };

  const handleDeleteUserCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleUpdatePasswordClick = () => {
    setShowUpdatePassword(true);
  };

  const handleUpdatePasswordClose = () => {
    setShowUpdatePassword(false);
  };

  const handleUpdatePassword = async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    try {
      await updatePassword({
        id: id!,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }).unwrap();
      toast.success("Password updated successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update password");
      throw error; // Re-throw to prevent dialog from closing
    }
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
                You don't have permission to view user details.
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
              <p className="text-slate-600">Loading user details...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                User Not Found
              </CardTitle>
              <CardDescription className="text-slate-600">
                The user you're looking for doesn't exist.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <Button onClick={() => navigate("/admin/users")}>
                Go to Users List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900">
              {user.name}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {canManageUsers && (
              <>
                <Button
                  onClick={() => navigate(`/admin/users/${id}/edit`)}
                  className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit User
                </Button>
                {canUpdatePassword && (
                  <Button
                    onClick={handleUpdatePasswordClick}
                    variant="outline"
                    className="h-11 px-6 border-slate-200 hover:border-slate-300"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Update Password
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleDeleteUserClick}
                  disabled={isDeleting}
                  className="h-11 px-6"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Full Name
                    </div>
                    <div className="text-sm font-medium text-slate-800">
                      {user.name}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Email
                    </div>
                    <div className="text-sm text-slate-800">{user.email}</div>
                  </div>

                  {/* Mobile Number */}
                  {user.mobileNumber && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        Mobile Number
                      </div>
                      <div className="text-sm text-slate-800">
                        {user.countryCode && user.countryCode !== "N/A"
                          ? `${user.countryCode} `
                          : ""}
                        {user.mobileNumber}
                      </div>
                    </div>
                  )}

                  {/* Date of Birth */}
                  {user.dateOfBirth && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Date of Birth
                      </div>
                      <div className="text-sm text-slate-800">
                        {formatDate(user.dateOfBirth)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-3 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Created At */}
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Created
                      </div>
                      <div className="text-sm text-slate-800">
                        {formatDate(user.createdAt)}
                      </div>
                    </div>

                    {/* Updated At */}
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Last Updated
                      </div>
                      <div className="text-sm text-slate-800">
                        {formatDate(user.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions Card */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Key className="h-4 w-4 text-blue-600" />
                  Permissions
                </CardTitle>
                <CardDescription className="text-sm">
                  Permissions granted through assigned roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {permissions.map((permission, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs font-mono"
                      >
                        {permission}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No permissions assigned
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Roles */}
          <div className="space-y-6">
            {/* Roles Card */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Roles
                </CardTitle>
                <CardDescription className="text-sm">
                  Assigned system roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {user.userRoles && user.userRoles.length > 0 ? (
                    user.userRoles.map((userRole, index) => (
                      <div
                        key={index}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="h-3 w-3 text-blue-600" />
                          <span className="text-sm font-medium text-slate-800">
                            {userRole.role.name}
                          </span>
                        </div>
                        {userRole.role.description && (
                          <p className="text-xs text-slate-500 ml-5">
                            {userRole.role.description}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No roles assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* <div>{JSON.stringify(user)}</div> */}
            {/* User Avatar Card */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-4">
                <div className="flex flex-col items-center text-center">
                  <ImageViewer
                    title={user.name}
                    src={user.profileImage || null}
                    fallbackSrc={"https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"}
                    className="w-16 h-16 rounded-full border-2 border-blue-100 shadow-lg mb-3"
                    ariaLabel={`View full image for ${user.name}`}
                    enableHoverPreview={true}
                    hoverPosition="left"
                  />

                  <h3 className="font-semibold text-slate-800 text-sm">
                    {user.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                  {roles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 justify-center">
                      {roles
                        .filter(
                          (roleName) => roleName && typeof roleName === "string"
                        )
                        .map((roleName, index) => (
                          <Badge
                            key={index}
                            variant={getRoleBadgeVariantLocal(roleName)}
                            className="text-xs"
                          >
                            {roleName}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={handleDeleteUserCancel}
        onConfirm={handleDeleteUserConfirm}
        title={user?.name || ""}
        itemType="user"
        isLoading={isDeleting}
      />

      {/* Update Password Dialog */}
      <UpdatePasswordDialog
        isOpen={showUpdatePassword}
        onClose={handleUpdatePasswordClose}
        onUpdatePassword={handleUpdatePassword}
        isLoading={isUpdatingPassword}
      />
    </div>
  );
}
