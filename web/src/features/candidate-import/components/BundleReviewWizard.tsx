import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DepartmentSelect } from "@/components/molecules/DepartmentSelect";
import { JobTitleSelect } from "@/components/molecules/JobTitleSelect";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Files,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BundleIdentitySuggestion,
  BundleProfileSuggestions,
  BundleResumeRoleSuggestion,
  BundleSegment,
  SegmentExtractedFields,
  UpdateSegmentPayload,
} from "../data/document-bundle.dto";
import { usePreviewBundlePagesQuery } from "../data/document-bundle.endpoints";
import {
  BundleProfileReview,
  validateProfileSuggestions,
} from "./BundleProfileReview";
import { isCandidateMismatchWarning } from "./BundleSegmentReview";
import {
  buildWizardSteps,
  pageRangeLabel,
  stepPageRange,
  fillMissingPassportFields,
  validateWizardAdvance,
  type WizardStep,
} from "./bundle-wizard";

interface BundleReviewWizardProps {
  candidateName: string;
  bundleId: string;
  fileUrl: string;
  fileName?: string;
  pageCount: number;
  segments: BundleSegment[];
  profile: BundleProfileSuggestions;
  isSaving: boolean;
  isApplying: boolean;
  onSegmentChange: (
    segmentId: string,
    changes: UpdateSegmentPayload,
  ) => Promise<void> | void;
  onProfileChange: (next: BundleProfileSuggestions) => void;
  onApply: () => void;
}

const PHOTO_HELP =
  "Allowed: JPG, JPEG, PNG · Max 1 MB (larger images compressed on save)";

/**
 * Ordered recruiter review: one allow-listed document type at a time,
 * with a compact profile preview of what will land on the candidate.
 */
