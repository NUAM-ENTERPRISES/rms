import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Key, Eye, EyeOff, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Password update schema
const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

export interface UpdatePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdatePassword: (data: UpdatePasswordFormData) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

/**
 * UpdatePasswordDialog - A dialog for updating user passwords
 *
 * Features:
 * - Password validation with strength requirements
 * - Show/hide password functionality
 * - Form validation with Zod
 * - Loading states
 * - Accessibility features
 */
export function UpdatePasswordDialog({
  isOpen,
  onClose,
  onUpdatePassword,
  isLoading = false,
  className,
}: UpdatePasswordDialogProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: UpdatePasswordFormData) => {
    try {
      await onUpdatePassword(data);
      form.reset();
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Key className="h-6 w-6 text-blue-600" />
            <DialogTitle className="text-xl font-semibold text-slate-800">
              Update Password
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-600 mt-2">
            Enter your current password and choose a new secure password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Current Password */}
          <div className="space-y-2">
            <Label
              htmlFor="currentPassword"
              className="text-sm font-medium text-slate-700"
            >
              Current Password
            </Label>
            <div className="relative">
              <Controller
                name="currentPassword"
                control={form.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter current password"
                    className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {form.formState.errors.currentPassword && (
              <p className="text-sm text-destructive">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label
              htmlFor="newPassword"
              className="text-sm font-medium text-slate-700"
            >
              New Password
            </Label>
            <div className="relative">
              <Controller
                name="newPassword"
                control={form.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {form.formState.errors.newPassword && (
              <p className="text-sm text-destructive">
                {form.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-slate-700"
            >
              Confirm New Password
            </Label>
            <div className="relative">
              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !form.formState.isValid}
              className="flex-1"
            >
              {isLoading ? (
                <LoadingSpinner className="h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
