import { AlertCircle, Check, CheckCircle2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DOCUMENT_TYPE_CONFIG } from "@/constants/document-types";
import { cn } from "@/lib/utils";
import {
  RecruiterUploadProgress,
  defaultUploadProgressColor,
} from "./RecruiterUploadProgress";

export type ProjectDocumentChecklistRow = {
  key: string;
  docType: string;
  mandatory: boolean;
  isUploaded: boolean;
  fileName?: string | null;
};

type ProjectDocumentsProgressGridProps = {
  rows: ProjectDocumentChecklistRow[];
  uploaded?: number;
  required?: number;
  percent?: number;
  getProgressColor?: (percentage: number) => string;
  onUploadDocuments?: () => void;
  className?: string;
};

function resolveRowLabel(docType: string): string {
  const config =
    DOCUMENT_TYPE_CONFIG[docType as keyof typeof DOCUMENT_TYPE_CONFIG];
  return config?.displayName ?? docType.replace(/_/g, " ");
}

export function ProjectDocumentsProgressGrid({
  rows,
  uploaded,
  required,
  percent: percentProp,
  getProgressColor = defaultUploadProgressColor,
  onUploadDocuments,
  className,
}: ProjectDocumentsProgressGridProps) {
  const totalRequired = required ?? rows.length;
  const done =
    uploaded ?? rows.filter((row) => row.isUploaded).length;
  const missingCount = Math.max(0, totalRequired - done);
  const percent =
    percentProp ??
    (totalRequired > 0
      ? Math.min(100, Math.round((done / totalRequired) * 100))
      : 0);
  const isComplete = totalRequired > 0 && done >= totalRequired;

  const stopRowNav = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const renderChecklistContent = ({ close }: { close: () => void }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <h4 className="text-xs font-bold tracking-tight text-foreground">
          Project Documents
        </h4>
        {isComplete ? (
          <Badge className="h-5 border-0 bg-emerald-500/10 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-500/10">
            Complete
          </Badge>
        ) : (
          <Badge className="h-5 border-0 bg-amber-500/10 text-[10px] font-semibold text-amber-700 hover:bg-amber-500/10">
            {missingCount} pending
          </Badge>
        )}
      </div>

      <p className="text-[10px] leading-relaxed text-muted-foreground">
        {done} of {totalRequired} documents submitted for this project
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-2.5 text-center text-[11px] text-muted-foreground">
          No project document requirements configured.
        </p>
      ) : (
        <ul
          className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5"
          aria-label="Project documents checklist"
        >
          {rows.map((row) => (
            <li
              key={row.key}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[11px]",
                row.isUploaded ? "bg-emerald-500/5" : "bg-muted/40",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                {row.isUploaded ? (
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                ) : (
                  <AlertCircle
                    className="h-3.5 w-3.5 shrink-0 text-amber-600"
                    aria-hidden
                  />
                )}
                <span className="truncate font-medium text-foreground">
                  {resolveRowLabel(row.docType)}
                </span>
                {row.mandatory ? (
                  <Badge
                    variant="destructive"
                    className="h-4 shrink-0 px-1 text-[9px] uppercase tracking-tighter"
                  >
                    Req
                  </Badge>
                ) : null}
              </div>
              <span
                className={cn(
                  "shrink-0 text-[10px] font-semibold",
                  row.isUploaded ? "text-emerald-700" : "text-amber-700",
                )}
              >
                {row.isUploaded ? "Uploaded" : "Pending"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isComplete ? (
        <div
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-gradient-to-b from-emerald-50/90 to-emerald-100/50 px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-emerald-950"
          role="status"
        >
          <span
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-primary-foreground shadow-sm"
            aria-hidden
          >
            <Check className="h-2.5 w-2.5 stroke-[3]" />
          </span>
          All project documents uploaded
        </div>
      ) : onUploadDocuments ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 w-full gap-1.5 rounded-lg border-amber-200/80 bg-gradient-to-b from-amber-50/80 to-background text-[10px] font-semibold text-foreground shadow-sm hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            stopRowNav(e);
            close();
            onUploadDocuments();
          }}
        >
          <Upload className="h-3 w-3" aria-hidden />
          Upload documents
        </Button>
      ) : null}
    </div>
  );

  return (
    <RecruiterUploadProgress
      className={className}
      done={done}
      total={totalRequired}
      percent={percent}
      unitLabel="docs"
      pendingWord="pending"
      accent="amber"
      getProgressColor={getProgressColor}
      checklistCompleteLabel="All uploaded"
      checklistPendingLabel={`${missingCount} pending · checklist`}
      progressAriaLabel={`${done} of ${totalRequired} project documents uploaded`}
      tooltipContent={renderChecklistContent}
      onStopRowNav={stopRowNav}
    />
  );
}
