import { useState } from "react";
import { ShieldAlert, UserCheck, UserX } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useUpdateUserAccountStatusMutation,
  type UserAccountStatus,
  type UserWithRoles,
} from "@/features/admin/api";
import { UserAccountStatusBadge } from "./UserAccountStatusBadge";
import { ChangeUserAccountStatusDialog } from "./ChangeUserAccountStatusDialog";

interface UserAccountStatusCardProps {
  user: UserWithRoles;
  canManage: boolean;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function UserAccountStatusCard({
  user,
  canManage,
}: UserAccountStatusCardProps) {
  const status = user.accountStatus ?? "ACTIVE";
  const [pendingStatus, setPendingStatus] = useState<UserAccountStatus | null>(
    null,
  );
  const [updateStatus, { isLoading }] = useUpdateUserAccountStatusMutation();

  const handleConfirm = async (remarks: string) => {
    if (!pendingStatus) return;
    const trimmed = remarks.trim();
    if (trimmed.length < 3) {
      toast.error("Remarks are required (at least 3 characters)");
      return;
    }
    try {
      await updateStatus({
        id: user.id,
        body: { status: pendingStatus, remarks: trimmed },
      }).unwrap();
      toast.success("Account status updated successfully");
      setPendingStatus(null);
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to update account status";
      toast.error(message);
    }
  };

  const lastUpdated = formatDate(user.accountStatusUpdatedAt);

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-blue-600" aria-hidden />
            Account status
          </CardTitle>
          <CardDescription>
            Control whether this user can sign in and access the system.
            {lastUpdated ? ` Last updated ${lastUpdated}.` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Current:</span>
            <UserAccountStatusBadge status={status} />
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              {status !== "ACTIVE" && (
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={() => setPendingStatus("ACTIVE")}
                >
                  <UserCheck className="h-3.5 w-3.5" aria-hidden />
                  Mark active
                </Button>
              )}
              {status !== "INACTIVE" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setPendingStatus("INACTIVE")}
                >
                  <UserX className="h-3.5 w-3.5" aria-hidden />
                  Mark inactive
                </Button>
              )}
              {status !== "BLOCKED" && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setPendingStatus("BLOCKED")}
                >
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                  Block user
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingStatus && (
        <ChangeUserAccountStatusDialog
          open={!!pendingStatus}
          onOpenChange={(open) => {
            if (!open) setPendingStatus(null);
          }}
          targetStatus={pendingStatus}
          userName={user.name}
          isSubmitting={isLoading}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
