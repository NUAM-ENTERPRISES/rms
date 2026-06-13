import { Button } from "@/components/ui/button";
import { FileCheck, Loader2 } from "lucide-react";

interface VerifyAllDocumentsButtonProps {
  pendingCount: number;
  isVerifyingAll: boolean;
  onVerifyAll: () => void | Promise<void>;
  disabled?: boolean;
}

export default function VerifyAllDocumentsButton({
  pendingCount,
  isVerifyingAll,
  onVerifyAll,
  disabled = false,
}: VerifyAllDocumentsButtonProps) {
  return (
    <Button
      type="button"
      size="default"
      variant="default"
      className="h-10 px-4 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
      onClick={onVerifyAll}
      disabled={disabled || isVerifyingAll || pendingCount === 0}
      title={
        pendingCount === 0
          ? "Upload documents first, then verify all"
          : `Verify all ${pendingCount} uploaded document${pendingCount === 1 ? "" : "s"}`
      }
    >
      {isVerifyingAll ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileCheck className="h-4 w-4 mr-2" />
      )}
      Verify All{pendingCount > 0 ? ` (${pendingCount})` : ""}
    </Button>
  );
}
