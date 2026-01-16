import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { LoadingSpinner } from "@/components/ui";

interface SettingsConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  type: "edit" | "save";
  isLoading?: boolean;
  settingsType?: string;
}

export function SettingsConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  type,
  isLoading = false,
  settingsType = "settings",
}: SettingsConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    if (type === "edit") {
      onOpenChange(false);
    }
  };

  const config = {
    edit: {
      title: "Enable Edit Mode",
      description: `You are about to edit the ${settingsType}. Make sure you understand the impact of these changes on the system.`,
      confirmText: "Enable Editing",
      icon: Edit,
      iconBg: "bg-gradient-to-br from-amber-400 to-orange-500",
      confirmBg: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
    },
    save: {
      title: "Save Changes",
      description: `Are you sure you want to save these changes to ${settingsType}? This will immediately affect the system behavior.`,
      confirmText: "Save Changes",
      icon: Save,
      iconBg: "bg-gradient-to-br from-emerald-400 to-green-500",
      confirmBg: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700",
    },
  };

  const currentConfig = config[type];
  const Icon = currentConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-white">
        <DialogHeader className="space-y-4 pt-2">
          <div
            className={`h-16 w-16 rounded-2xl ${currentConfig.iconBg} flex items-center justify-center shadow-lg mx-auto`}
          >
            <Icon className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold text-center text-slate-900">
            {currentConfig.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-center text-slate-600 leading-relaxed">
            {currentConfig.description}
          </DialogDescription>
        </DialogHeader>

        {type === "save" && (
          <div className="mx-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Changes will take effect immediately. Please review your changes
              carefully before proceeding.
            </p>
          </div>
        )}

        {type === "edit" && (
          <div className="mx-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              You can cancel at any time without saving. All changes will be
              discarded if you cancel.
            </p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-3 mt-4 px-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 h-11 border-2 font-medium"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 h-11 ${currentConfig.confirmBg} text-white shadow-lg font-semibold`}
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="h-4 w-4 mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Icon className="h-4 w-4 mr-2" />
                {currentConfig.confirmText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
