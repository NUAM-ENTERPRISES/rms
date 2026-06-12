import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLazyExportOriginalDocumentCollectionsQuery } from "../api";
import type { ListCollectionsParams } from "../types";

interface CollectionExportButtonProps {
  filters?: ListCollectionsParams;
}

export function CollectionExportButton({ filters }: CollectionExportButtonProps) {
  const [exportCsv, { isFetching }] =
    useLazyExportOriginalDocumentCollectionsQuery();

  const handleExport = async () => {
    try {
      const csv = await exportCsv(filters).unwrap();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "original-document-collections.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export register");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleExport}
      disabled={isFetching}
    >
      {isFetching ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export CSV
    </Button>
  );
}
