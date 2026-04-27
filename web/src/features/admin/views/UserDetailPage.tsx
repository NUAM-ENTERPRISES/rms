import { useState, useMemo } from "react";
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
  Eye,
  PenLine,
  Settings,
  Users,
  Briefcase,
  FileText,
  BarChart3,
  UserCheck,
  Headphones,
  ClipboardCheck,
  Cog,
  Lock,
  CheckCircle2,
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
import { Separator } from "@/components/ui/separator";
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

// Permission display mapping
const PERMISSION_LABELS: Record<string, { label: string; description?: string }> = {
  "*": { label: "Full System Access", description: "Complete access to all features" },
  "read:all": { label: "View Everything", description: "Can view all data" },
  "write:all": { label: "Edit Everything", description: "Can edit all data" },
  "manage:all": { label: "Manage Everything", description: "Full control over all data" },
  "read:users": { label: "View Users" },
  "write:users": { label: "Edit Users" },
  "manage:users": { label: "Manage Users", description: "Create, edit & delete users" },
  "read:teams": { label: "View Teams" },
  "write:teams": { label: "Edit Teams" },
  "manage:teams": { label: "Manage Teams" },
  "read:assigned_teams": { label: "View Assigned Teams" },
  "write:assigned_teams": { label: "Edit Assigned Teams" },
  "read:projects": { label: "View Projects" },
  "write:projects": { label: "Edit Projects" },
  "manage:projects": { label: "Manage Projects" },
  "read:assigned_projects": { label: "View Assigned Projects" },
  "write:assigned_projects": { label: "Edit Assigned Projects" },
  "read:candidates": { label: "View Candidates" },
  "write:candidates": { label: "Edit Candidates" },
  "manage:candidates": { label: "Manage Candidates" },
  "read:assigned_candidates": { label: "View Assigned Candidates" },
  "write:assigned_candidates": { label: "Edit Assigned Candidates" },
  "nominate:candidates": { label: "Nominate Candidates" },
  "approve:candidates": { label: "Approve Candidates" },
  "reject:candidates": { label: "Reject Candidates" },
  "read:documents": { label: "View Documents" },
  "write:documents": { label: "Upload Documents" },
  "verify:documents": { label: "Verify Documents" },
  "manage:documents": { label: "Manage Documents" },
  "request:resubmission": { label: "Request Resubmission" },
  "read:processing": { label: "View Processing" },
  "write:processing": { label: "Edit Processing" },
  "manage:processing": { label: "Manage Processing" },
  "transfer:processing": { label: "Transfer to Processing" },
  "read:interviews": { label: "View Interviews" },
  "write:interviews": { label: "Edit Interviews" },
  "manage:interviews": { label: "Manage Interviews" },
  "schedule:interviews": { label: "Schedule Interviews" },
  "read:recruiters": { label: "View Recruiters" },
  "write:recruiters": { label: "Edit Recruiters" },
  "manage:recruiters": { label: "Manage Recruiters" },
  "read:cre": { label: "View CRE" },
  "write:cre": { label: "Edit CRE" },
  "manage:cre": { label: "Manage CRE" },
  "assign:cre": { label: "Assign CRE" },
  "handle:rnr_candidates": { label: "Handle RNR Candidates" },
  "read:roles": { label: "View Roles" },
  "write:roles": { label: "Edit Roles" },
  "manage:roles": { label: "Manage Roles" },
  "read:agents": { label: "View Agents" },
  "write:agents": { label: "Create Agents" },
  "edit:agents": { label: "Edit Agents" },
  "delete:agents": { label: "Delete Agents" },
  "read:clients": { label: "View Clients" },
  "write:clients": { label: "Edit Clients" },
  "manage:clients": { label: "Manage Clients" },
  "read:analytics": { label: "View Analytics" },
  "write:analytics": { label: "Edit Analytics" },
  "manage:analytics": { label: "Manage Analytics" },
  "read:settings": { label: "View Settings" },
  "write:settings": { label: "Edit Settings" },
  "manage:settings": { label: "Manage Settings" },
  "read:admin-dashboard": { label: "View Admin Dashboard" },
  "read:system_config": { label: "View System Config" },
  "manage:system_config": { label: "Manage System Config" },
  "read:audit": { label: "View Audit Logs" },
  "write:audit": { label: "Write Audit Logs" },
  "manage:audit": { label: "Manage Audit Logs" },
};

