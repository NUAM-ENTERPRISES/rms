import { useRef, useState } from "react";
import { Download, Eye, FileStack, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { useCan } from "@/hooks/useCan";
import { useUploadEventCollectionMergeMutation } from "../api";
import type { CollectionMergedDocument } from "../types";

interface EventMergeUploadRowProps {
  collectionId: string;
  eventId: string;
  eventLabel: string;
  mergedDocument?: CollectionMergedDocument | null;
  disabled?: boolean;
  onUpdated?: () => void;
}

function triggerDownload(fileUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = fileName;
  link.target = "_blank";
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function EventMergeUploadRow({
  collectionId,
  eventId,
  eventLabel,
  mergedDocument,
  disabled = false,
  onUpdated,
}: EventMergeUploadRowProps) {
  const canWrite = useCan("write:documents");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [uploadEventMerge, { isLoading }] = useUploadEventCollectionMergeMutation();

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      toast.error("Select at least one scan file");
      return;
    }
    try {
      await uploadEventMerge({
        collectionId,
        eventId,
        files: selectedFiles,
      }).unwrap();
      toast.success("Event merge uploaded and collection PDF updated");
      setSelectedFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      onUpdated?.();
    } catch {
      toast.error("Failed to upload event merge");
    }
  };

  if (!canWrite && !mergedDocument) return null;

  return (
    <>
      <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
        <div className="mb-2 flex items-center gap-2">
          <FileStack className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">
            Event merged scan — {eventLabel}
          </p>
        </div>

        {mergedDocument ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {mergedDocument.fileName}
            </p>
            <div className="flex shrink-0 gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2"
                onClick={() => setShowPdfViewer(true)}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2"
                onClick={() =>
                  triggerDownload(
                    mergedDocument.fileUrl,
                    mergedDocument.fileName,
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Upload a merged PDF or scans for documents received in this event.
          </p>
        )}

        {canWrite && !disabled ? (
          <div className="mt-2 space-y-2">
            <Input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              className="h-9 text-xs"
              onChange={(e) =>
                setSelectedFiles(Array.from(e.target.files ?? []))
              }
              aria-label={`Select scan files for ${eventLabel}`}
            />
            <Button
              type="button"
              size="sm"
              className="w-full gap-2"
              onClick={handleUpload}
              disabled={isLoading || !selectedFiles.length}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {mergedDocument ? "Replace event merge" : "Upload event merge"}
            </Button>
          </div>
        ) : null}
      </div>

      {mergedDocument ? (
        <PDFViewer
          key={mergedDocument.id}
          fileUrl={mergedDocument.fileUrl}
          fileName={mergedDocument.fileName}
          cacheKey={mergedDocument.id}
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
        />
      ) : null}
    </>
  );
}
