/**
 * ConfirmationDialog component - Generic confirmation dialog
 * For actions that need user confirmation (non-destructive)
 */
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Function to call when dialog should be closed */
  onClose: () => void;
  /** Function to call when action is confirmed */
  onConfirm: () => void;
  /** Title of the dialog */
  title: string;
  /** Description text or React node */
  description?: string | React.ReactNode;
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Whether the action is in progress */
  isLoading?: boolean;
  /** Custom className for the dialog */
  className?: string;
  /** Icon to show (defaults to AlertCircle) */
  icon?: React.ReactNode;
  /** Color variant for the confirm button */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
}

/**
 * ConfirmationDialog - A reusable confirmation dialog
 *
 * Features:
 * - Consistent styling across the application
 * - Proper accessibility with ARIA labels
 * - Loading states for async operations
 * - Customizable content and styling
 * - Follows design system patterns
 */
export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  className,
  icon,
  variant = "default",
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const defaultIcon = (
    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
      <AlertCircle className="h-5 w-5 text-blue-600" />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icon || defaultIcon}
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-slate-900">
                {title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {description && (
          <div className="text-slate-600 text-sm leading-relaxed mt-2">
            {typeof description === 'string' ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              description
            )}
          </div>
        )}

        <DialogFooter className="mt-6 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