export function BundleReviewWizard({
  candidateName,
  bundleId,
  fileUrl,
  fileName = "Merged documents.pdf",
  pageCount,
  segments,
  profile,
  isSaving,
  isApplying,
  onSegmentChange,
  onProfileChange,
  onApply,
}: BundleReviewWizardProps) {
  const steps = useMemo(() => buildWizardSteps(segments), [segments]);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { docName?: string | null; extracted?: SegmentExtractedFields }>
  >({});
  const [skippedStepIds, setSkippedStepIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [viewer, setViewer] = useState<"merged" | "segment" | null>(null);

  useEffect(() => {
    setStepIndex((current) =>
      steps.length === 0 ? 0 : Math.min(current, steps.length - 1),
    );
  }, [steps.length]);

  const step = steps[stepIndex] ?? null;
  const resolveWizardStep = useCallback(
    (base: WizardStep): WizardStep => ({
      ...base,
      segments: base.segments.map((segment) => ({
        ...segment,
        docName: drafts[segment.id]?.docName ?? segment.docName,
        extracted:
          base.kind === "passport_copy"
            ? fillMissingPassportFields(
                {
                  ...(segment.extracted ?? {}),
                  ...(drafts[segment.id]?.extracted ?? {}),
                },
                profile.identity,
              )
            : {
                ...(segment.extracted ?? {}),
                ...(drafts[segment.id]?.extracted ?? {}),
              },
      })),
    }),
    [drafts, profile.identity],
  );

  const resolvedStep = useMemo(() => {
    if (!step) return null;
    return resolveWizardStep(step);
  }, [step, resolveWizardStep]);
  const pageRange = resolvedStep ? stepPageRange(resolvedStep) : null;
  const { data: segmentBlob, isFetching: isLoadingSegmentPdf } =
    usePreviewBundlePagesQuery(
      {
        bundleId,
        startPage: pageRange?.startPage ?? 1,
        endPage: pageRange?.endPage ?? 1,
      },
      { skip: !bundleId || !pageRange },
    );
  const [segmentPreviewUrl, setSegmentPreviewUrl] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (!segmentBlob) {
      setSegmentPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(segmentBlob);
    setSegmentPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [segmentBlob]);
  const isLast = stepIndex >= steps.length - 1;
  const experienceSegments = useMemo(
    () =>
      segments.filter(
        (segment) =>
          segment.docType === "experience_certificate" ||
          segment.docType === "experience_certificates",
      ),
    [segments],
  );

  const mismatchOnStep = Boolean(
    resolvedStep?.segments.some((segment) =>
      (segment.warnings ?? []).some(isCandidateMismatchWarning),
    ),
  );

  const persistStep = async (
    target: WizardStep,
    status: "confirmed" | "rejected",
    extra?: UpdateSegmentPayload,
  ) => {
    await Promise.all(
      target.segments.map((segment) =>
        onSegmentChange(segment.id, {
          status,
          docName: segment.docName,
          extracted: segment.extracted ?? undefined,
          ...extra,
        }),
      ),
    );
  };

  const handleNext = async () => {
    if (!resolvedStep) return;
    const error = validateWizardAdvance(resolvedStep, profile);
    if (error) {
      setStepError(error);
      return;
    }
    if (mismatchOnStep) {
      setStepError(
        "Skip this document — it does not belong to this candidate.",
      );
      return;
    }
    setStepError(null);
    setSkippedStepIds((previous) => {
      const next = new Set(previous);
      next.delete(resolvedStep.id);
      return next;
    });
    await persistStep(
      resolvedStep,
      "confirmed",
      currentStepPayload(resolvedStep, profile),
    );
    if (!isLast) setStepIndex((index) => index + 1);
  };

  const handleSkip = async () => {
    if (!resolvedStep) return;
    setStepError(null);
    setSkippedStepIds((previous) => new Set(previous).add(resolvedStep.id));
    await persistStep(resolvedStep, "rejected");
    if (!isLast) setStepIndex((index) => index + 1);
  };

  const persistUnskippedSteps = async (): Promise<boolean> => {
    for (let index = 0; index < steps.length; index += 1) {
      const base = steps[index];
      if (skippedStepIds.has(base.id)) continue;

      const resolved = resolveWizardStep(base);
      const mismatch = resolved.segments.some((segment) =>
        (segment.warnings ?? []).some(isCandidateMismatchWarning),
      );
      if (mismatch) {
        setStepIndex(index);
        setStepError(
          "Skip this document — it does not belong to this candidate.",
        );
        return false;
      }

      const error = validateWizardAdvance(resolved, profile);
      if (error) {
        setStepIndex(index);
        setStepError(error);
        return false;
      }

      await persistStep(
        resolved,
        "confirmed",
        currentStepPayload(resolved, profile),
      );
    }
    return true;
  };

  const handleApply = () => {
    const profileError = validateProfileSuggestions(profile);
    if (profileError) {
      setStepError(profileError);
      return;
    }
    onApply();
  };

  const handleSaveToProfile = async () => {
    const confirmed = await persistUnskippedSteps();
    if (!confirmed) return;
    handleApply();
  };

  if (steps.length === 0) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          No saveable documents were identified. You can still save
          qualifications and work history extracted from the file.
        </p>
        <BundleProfileReview
          suggestions={profile}
          experienceSegments={experienceSegments}
          disabled={isApplying}
          onChange={onProfileChange}
        />
        <IdentityPreview
          identity={profile.identity}
          onChange={(identity) =>
            onProfileChange({ ...profile, identity })
          }
        />
        <div className="flex justify-end">
          <Button type="button" onClick={handleApply} disabled={isApplying}>
            {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save to profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <nav aria-label="Document steps">
        <ol className="flex flex-wrap gap-2">
          {steps.map((entry, index) => {
            const current = index === stepIndex;
            const done = index < stepIndex;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    current && "bg-primary text-primary-foreground",
                    done && !current && "bg-muted text-foreground",
                    !done && !current && "bg-muted/60 text-muted-foreground",
                  )}
                  aria-current={current ? "step" : undefined}
                  onClick={() => {
                    setStepError(null);
                    setStepIndex(index);
                  }}
                >
                  {index + 1} {entry.shortLabel}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-4">
          {resolvedStep ? (
            <StepBody
              step={resolvedStep}
              profile={profile}
              pageCount={pageCount}
              experienceSegments={experienceSegments}
              isSaving={isSaving || isApplying}
              mismatchOnStep={mismatchOnStep}
              onProfileChange={onProfileChange}
              onSegmentDraft={(segmentId, draft) =>
                setDrafts((previous) => ({
                  ...previous,
                  [segmentId]: { ...previous[segmentId], ...draft },
                }))
              }
              segmentPreviewUrl={segmentPreviewUrl}
              isLoadingSegmentPdf={isLoadingSegmentPdf}
              onViewThisDocument={() => setViewer("segment")}
              onViewMergedPdf={() => setViewer("merged")}
            />
          ) : null}
          {stepError ? (
            <p role="alert" className="text-xs text-destructive">
              {stepError}
            </p>
          ) : null}
        </div>

        <aside className="space-y-4 lg:border-l lg:border-border lg:pl-5">
          <p className="text-sm font-semibold text-foreground">
            Profile preview
          </p>
          <p className="text-xs text-muted-foreground">
            What will land on {candidateName}&apos;s profile when you save.
          </p>
          <IdentityPreview
            identity={profile.identity}
            onChange={(identity) =>
              onProfileChange({ ...profile, identity })
            }
          />
          <PreviewList
            title="Qualifications"
            items={profile.qualifications
              .filter((row) => row.included)
              .map(
                (row) =>
                  row.qualificationLabel ||
                  row.proposedNew?.name ||
                  row.rawLabel,
              )}
          />
          <PreviewList
            title="Work history"
            items={profile.workExperiences
              .filter((row) => row.included)
              .map((row) =>
                [row.companyName, row.jobTitleRaw].filter(Boolean).join(" · "),
              )}
          />
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          disabled={stepIndex === 0 || isSaving}
          onClick={() => {
            setStepError(null);
            setStepIndex((index) => Math.max(0, index - 1));
          }}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isSaving}
            onClick={handleSkip}
          >
            Skip
          </Button>
          {!isLast ? (
            <Button
              type="button"
              disabled={isSaving || mismatchOnStep}
              onClick={handleNext}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={
                isApplying ||
                (mismatchOnStep && !skippedStepIds.has(resolvedStep?.id ?? ""))
              }
              onClick={handleSaveToProfile}
            >
              {isApplying && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Check className="mr-2 h-4 w-4" />
              Save to profile
            </Button>
          )}
        </div>
      </div>

      <PDFViewer
        fileUrl={
          viewer === "segment" ? (segmentPreviewUrl ?? "") : fileUrl
        }
        fileName={
          viewer === "segment"
            ? `${resolvedStep?.label ?? "Document"}.pdf`
            : fileName
        }
        isOpen={
          viewer === "merged" ||
          (viewer === "segment" && Boolean(segmentPreviewUrl))
        }
        cacheKey={
          viewer === "segment"
            ? `${bundleId}-${pageRange?.startPage}-${pageRange?.endPage}`
            : fileUrl
        }
        onClose={() => setViewer(null)}
      />
    </div>
  );
}

function currentStepPayload(
  step: WizardStep,
  profile: BundleProfileSuggestions,
): UpdateSegmentPayload {
  if (step.kind === "resume") {
    return { docName: profile.resumeRole?.docName ?? null };
  }
  return {};
}

function StepBody({
  step,
  profile,
  pageCount,
  experienceSegments,
  isSaving,
  mismatchOnStep,
  onProfileChange,
  onSegmentDraft,
  segmentPreviewUrl,
  isLoadingSegmentPdf,
  onViewThisDocument,
  onViewMergedPdf,
}: {
  step: WizardStep;
  profile: BundleProfileSuggestions;
  pageCount: number;
  experienceSegments: BundleSegment[];
  isSaving: boolean;
  mismatchOnStep: boolean;
  onProfileChange: (next: BundleProfileSuggestions) => void;
  onSegmentDraft: (
    segmentId: string,
    draft: { docName?: string | null; extracted?: SegmentExtractedFields },
  ) => void;
  segmentPreviewUrl: string | null;
  isLoadingSegmentPdf: boolean;
  onViewThisDocument: () => void;
  onViewMergedPdf: () => void;
}) {
  const primary = step.segments[0];
  const config = getDocumentTypeConfig(step.kind);

  const patchPrimary = (draft: {
    docName?: string | null;
    extracted?: SegmentExtractedFields;
  }) => onSegmentDraft(primary.id, draft);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{step.label}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {pageRangeLabel(
            stepPageRange(step).startPage,
            stepPageRange(step).endPage,
          )}
          {step.segments.length > 1
            ? ` · ${step.segments.length} files`
            : ""}
          {pageCount > 0 ? ` of ${pageCount}` : ""}
        </p>
      </div>

      {mismatchOnStep ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
          role="alert"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Candidate mismatch
          </p>
          <p className="mt-1 text-xs text-destructive">
            Skip this document — it does not belong to this candidate.
          </p>
        </div>
      ) : null}

      <PagePreview
        previewUrl={segmentPreviewUrl}
        isLoading={isLoadingSegmentPdf}
        documentLabel={step.label}
        onViewThisDocument={onViewThisDocument}
        onViewMergedPdf={onViewMergedPdf}
      />

      {step.kind === "resume" ? (
        <ResumeStepFields
          profile={profile}
          disabled={isSaving}
          onProfileChange={onProfileChange}
        />
      ) : null}

      {step.kind === "degree_certificate" ? (
        <DocumentMetaFields
          segment={primary}
          typeLabel={config?.displayName ?? "Degree certificate"}
          disabled={isSaving}
          onChange={patchPrimary}
        />
      ) : null}

      {step.kind === "passport_photo" ? (
        <p className="text-xs text-muted-foreground">{PHOTO_HELP}</p>
      ) : null}

      {step.kind === "passport_copy" ? (
        <PassportFields
          segment={primary}
          disabled={isSaving}
          onChange={(extracted) => patchPrimary({ extracted })}
        />
      ) : null}

      {step.kind === "aadhaar" || step.kind === "registration_certificate" ? (
        <DocumentMetaFields
          segment={primary}
          typeLabel={config?.displayName ?? step.kind}
          showNumber
          disabled={isSaving}
          onChange={patchPrimary}
        />
      ) : null}

      {(step.kind === "resume" || step.kind === "degree_certificate") && (
        <BundleProfileReview
          suggestions={profile}
          experienceSegments={experienceSegments}
          disabled={isSaving}
          onChange={onProfileChange}
          sections={["qualifications"]}
          heading="Qualifications"
          description="Include or edit qualifications that will be saved to the profile."
        />
      )}

      {step.kind === "experience_certificate" ? (
        <BundleProfileReview
          suggestions={profile}
          experienceSegments={experienceSegments}
          disabled={isSaving}
          onChange={onProfileChange}
          sections={["work"]}
          heading="Work history"
          description="Department and title are required. Attach the matching experience letter when there is one."
        />
      ) : null}
    </div>
  );
}

