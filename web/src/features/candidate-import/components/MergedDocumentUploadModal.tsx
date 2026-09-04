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
import { getDocumentTypeConfig } from "@/constants/document-types";
import { getUploadErrorMessage } from "@/lib/document-upload";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  FileStack,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useApplyDocumentBundleMutation,
  useCreateDocumentBundleMutation,
  useGetDocumentBundleQuery,
  useUpdateBundleProfileSuggestionsMutation,
  useUpdateBundleSegmentMutation,
} from "../data/document-bundle.endpoints";
import type {
  ApplyBundleResult,
  BundleProfileSuggestions,
  UpdateSegmentPayload,
} from "../data/document-bundle.dto";
import { BundleReviewWizard } from "./BundleReviewWizard";
import { validateProfileSuggestions } from "./BundleProfileReview";
import { isCandidateMismatchWarning } from "./BundleSegmentReview";

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

const EMPTY_PROFILE: BundleProfileSuggestions = {
  qualifications: [],
  workExperiences: [],
  resumeRole: null,
  identity: null,
};

/**
 * Upload one merged PDF of a candidate's paperwork, let AI split it into
 * individual documents and extract profile rows, then review and save.
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
  const [profileSuggestions, setProfileSuggestions] =
    useState<BundleProfileSuggestions>(EMPTY_PROFILE);

  const [createBundle, { isLoading: isUploading }] =
    useCreateDocumentBundleMutation();
  const [updateSegment, { isLoading: isSavingSegment }] =
    useUpdateBundleSegmentMutation();
  const [updateProfile] = useUpdateBundleProfileSuggestionsMutation();
  const [applyBundle, { isLoading: isApplying }] =
    useApplyDocumentBundleMutation();

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data } = useGetDocumentBundleQuery(bundleId as string, {
    skip: !bundleId,
    pollingInterval: isAnalyzing ? POLL_INTERVAL_MS : 0,
  });

  const bundle = data?.bundle;

  useEffect(() => {
    setIsAnalyzing(
      bundle?.status === "queued" || bundle?.status === "analyzing",
    );
  }, [bundle?.status]);

  useEffect(() => {
    if (!bundle || isAnalyzing) return;
    setProfileSuggestions(
      bundle.profileSuggestions ?? EMPTY_PROFILE,
    );
  }, [bundle?.id, bundle?.profileSuggestions, isAnalyzing]);

  const segments = useMemo(
    () =>
      [...(bundle?.segments ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [bundle?.segments],
  );
  const mismatchCount = segments.filter((segment) =>
    (segment.warnings ?? []).some(isCandidateMismatchWarning),
  ).length;

  useEffect(() => {
    if (!open) {
      setFile(null);
      setBundleId(null);
      setFileError(null);
      setIsAnalyzing(false);
      setProfileSuggestions(EMPTY_PROFILE);
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
    changes: UpdateSegmentPayload,
  ) => {
    if (!bundleId) return;
    try {
      await updateSegment({ bundleId, segmentId, changes }).unwrap();
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    }
  };

  const handleProfileChange = (next: BundleProfileSuggestions) => {
    setProfileSuggestions(next);
  };

  const handleApply = async () => {
    if (!bundleId) return;
    const profileError = validateProfileSuggestions(profileSuggestions);
    if (profileError) {
      toast.error(profileError);
      return;
    }
    try {
      // Persist latest local edits before apply in case a blur save is pending.
      await updateProfile({
        bundleId,
        profileSuggestions,
      }).unwrap();

      const result = await applyBundle({ bundleId, candidateId }).unwrap();
      const parts: string[] = [];
      if (result.applied > 0) {
        parts.push(
          `${result.applied} document${result.applied === 1 ? "" : "s"}`,
        );
      }
      if (result.qualificationsCreated > 0) {
        parts.push(
          `${result.qualificationsCreated} qualification${result.qualificationsCreated === 1 ? "" : "s"}`,
        );
      }
      if (result.workExperiencesCreated > 0) {
        parts.push(
          `${result.workExperiencesCreated} work experience${result.workExperiencesCreated === 1 ? "" : "s"}`,
        );
      }

      if (result.profileErrors?.length) {
        toast.warning(
          `Saved ${parts.join(", ") || "partial data"}. Some profile rows failed: ${result.profileErrors[0]}`,
        );
      } else if (result.failed > 0) {
        toast.warning(
          `Saved ${parts.join(", ") || "partial data"}; ${result.failed} document${result.failed === 1 ? "" : "s"} could not be saved. ${formatFailedDocuments(result.documents)}`,
        );
      } else {
        toast.success(
          `Saved ${parts.join(", ") || "updates"} to ${candidateName}.`,
        );
      }
      onApplied?.();
      if (result.failed === 0 && !(result.profileErrors?.length > 0)) {
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(94vh,960px)] w-[min(100%,calc(100vw-1.5rem))] flex-col gap-0 overflow-hidden p-0",
          "sm:max-w-6xl lg:max-w-7xl",
        )}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b border-border px-6 py-5 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileStack className="h-5 w-5 text-primary" aria-hidden="true" />
            Upload merged documents
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Upload one PDF containing {candidateName}&apos;s resume,
            certificates, passport and photo. After analysis you walk through
            each saveable document, then save them to the profile.
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
                <p className="max-w-md text-xs text-muted-foreground">
                  Splitting pages and extracting qualifications and work
                  experience from the resume. This usually takes under a minute.
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
            <div className="space-y-6">
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
                    else. Skip those steps and upload {candidateName}&apos;s
                    own PDF instead.
                  </p>
                </div>
              ) : null}

              <BundleReviewWizard
                candidateName={candidateName}
                bundleId={bundle.id}
                fileUrl={bundle.fileUrl}
                fileName={bundle.fileName}
                pageCount={bundle.pageCount ?? 0}
                segments={segments}
                profile={profileSuggestions}
                isSaving={isSavingSegment}
                isApplying={isApplying}
                onSegmentChange={handleSegmentChange}
                onProfileChange={handleProfileChange}
                onApply={handleApply}
              />
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

            {bundle && !isAnalyzing && bundle.status !== "failed" && (
              <p className="text-xs text-muted-foreground">
                Use Skip only for documents that should not be saved. Save to profile writes every remaining file.
              </p>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatFailedDocuments(
  documents: ApplyBundleResult["documents"] | undefined,
): string {
  if (!documents?.length) return "";
  return documents
    .filter((row) => row.error)
    .map((row) => {
      const label =
        getDocumentTypeConfig(row.docType)?.displayName ?? row.docType;
      return `${label}: ${row.error}`;
    })
    .join(" ");
}
