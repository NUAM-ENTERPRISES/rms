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
  MapPin,
  CheckCircle2,
  Languages,
  Globe2,
  Truck,
  ChevronLeft,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { DeleteConfirmationDialog } from "@/components/ui";
import {
  UpdatePasswordDialog,
  ImageViewer,
  ProfessionCoverageBadges,
} from "@/components/molecules";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import { useSystemConfig, getRoleBadgeVariant } from "@/hooks/useSystemConfig";
import {
  useGetUserQuery,
  useGetUserPermissionsQuery,
  useDeleteUserMutation,
  useUpdateUserPasswordMutation,
} from "@/features/admin/api";
import { roleNameHasRecruiterCapabilities } from "@/features/admin/constants/recruiter-capability-roles";
import { UserAccountStatusCard } from "@/features/admin/components/UserAccountStatusCard";
import { UserAccountStatusHistoryCard } from "@/features/admin/components/UserAccountStatusHistoryCard";
import { UserAccountStatusBadge } from "@/features/admin/components/UserAccountStatusBadge";
import { UserRecruiterPerformanceCard } from "@/features/admin/components/UserRecruiterPerformanceCard";
import { cn } from "@/lib/utils";

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
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-muted/50 to-background px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 p-2.5 shadow-md">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground">{title}</h2>
              {description ? (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
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
  className,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30",
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </p>
      <div className="flex items-start gap-2.5 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
        <div className="min-w-0 break-words">{children}</div>
      </div>
    </div>
  );
}

const STAT_ACCENT_STYLES: Record<
  string,
  { card: string; icon: string; iconBg: string; value: string }
> = {
  indigo: {
    card: "from-indigo-50 via-white to-indigo-50/30 border-indigo-100",
    icon: "text-indigo-600",
    iconBg: "bg-indigo-100",
    value: "text-indigo-700",
  },
  emerald: {
    card: "from-emerald-50 via-white to-emerald-50/30 border-emerald-100",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-100",
    value: "text-emerald-700",
  },
  violet: {
    card: "from-violet-50 via-white to-violet-50/30 border-violet-100",
    icon: "text-violet-600",
    iconBg: "bg-violet-100",
    value: "text-violet-700",
  },
  amber: {
    card: "from-amber-50 via-white to-amber-50/30 border-amber-100",
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    value: "text-amber-700",
  },
};