// Category grouping for permissions
const PERMISSION_CATEGORIES: Record<string, { label: string; icon: React.ElementType; patterns: string[] }> = {
  global: { label: "Global Access", icon: Shield, patterns: ["*", "read:all", "write:all", "manage:all"] },
  users: { label: "Users", icon: Users, patterns: ["users"] },
  teams: { label: "Teams", icon: Users, patterns: ["teams", "assigned_teams"] },
  projects: { label: "Projects", icon: Briefcase, patterns: ["projects", "assigned_projects"] },
  candidates: { label: "Candidates", icon: UserCheck, patterns: ["candidates", "assigned_candidates"] },
  documents: { label: "Documents", icon: FileText, patterns: ["documents", "resubmission"] },
  processing: { label: "Processing", icon: ClipboardCheck, patterns: ["processing"] },
  interviews: { label: "Interviews", icon: Headphones, patterns: ["interviews"] },
  recruiters: { label: "Recruiters", icon: UserCheck, patterns: ["recruiters"] },
  cre: { label: "CRE", icon: Headphones, patterns: ["cre", "rnr_candidates"] },
  roles: { label: "Roles", icon: Shield, patterns: ["roles"] },
  clients: { label: "Clients", icon: Briefcase, patterns: ["clients"] },
  analytics: { label: "Analytics", icon: BarChart3, patterns: ["analytics"] },
  settings: { label: "Settings & Config", icon: Cog, patterns: ["settings", "system_config", "admin-dashboard"] },
  audit: { label: "Audit", icon: Eye, patterns: ["audit"] },
};

function getPermissionIcon(permission: string) {
  if (permission.startsWith("read:") || permission === "read:all") return Eye;
  if (permission.startsWith("write:") || permission === "write:all") return PenLine;
  if (permission.startsWith("manage:") || permission === "manage:all") return Settings;
  return CheckCircle2;
}

