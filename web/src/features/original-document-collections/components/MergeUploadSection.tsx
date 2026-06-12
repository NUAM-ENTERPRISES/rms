import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileStack, Loader2, ExternalLink, Eye, Upload } from "lucide-react";
import { toast } from "sonner";
import { useUploadCollectionMergeMutation } from "../api";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import type { OriginalDocumentCollection } from "../types";
import { cn } from "@/lib/utils";

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
  
  const handleUpload = async () => {
    if (!selectedFiles.length) {
      toast.error("Select at least one scan file");
      return;
    }
    try {
      await uploadMerge({ id: collection.id, files: selectedFiles }).unwrap();
      toast.success(
        collection.mergedDocument
          ? "Merged document replaced with new upload"
          : "Merged document uploaded",
      );
      setSelectedFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      onUpdated?.();
    } catch {
      toast.error("Failed to upload merged document");
    }
  };

  return (
    <>
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-purple-50/50 to-transparent py-2.5 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100">
              <Upload className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <CardTitle className="text-sm font-semibold">
              Step 2: Upload Merged Scan
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {collection.mergedDocument ? (
            <div className="rounded-lg border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <FileStack className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-900">
                      Merged Document Uploaded
                    </p>
                  </div>
                  <p className="text-xs text-emerald-700 truncate">
                    <span className="font-medium">File:</span>{" "}
                    {collection.mergedDocument.fileName}
                  </p>
                  <p className="text-xs text-emerald-700 font-mono mt-0.5">
                    <span className="font-medium">ID:</span>{" "}
                    {collection.mergedDocumentId}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPdfViewer(true)}
                    className="h-8 w-8 p-0 border-emerald-300 hover:bg-emerald-100"
                    title="Preview PDF"
                  >
                    <Eye className="h-3.5 w-3.5 text-emerald-700" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 w-8 p-0 border-emerald-300 hover:bg-emerald-100"
                    title="Open in new tab"
                  >
                    <a
                      href={collection.mergedDocument.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-emerald-700" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">
                Upload one pre-merged PDF or multiple image/PDF scans to merge.
              </p>
            </div>
          )}

          {collection.mergeHistory && collection.mergeHistory.length > 0 ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
              <p className="text-[10px] text-blue-700">
                Re-uploading will archive the current merge and save a new combined
                scan ({collection.mergeHistory.length} prior merge
                {collection.mergeHistory.length !== 1 ? "s" : ""} on file).
              </p>
            </div>
          ) : null}

          <div className="space-y-2.5">
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-3">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                onChange={(e) =>
                  setSelectedFiles(Array.from(e.target.files ?? []))
                }
                aria-label="Select scan files to merge"
              />
              {selectedFiles.length > 0 && (
                <p className="text-[10px] text-slate-600 mt-2">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isLoading || !selectedFiles.length}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Save Merge
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PDF Viewer Modal */}
      {collection.mergedDocument && (
        <PDFViewer
          fileUrl={collection.mergedDocument.fileUrl}
          fileName={collection.mergedDocument.fileName}
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
        />
      )}
    </>
  );
}
