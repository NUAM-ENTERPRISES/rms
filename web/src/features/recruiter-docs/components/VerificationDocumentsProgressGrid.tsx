import {
  AlertCircle,
  Check,
  CheckCircle2,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DOCUMENT_TYPE_CONFIG } from "@/constants/document-types";
import type { RecruiterDocumentItem } from "@/features/documents/api";
import { cn } from "@/lib/utils";
import { RecruiterUploadProgress } from "./RecruiterUploadProgress";

export type VerificationDocStatus =
  | "verified"
  | "rejected"
  | "pending"
  | "resubmission_required"
  | "missing";

export type VerificationDocRow = {
  key: string;
  docType: string;
  label: string;
  status: VerificationDocStatus;
  fileName?: string | null;
};

function resolveDocLabel(docType: string): string {
  const config =
    DOCUMENT_TYPE_CONFIG[docType as keyof typeof DOCUMENT_TYPE_CONFIG];
  return config?.displayName ?? docType.replace(/_/g, " ");
}

function normalizeVerificationStatus(
  raw: string | undefined,
  isUploaded: boolean,
): VerificationDocStatus {
  if (!raw && !isUploaded) return "missing";
  if (!raw) return "pending";
  const s = raw.toLowerCase();
  if (s === "verified") return "verified";
  if (s === "rejected") return "rejected";
  if (s === "resubmission_required") return "resubmission_required";
  return "pending";
}

export function buildVerificationDocRows(
  item: RecruiterDocumentItem,
): VerificationDocRow[] {
  const checklist = item.documentChecklist?.rows ?? [];
  const detailsByType = new Map(
    item.documentDetails.map((d) => [d.docType.toLowerCase(), d]),
  );

  if (checklist.length === 0) {
    return item.documentDetails.map((d) => ({
      key: d.id,
      docType: d.docType,
      label: resolveDocLabel(d.docType),
      status: normalizeVerificationStatus(d.status, true),
      fileName: d.fileName,
    }));
  }

  return checklist.map((row) => {
    const detail = detailsByType.get(row.docType.toLowerCase());
    return {
      key: row.key,
      docType: row.docType,
      label: resolveDocLabel(row.docType),
      status: normalizeVerificationStatus(detail?.status, row.isUploaded),
      fileName: detail?.fileName ?? row.fileName ?? null,
    };
  });
}

function countByStatus(rows: VerificationDocRow[], status: VerificationDocStatus) {
  return rows.filter((r) => r.status === status).length;
}

const STATUS_UI: Record<
  VerificationDocStatus,
  { label: string; className: string; rowBg: string }
> = {
  verified: {
    label: "Verified",
    className: "text-emerald-700",
    rowBg: "bg-emerald-500/5",
  },
  rejected: {
    label: "Rejected",
    className: "text-rose-700",
    rowBg: "bg-rose-500/5",
  },
  resubmission_required: {
    label: "Resubmit",
    className: "text-amber-700",
    rowBg: "bg-amber-500/5",
  },
  pending: {
    label: "Pending",
    className: "text-amber-700",
    rowBg: "bg-muted/40",
  },
  missing: {
    label: "Missing",
    className: "text-muted-foreground",
    rowBg: "bg-muted/30",
  },
};

function verificationProgressColor(
  percent: number,
  variant: "verified" | "rejected",
): string {
  if (variant === "rejected") {
    if (percent >= 100) return "from-rose-500 to-rose-600";
    if (percent >= 50) return "from-rose-400 to-rose-500";
    return "from-amber-400 to-amber-500";
  }
  if (percent >= 100) return "from-emerald-500 to-emerald-600";
  if (percent >= 50) return "from-emerald-400 to-teal-500";
  if (percent > 0) return "from-sky-500 to-blue-600";
  return "from-amber-400 to-amber-500";
}

type VerificationDocumentsProgressGridProps = {
  item: RecruiterDocumentItem;
  variant: "verified" | "rejected";
  onViewDetails?: () => void;
  className?: string;
};

