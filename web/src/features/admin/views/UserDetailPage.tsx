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
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import {
  useGetUserQuery,
  useGetUserRolesQuery,
  useGetUserPermissionsQuery,
  useDeleteUserMutation,
} from "@/features/admin/api";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canManageUsers = useCan("manage:users");
  const canReadUsers = useCan("read:users");

  const { data: userData, isLoading, error } = useGetUserQuery(id!);
  const { data: rolesData } = useGetUserRolesQuery(id!);
  const { data: permissionsData } = useGetUserPermissionsQuery(id!);
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const user = userData?.data;
  const roles = rolesData?.data || [];
  const permissions = permissionsData?.data || [];

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

  const handleDeleteUser = async () => {
    if (!user) return;

    if (
      !confirm(
        `Are you sure you want to delete user "${user.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteUser(id!).unwrap();
      toast.success("User deleted successfully");
      navigate("/admin/users");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete user");
    }
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case "ceo":
        return "default";
      case "director":
        return "default";
      case "manager":
        return "secondary";
      case "team head":
        return "secondary";
      case "team lead":
        return "outline";
      case "recruiter":
        return "outline";
      default:
        return "outline";
    }
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
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              {user.name}
            </h1>
            <p className="text-slate-600 mt-1">{user.email}</p>
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
                <Button
                  variant="destructive"
                  onClick={handleDeleteUser}
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
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name
                    </div>
                    <div className="text-base font-medium text-slate-800">
                      {user.name}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <div className="text-base text-slate-800">{user.email}</div>
                  </div>

                  {/* Phone */}
                  {user.phone && (
                    <div>
                      <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone
                      </div>
                      <div className="text-base text-slate-800">
                        {user.phone}
                      </div>
                    </div>
                  )}

                  {/* Date of Birth */}
                  {user.dateOfBirth && (
                    <div>
                      <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date of Birth
                      </div>
                      <div className="text-base text-slate-800">
                        {formatDate(user.dateOfBirth)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Created At */}
                    <div>
                      <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Created
                      </div>
                      <div className="text-base text-slate-800">
                        {formatDate(user.createdAt)}
                      </div>
                    </div>

                    {/* Updated At */}
                    <div>
                      <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Last Updated
                      </div>
                      <div className="text-base text-slate-800">
                        {formatDate(user.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions Card */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Key className="h-5 w-5 text-blue-600" />
                  Permissions
                </CardTitle>
                <CardDescription>
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
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Roles
                </CardTitle>
                <CardDescription>Assigned system roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.userRoles && user.userRoles.length > 0 ? (
                    user.userRoles.map((userRole, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-slate-800">
                            {userRole.role.name}
                          </span>
                        </div>
                        {userRole.role.description && (
                          <p className="text-xs text-slate-500 ml-6">
                            {userRole.role.description}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No roles assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* User Avatar Card */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-3xl mb-4">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-semibold text-slate-800 text-lg">
                    {user.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{user.email}</p>
                  {roles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1 justify-center">
                      {roles.map((role, index) => (
                        <Badge
                          key={index}
                          variant={getRoleBadgeVariant(role)}
                          className="text-xs"
                        >
                          {role}
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
    </div>
  );
}
