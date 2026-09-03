import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUploadErrorMessage } from "@/lib/document-upload";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  FileStack,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useApplyDocumentBundleMutation,
  useCreateDocumentBundleMutation,
  useGetDocumentBundleQuery,
  useUpdateBundleSegmentMutation,
} from "../data/document-bundle.endpoints";
import type { UpdateSegmentPayload } from "../data/document-bundle.dto";
import {
  BundleSegmentReview,
  isCandidateMismatchWarning,
} from "./BundleSegmentReview";

interface MergedDocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  /** Called after documents are created so the tab can refresh its list. */
  onApplied?: () => void;
}

/** Matches MAX_BUNDLE_FILE_BYTES on the backend. */
const MAX_BUNDLE_MB = 50;
/** Classification runs in a background job; this is how often we check on it. */
const POLL_INTERVAL_MS = 3000;

/**
 * Upload one merged PDF of a candidate's paperwork, let AI split it into
 * individual documents, then review and save them.
 *
 * Nothing reaches the candidate's document list until a reviewer confirms at
 * least one segment and saves.
 */
export function MergedDocumentUploadModal({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  onApplied,
}: MergedDocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [createBundle, { isLoading: isUploading }] =
    useCreateDocumentBundleMutation();
  const [updateSegment, { isLoading: isSavingSegment }] =
    useUpdateBundleSegmentMutation();
  const [applyBundle, { isLoading: isApplying }] =
    useApplyDocumentBundleMutation();

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data, isFetching } = useGetDocumentBundleQuery(bundleId as string, {
    skip: !bundleId,
    // Polling stops as soon as the background job settles, so a modal left
    // open on the review step is not re-fetching every few seconds.
    pollingInterval: isAnalyzing ? POLL_INTERVAL_MS : 0,
  });

  const bundle = data?.bundle;

  useEffect(() => {
    setIsAnalyzing(
      bundle?.status === "queued" || bundle?.status === "analyzing"
    );
  }, [bundle?.status]);

  const segments = useMemo(
    () => [...(bundle?.segments ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [bundle?.segments]
  );
  const confirmedCount = segments.filter(
    (segment) => segment.status === "confirmed"
  ).length;
  const mismatchCount = segments.filter((segment) =>
    (segment.warnings ?? []).some(isCandidateMismatchWarning)
  ).length;

  useEffect(() => {
    if (!open) {
      setFile(null);
      setBundleId(null);
      setFileError(null);
      setIsAnalyzing(false);
    }
  }, [open]);

  const handleFileChange = (selected: File | null) => {
    setFileError(null);
    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.type !== "application/pdf") {
      setFileError("Merged bundles must be a PDF.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_BUNDLE_MB * 1024 * 1024) {
      setFileError(`Please upload a file of ${MAX_BUNDLE_MB} MB or less.`);
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      const response = await createBundle({ candidateId, file }).unwrap();
      setIsAnalyzing(true);
      setBundleId(response.bundle.id);
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    }
  };

  const handleSegmentChange = async (
    segmentId: string,
    changes: UpdateSegmentPayload
  ) => {
    if (!bundleId) return;
    try {
      await updateSegment({ bundleId, segmentId, changes }).unwrap();
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    }
  };

  const handleApply = async () => {
    if (!bundleId) return;
    try {
      const result = await applyBundle({ bundleId, candidateId }).unwrap();
      if (result.failed > 0) {
        toast.warning(
          `Saved ${result.applied} document${result.applied === 1 ? "" : "s"}, ${result.failed} could not be saved.`
        );
      } else {
        toast.success(
          `Saved ${result.applied} document${result.applied === 1 ? "" : "s"} to ${candidateName}.`
        );
      }
      onApplied?.();
      if (result.failed === 0) onOpenChange(false);
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,900px)] w-[min(100%,calc(100vw-1.5rem))] flex-col gap-0 overflow-hidden p-0",
          "sm:max-w-5xl lg:max-w-6xl",
        )}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b border-border px-6 py-5 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileStack className="h-5 w-5 text-primary" aria-hidden="true" />
            Upload merged documents
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Upload one PDF containing {candidateName}&apos;s resume,
            certificates, passport and photo. It is split into separate
            documents for you to review before anything is saved.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {!bundleId && (
            <div className="mx-auto max-w-xl space-y-4">
              <div className="space-y-2">
                <Label htmlFor="merged-pdf">Merged PDF</Label>
                <Input
                  id="merged-pdf"
                  type="file"
                  accept="application/pdf"
                  disabled={isUploading}
                  onChange={(event) =>
                    handleFileChange(event.target.files?.[0] ?? null)
                  }
                  aria-invalid={Boolean(fileError)}
                  aria-describedby={fileError ? "merged-pdf-error" : undefined}
                />
                {fileError ? (
                  <p
                    id="merged-pdf-error"
                    role="alert"
                    className="flex items-center gap-1.5 text-xs text-destructive"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    {fileError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    PDF only, up to {MAX_BUNDLE_MB} MB. Scanned pages are read
                    automatically.
                  </p>
                )}
              </div>
            </div>
          )}

          {bundleId && isAnalyzing && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Reading the document
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Finding where each document starts and ends. This usually
                  takes under a minute.
                </p>
              </div>
            </div>
          )}

          {bundle?.status === "failed" && (
            <div className="rounded-xl bg-destructive/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertCircle className="h-4 w-4" />
                Could not read this file
              </p>
              <p className="mt-1 text-xs text-destructive">
                {bundle.error ?? "Try uploading the PDF again."}
              </p>
            </div>
          )}

          {bundle && !isAnalyzing && bundle.status !== "failed" && (
            <div className="space-y-4">
              {mismatchCount > 0 ? (
                <div
                  className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
                  role="alert"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Candidate mismatch
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-destructive">
                    {mismatchCount} document
                    {mismatchCount === 1 ? "" : "s"} appear to belong to someone
                    else (including work certificates). Skip those segments and
                    upload {candidateName}&apos;s own PDF instead.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                  {segments.length} document
                  {segments.length === 1 ? "" : "s"} found in{" "}
                  {bundle.pageCount ?? 0} pages
                </p>
                {isFetching && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {segments.length === 0 ? (
                <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  No documents could be identified in this file. Upload the
                  pages individually instead.
                </p>
              ) : (
                <div className="grid gap-3">
                  {segments.map((segment) => (
                    <BundleSegmentReview
                      key={segment.id}
                      segment={segment}
                      pageCount={bundle.pageCount ?? 0}
                      isSaving={isSavingSegment}
                      onChange={(changes) =>
                        handleSegmentChange(segment.id, changes)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/30 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!bundleId && (
              <Button
                type="button"
                onClick={handleUpload}
                disabled={!file || isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Upload and analyze
              </Button>
            )}

            {bundle && !isAnalyzing && segments.length > 0 && (
              <Button
                type="button"
                onClick={handleApply}
                disabled={confirmedCount === 0 || isApplying}
              >
                {isApplying && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save {confirmedCount || ""} document
                {confirmedCount === 1 ? "" : "s"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
