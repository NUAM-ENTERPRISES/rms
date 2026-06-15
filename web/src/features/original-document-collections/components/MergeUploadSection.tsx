import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Eye,
  FileStack,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  useRebuildCollectionMergeMutation,
  useUploadCollectionMergeMutation,
} from "../api";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import type { OriginalDocumentCollection } from "../types";

interface MergeUploadSectionProps {
  collection: OriginalDocumentCollection;
  onUpdated?: () => void;
}

export function MergeUploadSection({
  collection,
  onUpdated,
}: MergeUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [uploadMerge, { isLoading }] = useUploadCollectionMergeMutation();
  const [rebuildMerge, { isLoading: isRebuilding }] =
    useRebuildCollectionMergeMutation();

  const eventsWithMerge = collection.events.filter(
    (event) => event.mergedDocumentId,
  );

  const mergedDocument = collection.mergedDocument;
  const isPdfMerge =
    !mergedDocument?.mimeType ||
    mergedDocument.mimeType.includes("pdf") ||
    mergedDocument.fileName.toLowerCase().endsWith(".pdf");

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      toast.error("Select at least one scan file");
      return;
    }
    try {
      await uploadMerge({ id: collection.id, files: selectedFiles }).unwrap();
      toast.success(
        collection.mergedDocument
          ? "Combined merged document replaced"
          : "Combined merged document uploaded",
      );
      setSelectedFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      onUpdated?.();
    } catch {
      toast.error("Failed to upload merged document");
    }
  };

  const handleRebuild = async () => {
    try {
      await rebuildMerge(collection.id).unwrap();
      toast.success("Combined PDF rebuilt from event merges");
      onUpdated?.();
    } catch {
      toast.error("Failed to rebuild combined merge — upload event merges first");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="border-b py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Combined merged scan
          </CardTitle>
          <CardDescription>
            Built automatically when you upload each event merge. You can also
            upload or rebuild the full combined PDF here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {collection.mergedDocument ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <FileStack className="h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Combined document ready
                    </p>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {collection.mergedDocument.fileName}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => setShowPdfViewer(true)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    asChild
                  >
                    <a
                      href={collection.mergedDocument.fileUrl}
                      download={collection.mergedDocument.fileName}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Upload a merged scan on each intake event in the history section
              above. The combined PDF appears here automatically.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRebuild}
              disabled={isRebuilding || eventsWithMerge.length === 0}
            >
              {isRebuilding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Rebuild from events ({eventsWithMerge.length})
            </Button>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Or upload a single combined PDF manually (replaces current merge).
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
              onChange={(e) =>
                setSelectedFiles(Array.from(e.target.files ?? []))
              }
              aria-label="Select scan files to merge manually"
            />
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isLoading || !selectedFiles.length}
              className="w-full gap-2"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload manual combined merge
            </Button>
          </div>
        </CardContent>
      </Card>

      {mergedDocument && isPdfMerge ? (
        <PDFViewer
          key={mergedDocument.id}
          fileUrl={mergedDocument.fileUrl}
          fileName={mergedDocument.fileName}
          cacheKey={mergedDocument.id}
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
        />
      ) : null}

      {mergedDocument && !isPdfMerge ? (
        <Dialog open={showPdfViewer} onOpenChange={setShowPdfViewer}>
          <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden p-0">
            <DialogHeader className="border-b px-4 py-3">
              <DialogTitle className="truncate pr-8 text-base">
                {mergedDocument.fileName}
              </DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
              <img
                src={`${mergedDocument.fileUrl}${mergedDocument.fileUrl.includes("?") ? "&" : "?"}_cb=${mergedDocument.id}`}
                alt={mergedDocument.fileName}
                className="mx-auto max-h-[calc(92vh-6rem)] w-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