function TooltipList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: string[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div className="space-y-1 text-white">
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-xs text-white/75">{emptyMessage}</p>
      </div>
    );
  }

  const visible = items.slice(0, 12);
  const remaining = items.length - visible.length;

  return (
    <div className="space-y-2 text-white">
      <p className="text-xs font-semibold">{title}</p>
      <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-white/90">
        {visible.map((item) => (
          <li key={item} className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {remaining > 0 ? (
        <p className="text-xs text-white/70">+{remaining} more</p>
      ) : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  subtitle,
  icon: Icon,
  accent,
  tooltip,
}: {
  label: string;
  value: number | string;
  subtitle: string;
  icon: LucideIcon;
  accent: keyof typeof STAT_ACCENT_STYLES;
  tooltip: React.ReactNode;
}) {
  const s = STAT_ACCENT_STYLES[accent];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "group relative cursor-default rounded-2xl border bg-gradient-to-br p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
            s.card,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className={cn("text-3xl font-bold tabular-nums", s.value)}>{value}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", s.iconBg)}>
              <Icon className={cn("h-5 w-5", s.icon)} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            <span>Hover for details</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        className="max-w-sm border-0 bg-slate-900 p-3 text-white shadow-lg"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

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
  "read:original_document_intake": { label: "View Original Document Intake" },
  "write:original_document_intake": { label: "Manage Original Document Intake" },
  "read:courier_management": { label: "View Courier Management" },
  "write:courier_management": { label: "Manage Courier Management" },
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
  "read:cre": { label: "View Operations" },
  "write:cre": { label: "Edit Operations" },
  "manage:cre": { label: "Manage Operations" },
  "assign:cre": { label: "Assign Operations" },
  "handle:rnr_candidates": { label: "Handle RNR Candidates" },
  "read:operations_call_history": { label: "View Operations Call History" },
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
  documents: { label: "Documents", icon: FileText, patterns: ["documents", "resubmission", "original_document_intake", "courier_management"] },
  processing: { label: "Processing", icon: ClipboardCheck, patterns: ["processing"] },
  interviews: { label: "Interviews", icon: Headphones, patterns: ["interviews"] },
  recruiters: { label: "Recruiters", icon: UserCheck, patterns: ["recruiters"] },
  cre: { label: "Operations", icon: Headphones, patterns: ["cre", "operations", "rnr_candidates"] },
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

function formatSectorScopeLabel(scope: string) {
  if (scope === "HEALTHCARE") return "Healthcare";
  if (scope === "NON_HEALTH_CARE") return "Non-healthcare";
  return scope.replace(/_/g, " ");
}

function formatProficiencyLabel(p: string) {
  return p.charAt(0) + p.slice(1).toLowerCase();
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

  const showRecruiterCapabilities = Boolean(
    user?.userRoles?.some((ur) => roleNameHasRecruiterCapabilities(ur.role.name))
  );

  const groupedPermissions = useMemo(() => groupPermissions(permissions), [permissions]);

  const permissionLabels = useMemo(
    () =>
      permissions.map(
        (p) =>
          PERMISSION_LABELS[p]?.label ||
          p.replace(/[_:]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      ),
    [permissions],
  );

  const accessAreaLabels = useMemo(
    () =>
      Object.entries(groupedPermissions).map(([catKey, perms]) => {
        const category = PERMISSION_CATEGORIES[catKey];
        const name = category?.label || "Other";
        return `${name} — ${perms.length} permission${perms.length !== 1 ? "s" : ""}`;
      }),
    [groupedPermissions],
  );

  const hasIntakeAccess = permissions.includes("read:original_document_intake");
  const hasCourierAccess = permissions.includes("read:courier_management");
  const hasDirectIntakeGrant =
    user?.documentsControlAccess?.originalDocumentIntakeEnabled ?? false;
  const hasDirectCourierGrant =
    user?.documentsControlAccess?.courierManagementEnabled ?? false;

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md border-border shadow-lg">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100">
              <Lock className="h-7 w-7 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You don&apos;t have permission to view user details.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="h-10 w-36 animate-pulse rounded-xl bg-muted" />
        <div className="h-44 animate-pulse rounded-2xl bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-2xl bg-muted lg:col-span-2" />
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Card className="max-w-md border-border shadow-lg">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <User className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">User Not Found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The user you&apos;re looking for doesn&apos;t exist or was removed.
            </p>
          </CardContent>
        </Card>
        <Button
          onClick={() => navigate("/admin/users")}
          className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Users
        </Button>
      </div>
    );
  }

  const accountStatus = user.accountStatus ?? "ACTIVE";

  return (
    <div className="w-full space-y-6">
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/admin/users")}
        className="gap-1.5 rounded-xl text-muted-foreground hover:text-foreground -ml-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Users
      </Button>

      {/* Profile hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 dark:from-indigo-950/20 dark:via-background dark:to-violet-950/10" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <ImageViewer
                title={user.name}
                src={user.profileImage || null}
                fallbackSrc={DEFAULT_PROFILE_IMAGE}
                className="h-24 w-24 shrink-0 rounded-2xl border-2 border-white shadow-lg ring-2 ring-indigo-100"
                ariaLabel={`View full image for ${user.name}`}
                enableHoverPreview
                hoverPosition="right"
                previewClassName="w-64 h-64"
              />
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {user.name}
                  </h1>
                  <UserAccountStatusBadge status={accountStatus} />
                </div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
                {user.employeeCode?.trim() ? (
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold tracking-wide"
                  >
                    {user.employeeCode}
                  </Badge>
                ) : null}
                {roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {roles
                      .filter((roleName) => roleName && typeof roleName === "string")
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
                ) : null}
              </div>
            </div>

            {canManageUsers ? (
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button
                  onClick={() => navigate(`/admin/users/${id}/edit`)}
                  className="h-10 gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:from-indigo-700 hover:to-violet-700"
                >
                  <Edit className="h-4 w-4" />
                  Edit User
                </Button>
                {canUpdatePassword ? (
                  <Button
                    onClick={handleUpdatePasswordClick}
                    variant="outline"
                    className="h-10 gap-2 rounded-xl"
                  >
                    <Key className="h-4 w-4" />
                    Password
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={handleDeleteUserClick}
                  disabled={isDeleting}
                  className="h-10 gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Roles"
            value={roles.length}
            subtitle="Assigned system roles"
            icon={Shield}
            accent="indigo"
            tooltip={
              <TooltipList
                title={`${roles.length} assigned role${roles.length !== 1 ? "s" : ""}`}
                items={roles}
                emptyMessage="No roles assigned to this user."
              />
            }
          />
          <StatTile
            label="Permissions"
            value={permissions.length}
            subtitle="Effective access rights"
            icon={Lock}
            accent="emerald"
            tooltip={
              <TooltipList
                title={`${permissions.length} permission${permissions.length !== 1 ? "s" : ""}`}
                items={permissionLabels}
                emptyMessage="No permissions assigned to this user."
              />
            }
          />
          <StatTile
            label="Access areas"
            value={Object.keys(groupedPermissions).length}
            subtitle="Permission categories"
            icon={BarChart3}
            accent="violet"
            tooltip={
              <TooltipList
                title={`${Object.keys(groupedPermissions).length} access area${Object.keys(groupedPermissions).length !== 1 ? "s" : ""}`}
                items={accessAreaLabels}
                emptyMessage="No access areas for this user."
              />
            }
          />
          <StatTile
            label="Member since"
            value={formatDate(user.createdAt)}
            subtitle="Account created on"
            icon={Calendar}
            accent="amber"
            tooltip={
              <div className="space-y-2 text-xs text-white">
                <p className="font-semibold">Account timeline</p>
                <div className="space-y-1.5">
                  <p>
                    <span className="font-medium text-white">Created: </span>
                    <span className="text-white/80">{formatDate(user.createdAt)}</span>
                  </p>
                  <p>
                    <span className="font-medium text-white">Last updated: </span>
                    <span className="text-white/80">{formatDate(user.updatedAt)}</span>
                  </p>
                  {user.accountStatusUpdatedAt ? (
                    <p>
                      <span className="font-medium text-white">Status changed: </span>
                      <span className="text-white/80">
                        {formatDate(user.accountStatusUpdatedAt)}
                      </span>
                    </p>
                  ) : null}
                  <p className="flex items-center gap-2 pt-1">
                    <span className="font-medium text-white">Current status:</span>
                    <UserAccountStatusBadge status={accountStatus} />
                  </p>
                </div>
              </div>
            }
          />
        </div>
      </TooltipProvider>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Basic Information" icon={User}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField icon={User} label="Full Name">
                {user.name}
              </InfoField>
              <InfoField icon={Briefcase} label="Employee Code">
                {user.employeeCode?.trim() ? user.employeeCode : "N/A"}
              </InfoField>
              <InfoField icon={Mail} label="Email Address">
                {user.email}
              </InfoField>
              {user.mobileNumber ? (
                <InfoField icon={Phone} label="Contact Number">
                  {user.countryCode && user.countryCode !== "N/A"
                    ? `${user.countryCode} `
                    : ""}
                  {user.mobileNumber}
                </InfoField>
              ) : null}
              {user.dateOfBirth ? (
                <InfoField icon={Calendar} label="Date of Birth">
                  {formatDate(user.dateOfBirth)}
                </InfoField>
              ) : null}
              <InfoField icon={Clock} label="Account Created">
                {formatDate(user.createdAt)}
              </InfoField>
              <InfoField icon={Clock} label="Last Updated">
                {formatDate(user.updatedAt)}
              </InfoField>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-muted/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                Profession Coverage
              </p>
              <ProfessionCoverageBadges
                scopes={user.userProfessionScopes}
                emptyMessage="No profession coverage assigned."
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField icon={MapPin} label="Country">
                {user.addressCountry?.name?.trim() ||
                  user.addressCountryCode?.trim() ||
                  "N/A"}
              </InfoField>
              <InfoField icon={MapPin} label="State / Province">
                {user.addressState?.name ?? "N/A"}
              </InfoField>
              <InfoField icon={MapPin} label="Street Address" className="sm:col-span-2">
                {user.address?.trim() ? user.address : "N/A"}
              </InfoField>
            </div>
          </SectionCard>

          {canReadUsers && user ? (
            <>
              <UserAccountStatusCard user={user} canManage={canManageUsers} />
              <UserAccountStatusHistoryCard userId={user.id} />
            </>
          ) : null}

          {showRecruiterCapabilities ? (
            <SectionCard
              title="Languages & Country Coverage"
              description="Shown for users with the Recruiter or Manager role."
              icon={Languages}
            >
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Languages
                  </p>
                  {user.userLanguages && user.userLanguages.length > 0 ? (
                    <ul className="space-y-2">
                      {user.userLanguages.map((row) => (
                        <li
                          key={row.id}
                          className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm"
                        >
                          <span className="font-medium text-foreground">
                            {row.language?.name ?? row.languageCode}
                          </span>
                          <Badge variant="outline" className="text-xs font-normal">
                            {formatProficiencyLabel(row.proficiency)}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No languages on file.</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Globe2 className="h-3.5 w-3.5" />
                    Country Coverage
                  </p>
                  {user.userCountryCoverages && user.userCountryCoverages.length > 0 ? (
                    <ul className="space-y-2">
                      {user.userCountryCoverages.map((row) => (
                        <li
                          key={row.id}
                          className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm"
                        >
                          <span className="font-medium text-foreground">
                            {row.country?.name ?? row.countryCode}
                          </span>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {row.sectorScopes?.map((scope) => (
                              <Badge
                                key={scope}
                                variant="secondary"
                                className="text-xs font-normal"
                              >
                                {formatSectorScopeLabel(scope)}
                              </Badge>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No country coverage on file.
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Documents Control Permissions"
            description="Effective access from role and direct user permissions."
            icon={FileText}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={hasIntakeAccess ? "default" : "outline"}
                className="text-xs font-normal"
              >
                <FileText className="mr-1 h-3 w-3" />
                Original Document Intake
                {hasDirectIntakeGrant ? " (direct grant)" : ""}
              </Badge>
              <Badge
                variant={hasCourierAccess ? "default" : "outline"}
                className="text-xs font-normal"
              >
                <Truck className="mr-1 h-3 w-3" />
                Courier Management
                {hasDirectCourierGrant ? " (direct grant)" : ""}
              </Badge>
            </div>
            {!hasIntakeAccess && !hasCourierAccess ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No documents control permissions for this user.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Permissions"
            description={`What this user can do in the system (${permissions.length} permissions)`}
            icon={Lock}
            headerExtra={
              <div className="hidden sm:flex items-center gap-3 text-[10px] font-medium">
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="h-2 w-2 rounded-full border border-blue-300 bg-blue-100" />
                  View
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="h-2 w-2 rounded-full border border-amber-300 bg-amber-100" />
                  Edit
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <span className="h-2 w-2 rounded-full border border-red-300 bg-red-100" />
                  Manage
                </span>
              </div>
            }
          >
            {permissions.length > 0 ? (
              <div className="space-y-5">
                {Object.entries(groupedPermissions).map(([catKey, perms]) => {
                  const category = PERMISSION_CATEGORIES[catKey];
                  const CategoryIcon = category?.icon || Shield;
                  const categoryLabel = category?.label || "Other";

                  return (
                    <div key={catKey}>
                      <div className="mb-2 flex items-center gap-2">
                        <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {categoryLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {perms.map((perm, index) => {
                          const label =
                            PERMISSION_LABELS[perm]?.label ||
                            perm
                              .replace(/[_:]/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase());
                          const colorClass = getPermissionColor(perm);
                          const PermIcon = getPermissionIcon(perm);
                          return (
                            <span
                              key={index}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${colorClass}`}
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
              <div className="py-10 text-center">
                <Lock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No permissions assigned to this user
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <SectionCard title="Assigned Roles" icon={Shield}>
            <div className="space-y-2">
              {user.userRoles && user.userRoles.length > 0 ? (
                user.userRoles.map((userRole, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="mt-0.5 rounded-lg bg-indigo-100 p-2 dark:bg-indigo-950">
                      <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {userRole.role.name}
                      </p>
                      {userRole.role.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {userRole.role.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Shield className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No roles assigned</p>
                </div>
              )}
            </div>
          </SectionCard>

          {showRecruiterCapabilities ? (
            <UserRecruiterPerformanceCard userId={user.id} userName={user.name} />
          ) : null}
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