export function VerificationDocumentsProgressGrid({
  item,
  variant,
  onViewDetails,
  className,
}: VerificationDocumentsProgressGridProps) {
  const rows = buildVerificationDocRows(item);
  const total = rows.length > 0 ? rows.length : item.progress.totalDocsToUpload;
  const verifiedCount = countByStatus(rows, "verified");
  const rejectedCount = countByStatus(rows, "rejected");
  const resubmitCount = countByStatus(rows, "resubmission_required");

  const needsActionCount = rejectedCount + resubmitCount;
  const done = verifiedCount;
  const percent =
    total > 0
      ? Math.min(100, Math.round((verifiedCount / total) * 100))
      : item.progress.docsPercentage;

  const isComplete =
    variant === "verified"
      ? total > 0 && verifiedCount >= total
      : total > 0 && needsActionCount === 0 && verifiedCount >= total;
  const accent = variant === "verified" ? "emerald" : "rose";

  const statusChipText =
    variant === "verified"
      ? isComplete
        ? "All verified"
        : rejectedCount > 0
          ? `${rejectedCount} rejected`
          : `${Math.max(0, total - verifiedCount)} pending`
      : rejectedCount > 0
        ? `${rejectedCount} rejected`
        : resubmitCount > 0
          ? `${resubmitCount} resubmit`
          : isComplete
            ? "Complete"
            : `${Math.max(0, total - done)} pending`;

  const stopRowNav = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const renderChecklistContent = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <h4 className="text-xs font-bold tracking-tight text-foreground">
          {variant === "verified" ? "Verified documents" : "Document verification"}
        </h4>
        <Badge
          variant="secondary"
          className={cn(
            "h-5 border-0 text-[10px] font-semibold",
            variant === "verified"
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-rose-500/10 text-rose-700",
          )}
        >
          {verifiedCount} verified
          {rejectedCount > 0 ? ` · ${rejectedCount} rejected` : ""}
        </Badge>
      </div>

      <p className="text-[10px] leading-relaxed text-muted-foreground">
        {verifiedCount} verified · {rejectedCount} rejected
        {resubmitCount > 0 ? ` · ${resubmitCount} resubmit` : ""} of {total}{" "}
        required
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-2.5 text-center text-[11px] text-muted-foreground">
          No project document requirements configured.
        </p>
      ) : (
        <ul
          className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5"
          aria-label="Document verification checklist"
        >
          {rows.map((row) => {
            const ui = STATUS_UI[row.status];
            return (
              <li
                key={row.key}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[11px]",
                  ui.rowBg,
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {row.status === "verified" ? (
                    <CheckCircle2
                      className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                  ) : row.status === "rejected" ? (
                    <XCircle
                      className="h-3.5 w-3.5 shrink-0 text-rose-600"
                      aria-hidden
                    />
                  ) : (
                    <AlertCircle
                      className="h-3.5 w-3.5 shrink-0 text-amber-600"
                      aria-hidden
                    />
                  )}
                  <span className="truncate font-medium text-foreground">
                    {row.label}
                  </span>
                </div>
                <span
                  className={cn("shrink-0 text-[10px] font-semibold", ui.className)}
                >
                  {ui.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {isComplete && variant === "verified" ? (
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
          All documents verified
        </div>
      ) : onViewDetails ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            "h-7 w-full gap-1.5 rounded-lg text-[10px] font-semibold shadow-sm",
            variant === "verified"
              ? "border-emerald-200/80 bg-gradient-to-b from-emerald-50/80 to-background hover:border-emerald-300 hover:bg-emerald-50"
              : "border-rose-200/80 bg-gradient-to-b from-rose-50/80 to-background hover:border-rose-300 hover:bg-rose-50",
          )}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            stopRowNav(e);
            onViewDetails();
          }}
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
          View project documents
        </Button>
      ) : null}
    </div>
  );

  return (
    <RecruiterUploadProgress
      className={className}
      done={done}
      total={total}
      percent={percent}
      unitLabel="verified"
      pendingWord="pending"
      accent={accent}
      statusChipText={statusChipText}
      getProgressColor={(p) => verificationProgressColor(p, variant)}
      checklistCompleteLabel={
        variant === "verified" ? "All verified" : "Review complete"
      }
      checklistPendingLabel={
        variant === "verified"
          ? `${Math.max(0, total - verifiedCount)} pending · checklist`
          : `${rejectedCount} rejected · checklist`
      }
      progressAriaLabel={`${verifiedCount} of ${total} documents verified`}
      tooltipContent={renderChecklistContent}
      onStopRowNav={stopRowNav}
    />
  );
}
