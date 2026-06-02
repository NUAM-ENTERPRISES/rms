import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui";
import type { UserAccountStatus } from "@/features/admin/api";
import { UserAccountStatusBadge } from "./UserAccountStatusBadge";

const schema = z.object({
  remarks: z
    .string({ required_error: "Remarks are required" })
    .trim()
    .min(3, "Remarks are required and must be at least 3 characters")
    .max(2000, "Remarks cannot exceed 2000 characters"),
});

type FormValues = z.infer<typeof schema>;

const ACTION_LABELS: Record<UserAccountStatus, string> = {
  ACTIVE: "Mark as active",
  INACTIVE: "Mark as inactive",
  BLOCKED: "Block user",
};

interface ChangeUserAccountStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStatus: UserAccountStatus;
  userName: string;
  isSubmitting?: boolean;
  onConfirm: (remarks: string) => void | Promise<void>;
}

export function ChangeUserAccountStatusDialog({
  open,
  onOpenChange,
  targetStatus,
  userName,
  isSubmitting = false,
  onConfirm,
}: ChangeUserAccountStatusDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { remarks: "" },
  });

  useEffect(() => {
    if (!open) {
      reset({ remarks: "" });
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await onConfirm(values.remarks.trim());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-slate-200 shadow-lg bg-background">
        <DialogHeader>
          <DialogTitle>{ACTION_LABELS[targetStatus]}</DialogTitle>
          <DialogDescription>
            Update account status for{" "}
            <span className="font-medium text-foreground">{userName}</span>.
            You must enter remarks for every status change (active, inactive, or
            block). They are stored permanently in the activity history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">New status:</span>
            <UserAccountStatusBadge status={targetStatus} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-status-remarks">
              Remarks <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="account-status-remarks"
              rows={4}
              placeholder="Enter reason for this status change (required)..."
              aria-required="true"
              aria-invalid={!!errors.remarks}
              aria-describedby={
                errors.remarks ? "account-status-remarks-error" : undefined
              }
              {...register("remarks")}
            />
            {errors.remarks && (
              <p
                id="account-status-remarks-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.remarks.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={targetStatus === "BLOCKED" ? "destructive" : "default"}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                ACTION_LABELS[targetStatus]
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
