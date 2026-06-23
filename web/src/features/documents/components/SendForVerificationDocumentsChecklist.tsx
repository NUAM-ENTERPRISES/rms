import React from "react";
import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGetCandidateProjectRequirementsQuery } from "../api";
import {
  buildProjectDocumentsChecklist,
  type ProjectDocumentRequirement,
  type ProjectDocumentVerification,
} from "../utils/buildProjectDocumentsChecklist";

export interface SendForVerificationDocumentsPreloadedData {
  requirements?: ProjectDocumentRequirement[];
  verifications?: ProjectDocumentVerification[];
  introductionVideoRequired?: boolean;
  introductionVideo?: ProjectDocumentVerification | null;
  summary?: {
    totalRequired?: number;
    totalSubmitted?: number;
  };
}

export interface SendForVerificationDocumentsChecklistProps {
  candidateId: string;
  projectId: string;
  isActive: boolean;
  preloadedData?: SendForVerificationDocumentsPreloadedData | null;
}

export function SendForVerificationDocumentsChecklist({
  candidateId,
  projectId,
  isActive,
  preloadedData,
}: SendForVerificationDocumentsChecklistProps) {
  const shouldFetch =
    isActive &&
    Boolean(candidateId) &&
    Boolean(projectId) &&
    !preloadedData;

  const { data: fetchedData, isLoading: isFetching } =
    useGetCandidateProjectRequirementsQuery(
      { candidateId, projectId, includeFileUrls: false },
      { skip: !shouldFetch },
    );

  const requirementsPayload = preloadedData ?? fetchedData?.data;
  const isLoading = shouldFetch && isFetching;

  const checklist = React.useMemo(() => {
    if (!requirementsPayload) return null;
    return buildProjectDocumentsChecklist({
      requirements: requirementsPayload.requirements ?? [],
      verifications: requirementsPayload.verifications ?? [],
      introductionVideoRequired:
        requirementsPayload.introductionVideoRequired ?? false,
      introductionVideo: requirementsPayload.introductionVideo ?? null,
      summary: requirementsPayload.summary,
    });
  }, [requirementsPayload]);

  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
        aria-busy="true"
        aria-label="Loading document checklist"
      >
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!checklist || checklist.rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/20 p-3">
        No project document requirements configured.
      </p>
    );
  }

  const { rows, summary } = checklist;
  const hasMissingMandatory = summary.missingMandatoryCount > 0;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
          Document checklist
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px] tabular-nums">
            {summary.totalSubmitted}/{summary.totalRequired} submitted
          </Badge>
          {summary.missingCount > 0 ? (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] tabular-nums",
                hasMissingMandatory
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-amber-200/70 bg-amber-50 text-amber-800",
              )}
            >
              {summary.missingCount} missing
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-200/70 bg-emerald-50 text-emerald-800"
            >
              Complete
            </Badge>
          )}
        </div>
      </div>

      <ul
        className="max-h-48 space-y-2 overflow-y-auto pr-1"
        aria-label="Project document checklist"
      >
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-start justify-between gap-2 text-[11px]"
          >
            <div className="flex min-w-0 items-start gap-2 text-muted-foreground">
              {row.isUploaded ? (
                <CheckCircle2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                  aria-hidden
                />
              ) : (
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                  aria-hidden
                />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-foreground">{row.label}</span>
                  {row.mandatory ? (
                    <Badge
                      variant="destructive"
                      className="h-4 px-1 text-[9px] uppercase tracking-tighter"
                    >
                      Required
                    </Badge>
                  ) : null}
                </div>
                {row.isUploaded && row.fileName ? (
                  <p className="truncate text-[10px] text-muted-foreground">
                    {row.fileName}
                  </p>
                ) : null}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 font-medium",
                row.isUploaded ? "text-emerald-700" : "text-amber-700",
              )}
            >
              {row.isUploaded ? "Uploaded" : "Not uploaded"}
            </span>
          </li>
        ))}
      </ul>

      {hasMissingMandatory ? (
        <p className="text-[11px] text-amber-800 rounded-md border border-amber-200/70 bg-amber-50/80 p-2">
          Some required documents are not uploaded. You can still send for
          verification, but the verification team may request them.
        </p>
      ) : null}
    </div>
  );
}
