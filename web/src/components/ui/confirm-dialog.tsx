import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "default",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-0 bg-white/95 backdrop-blur-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-3xl">
    
    {/* Decorative Background Element */}
    <div className={`absolute top-0 left-0 right-0 h-1.5 ${variant === 'destructive' ? 'bg-red-500' : 'bg-primary'}`} />

    <div className="p-8">
      <DialogHeader className="flex flex-col items-center gap-4">
        {variant === "destructive" && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="group relative"
          >
            {/* Soft Glow Effect */}
            <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative h-16 w-16 rounded-2xl bg-red-50 destination-red-100 flex items-center justify-center border border-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" strokeWidth={2.5} />
            </div>
          </motion.div>
        )}

        <div className="space-y-1.5 text-center">
          <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed text-slate-500 px-4">
            {description}
          </DialogDescription>
        </div>
      </DialogHeader>

      <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-8">
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="flex-1 h-12 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all rounded-xl"
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          className={
            variant === "destructive"
              ? "flex-1 h-12 bg-red-600 hover:bg-red-700 text-white shadow-[0_10px_20px_-10px_rgba(220,38,38,0.4)] font-semibold rounded-xl transition-all active:scale-[0.98]"
              : "flex-1 h-12 shadow-md rounded-xl active:scale-[0.98]"
          }
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </div>
  </DialogContent>
</Dialog>
  );
}
