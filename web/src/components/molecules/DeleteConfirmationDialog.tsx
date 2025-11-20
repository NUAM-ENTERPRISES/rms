/**
 * DeleteConfirmationDialog component - Common delete confirmation dialog
 * Following FE_GUIDELINES.md for consistent UI patterns
 * Replaces system alert boxes with proper modal dialogs
 */

import { AlertTriangle, Trash2, X } from "lucide-react";
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

export interface DeleteConfirmationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Function to call when dialog should be closed */
  onClose: () => void;
  /** Function to call when delete is confirmed */
  onConfirm: () => void;
  /** Title of the item being deleted */
  title: string;
  /** Type of item being deleted (e.g., "user", "project", "team") */
  itemType?: string;
  /** Additional description text */
  description?: string;
  /** Whether the delete action is in progress */
  isLoading?: boolean;
  /** Custom className for the dialog */
  className?: string;
}

/**
 * DeleteConfirmationDialog - A reusable delete confirmation dialog
 *
 * Features:
 * - Consistent styling across the application
 * - Proper accessibility with ARIA labels
 * - Loading states for async operations
 * - Customizable content and styling
 * - Follows design system patterns
 */
export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemType = "item",
  description,
  isLoading = false,
  className,
}: DeleteConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const defaultDescription = `Are you sure you want to delete ${itemType} "${title}"? This action cannot be undone.`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Confirm Deletion
              </DialogTitle>
              <DialogDescription className="text-slate-600 mt-1">
                {description || defaultDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {itemType}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
