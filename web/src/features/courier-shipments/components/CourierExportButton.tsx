import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLazyExportCourierShipmentsQuery } from "../api";
import type { ListShipmentsParams } from "../types";
import { toast } from "sonner";

interface CourierExportButtonProps {
  filters?: ListShipmentsParams;
}

export function CourierExportButton({ filters }: CourierExportButtonProps) {
  const [exportCsv, { isFetching }] = useLazyExportCourierShipmentsQuery();

  const handleExport = async () => {
    try {
      const csv = await exportCsv(filters).unwrap();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "courier-shipments.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isFetching}
    >
      {isFetching ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Export
    </Button>
  );
}