function ResumeStepFields({
  profile,
  disabled,
  onProfileChange,
}: {
  profile: BundleProfileSuggestions;
  disabled: boolean;
  onProfileChange: (next: BundleProfileSuggestions) => void;
}) {
  const role: BundleResumeRoleSuggestion = profile.resumeRole ?? {
    departmentId: null,
    roleCatalogId: null,
    proposedDepartment: null,
    proposedRole: null,
    docName: "",
  };

  const patch = (next: Partial<BundleResumeRoleSuggestion>) => {
    onProfileChange({
      ...profile,
      resumeRole: { ...role, ...next },
    });
  };

  const willCreateDepartment =
    !role.departmentId && Boolean(role.proposedDepartment?.name?.trim());
  const willCreateRole =
    !role.roleCatalogId && Boolean(role.proposedRole?.label?.trim());

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="bundle-resume-type">Document type</Label>
        <Input id="bundle-resume-type" value="resume" readOnly />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bundle-resume-name">Document name (optional)</Label>
        <Input
          id="bundle-resume-name"
          value={role.docName ?? ""}
          disabled={disabled}
          placeholder="Type a document name"
          onChange={(event) => patch({ docName: event.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <DepartmentSelect
            label="Department"
            required
            disabled={disabled}
            value={role.departmentId ?? ""}
            onValueChange={(id) =>
              patch({
                departmentId: id || null,
                roleCatalogId: null,
                proposedDepartment: id
                  ? null
                  : role.proposedDepartment,
              })
            }
          />
          {willCreateDepartment ? (
            <div className="space-y-1.5">
              <Label htmlFor="proposed-dept">New department</Label>
              <Input
                id="proposed-dept"
                value={role.proposedDepartment?.name ?? ""}
                disabled={disabled}
                onChange={(event) =>
                  patch({
                    proposedDepartment: { name: event.target.value },
                  })
                }
              />
              <Badge variant="secondary">Will be created on save</Badge>
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          {role.departmentId ? (
            <JobTitleSelect
              label="Role"
              required
              disabled={disabled}
              departmentId={role.departmentId}
              value={role.roleLabel ?? ""}
              onRoleChange={(selected) =>
                patch({
                  roleCatalogId: selected?.id ?? null,
                  roleLabel: selected?.label ?? selected?.name ?? null,
                  proposedRole: selected ? null : role.proposedRole,
                })
              }
            />
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="proposed-role">Role</Label>
              <Input
                id="proposed-role"
                value={role.proposedRole?.label ?? ""}
                disabled={disabled}
                required
                onChange={(event) =>
                  patch({
                    proposedRole: { label: event.target.value },
                    roleCatalogId: null,
                  })
                }
              />
            </div>
          )}
          {willCreateRole ? (
            <Badge variant="secondary">Will be created on save</Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DocumentMetaFields({
  segment,
  typeLabel,
  showNumber = false,
  disabled,
  onChange,
}: {
  segment: BundleSegment;
  typeLabel: string;
  showNumber?: boolean;
  disabled: boolean;
  onChange: (draft: {
    docName?: string | null;
    extracted?: SegmentExtractedFields;
  }) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`type-${segment.id}`}>Document type</Label>
        <Input id={`type-${segment.id}`} value={typeLabel} readOnly />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`name-${segment.id}`}>Document name</Label>
        <Input
          id={`name-${segment.id}`}
          value={segment.docName ?? ""}
          disabled={disabled}
          onChange={(event) => onChange({ docName: event.target.value })}
        />
      </div>
      {showNumber ? (
        <div className="space-y-1.5">
          <Label htmlFor={`number-${segment.id}`}>Document number</Label>
          <Input
            id={`number-${segment.id}`}
            value={segment.extracted?.documentNumber ?? ""}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                extracted: {
                  ...(segment.extracted ?? {}),
                  documentNumber: event.target.value || null,
                },
              })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function PassportFields({
  segment,
  disabled,
  onChange,
}: {
  segment: BundleSegment;
  disabled: boolean;
  onChange: (extracted: SegmentExtractedFields) => void;
}) {
  const extracted: SegmentExtractedFields = segment.extracted ?? {};
  const patchExtracted = (patch: SegmentExtractedFields) => {
    onChange({ ...extracted, ...patch });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`passport-number-${segment.id}`}>
          Passport number
        </Label>
        <Input
          id={`passport-number-${segment.id}`}
          required
          value={extracted.documentNumber ?? ""}
          disabled={disabled}
          onChange={(event) =>
            patchExtracted({ documentNumber: event.target.value || null })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`passport-expiry-${segment.id}`}>Expiry date</Label>
        <Input
          id={`passport-expiry-${segment.id}`}
          type="date"
          value={extracted.expiryDate ?? ""}
          disabled={disabled}
          onChange={(event) =>
            patchExtracted({ expiryDate: event.target.value || null })
          }
        />
      </div>
    </div>
  );
}

function PagePreview({
  previewUrl,
  isLoading,
  documentLabel,
  onViewThisDocument,
  onViewMergedPdf,
}: {
  previewUrl: string | null;
  isLoading: boolean;
  documentLabel: string;
  onViewThisDocument: () => void;
  onViewMergedPdf: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
      {previewUrl ? (
        <iframe
          title={`${documentLabel} preview`}
          src={previewUrl}
          className="h-64 w-full bg-background"
        />
      ) : (
        <div className="flex h-64 items-center justify-center bg-background">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-xs text-muted-foreground">
              Preview for this document will appear here.
            </p>
          )}
        </div>
      )}
      <div className="flex items-center justify-end gap-1 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onViewThisDocument}
          disabled={!previewUrl}
          aria-label={`View ${documentLabel}`}
          title={`View ${documentLabel}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onViewMergedPdf}
          aria-label="View merged PDF"
          title="View merged PDF"
        >
          <Files className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function IdentityPreview({
  identity,
  onChange,
}: {
  identity: BundleIdentitySuggestion | null | undefined;
  onChange: (next: BundleIdentitySuggestion) => void;
}) {
  const value: BundleIdentitySuggestion = identity ?? {};
  const patch = (next: Partial<BundleIdentitySuggestion>) => {
    onChange({ ...value, ...next, identityEdited: true });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Identity
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="preview-dob">Date of birth</Label>
        <Input
          id="preview-dob"
          type="date"
          value={value.dateOfBirth ?? ""}
          onChange={(event) =>
            patch({ dateOfBirth: event.target.value || null })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="preview-email">Email</Label>
        <Input
          id="preview-email"
          type="email"
          value={value.email ?? ""}
          onChange={(event) => patch({ email: event.target.value || null })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="preview-passport">Passport number</Label>
        <Input
          id="preview-passport"
          value={value.passportNumber ?? ""}
          onChange={(event) =>
            patch({ passportNumber: event.target.value || null })
          }
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Empty profile fields are filled on save. Edited values overwrite what
        is already on the profile.
      </p>
    </div>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">None included</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item} className="text-xs text-foreground">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