function getPermissionColor(permission: string) {
  if (permission === "*" || permission.includes("manage:all")) return "bg-purple-50 text-purple-700 border-purple-200";
  if (permission.startsWith("manage:")) return "bg-red-50 text-red-700 border-red-200";
  if (permission.startsWith("write:") || permission.startsWith("nominate:") || permission.startsWith("approve:") || permission.startsWith("reject:") || permission.startsWith("schedule:") || permission.startsWith("verify:") || permission.startsWith("assign:") || permission.startsWith("transfer:") || permission.startsWith("handle:") || permission.startsWith("request:")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (permission.startsWith("read:")) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function groupPermissions(permissions: string[]) {
  const grouped: Record<string, string[]> = {};

  for (const perm of permissions) {
    let placed = false;
    for (const [catKey, cat] of Object.entries(PERMISSION_CATEGORIES)) {
      if (cat.patterns.some((pattern) => perm === pattern || perm.includes(pattern))) {
        if (!grouped[catKey]) grouped[catKey] = [];
        grouped[catKey].push(perm);
        placed = true;
        break;
      }
    }
    if (!placed) {
      if (!grouped["other"]) grouped["other"] = [];
      grouped["other"].push(perm);
    }
  }

  return grouped;
}

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

  const groupedPermissions = useMemo(() => groupPermissions(permissions), [permissions]);

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
    currentPassword?: string;
    newPassword: string;
  }) => {
    try {
      await updatePassword({
        id: id!,
        ...(data.currentPassword ? { currentPassword: data.currentPassword } : {}),
        newPassword: data.newPassword,
      }).unwrap();
      toast.success(`Password updated successfully for ${user?.name || "user"}`);
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
      <div className="w-full mx-auto space-y-5">
        {/* Profile Header Card */}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <ImageViewer
                  title={user.name}
                  src={user.profileImage || null}
                  fallbackSrc={"https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"}
                  className="w-16 h-16 rounded-full border-2 border-slate-200 shadow-sm flex-shrink-0"
                  ariaLabel={`View full image for ${user.name}`}
                  enableHoverPreview={true}
                  hoverPosition="right"
                />
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-slate-900 truncate">
                    {user.name}
                  </h1>
                  <p className="text-sm text-slate-500 truncate">{user.email}</p>
                  {roles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
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
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {canManageUsers && (
                  <>
                    <Button
                      onClick={() => navigate(`/admin/users/${id}/edit`)}
                      size="sm"
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {canUpdatePassword && (
                      <Button
                        onClick={handleUpdatePasswordClick}
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 gap-2"
                      >
                        <Key className="h-3.5 w-3.5" />
                        Password
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteUserClick}
                      disabled={isDeleting}
                      className="h-9 px-4 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column - User Info & Permissions */}
          <div className="lg:col-span-2 space-y-5">
            {/* Basic Information Card */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Full Name
                    </p>
                    <p className="text-sm font-medium text-slate-800">
                      {user.name}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Email Address
                    </p>
                    <p className="text-sm text-slate-800 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {user.email}
                    </p>
                  </div>

                  {user.mobileNumber && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Mobile Number
                      </p>
                      <p className="text-sm text-slate-800 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {user.countryCode && user.countryCode !== "N/A"
                          ? `${user.countryCode} `
                          : ""}
                        {user.mobileNumber}
                      </p>
                    </div>
                  )}

                  {user.dateOfBirth && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Date of Birth
                      </p>
                      <p className="text-sm text-slate-800 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(user.dateOfBirth)}
                      </p>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Account Created
                    </p>
                    <p className="text-sm text-slate-600 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(user.createdAt)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Last Updated
                    </p>
                    <p className="text-sm text-slate-600 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(user.updatedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions Card - Grouped & Human-Readable */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-blue-600" />
                      Permissions
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      What this user can do in the system ({permissions.length} permissions)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-medium">
                    <span className="flex items-center gap-1 text-blue-600">
                      <span className="w-2 h-2 rounded-full bg-blue-100 border border-blue-300" />
                      View
                    </span>
                    <span className="flex items-center gap-1 text-amber-600">
                      <span className="w-2 h-2 rounded-full bg-amber-100 border border-amber-300" />
                      Edit
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <span className="w-2 h-2 rounded-full bg-red-100 border border-red-300" />
                      Manage
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {permissions.length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(groupedPermissions).map(([catKey, perms]) => {
                      const category = PERMISSION_CATEGORIES[catKey];
                      const CategoryIcon = category?.icon || Shield;
                      const categoryLabel = category?.label || "Other";

                      return (
                        <div key={catKey}>
                          <div className="flex items-center gap-2 mb-2">
                            <CategoryIcon className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              {categoryLabel}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {perms.map((perm, index) => {
                              const label = PERMISSION_LABELS[perm]?.label || perm.replace(/[_:]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
                              const colorClass = getPermissionColor(perm);
                              const PermIcon = getPermissionIcon(perm);
                              return (
                                <span
                                  key={index}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border ${colorClass}`}
                                >
                                  <PermIcon className="h-3 w-3" />
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Lock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      No permissions assigned to this user
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Roles & Quick Info */}
          <div className="space-y-5">
            {/* Roles Card */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Assigned Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {user.userRoles && user.userRoles.length > 0 ? (
                    user.userRoles.map((userRole, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <div className="p-1.5 bg-blue-100 rounded-md mt-0.5">
                          <Shield className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {userRole.role.name}
                          </p>
                          {userRole.role.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {userRole.role.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center">
                      <Shield className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No roles assigned</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Quick Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-blue-50">
                    <span className="text-xs font-medium text-slate-600">Roles</span>
                    <span className="text-sm font-semibold text-blue-700">{roles.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-green-50">
                    <span className="text-xs font-medium text-slate-600">Permissions</span>
                    <span className="text-sm font-semibold text-green-700">{permissions.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-purple-50">
                    <span className="text-xs font-medium text-slate-600">Access Areas</span>
                    <span className="text-sm font-semibold text-purple-700">
                      {Object.keys(groupedPermissions).length}
                    </span>
                  </div>
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
        isAdminReset={true}
      />
    </div>
  );
}
