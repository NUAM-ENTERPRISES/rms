import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOCUMENT_TYPE_CONFIG,
  getDocumentTypeConfig,
} from "@/constants/document-types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, FileText, X } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  BundleSegment,
  SegmentExtractedFields,
  UpdateSegmentPayload,
} from "../data/document-bundle.dto";

interface BundleSegmentReviewProps {
  segment: BundleSegment;
  /** Total pages in the bundle, used to bound the page-range inputs. */
  pageCount: number;
  isSaving: boolean;
  onChange: (changes: UpdateSegmentPayload) => void;
}

/** Confidence at or below this is highlighted as needing a closer look. */
const LOW_CONFIDENCE = 0.6;

const DOC_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_CONFIG)
  .map(([key, config]) => ({
    value: key,
    label: config.displayName ?? key,
  }))
  .sort((left, right) => left.label.localeCompare(right.label));

/**
 * One detected document from a merged PDF, with everything a reviewer needs to
 * accept or correct it: page range, type, extracted fields and any warning
 * raised because a value disagrees with the candidate profile.
 */
export function BundleSegmentReview({
  segment,
  pageCount,
  isSaving,
  onChange,
}: BundleSegmentReviewProps) {
  const [startPage, setStartPage] = useState(String(segment.startPage));
  const [endPage, setEndPage] = useState(String(segment.endPage));
  const [docType, setDocType] = useState(segment.docType);
  const [docName, setDocName] = useState(segment.docName ?? "");
  const [extracted, setExtracted] = useState<SegmentExtractedFields>(
    segment.extracted ?? {}
  );

  // The list re-sorts after a save, so local edits follow the server copy.
  useEffect(() => {
    setStartPage(String(segment.startPage));
    setEndPage(String(segment.endPage));
    setDocType(segment.docType);
    setDocName(segment.docName ?? "");
    setExtracted(segment.extracted ?? {});
  }, [segment]);

  const isApplied = segment.status === "applied";
  const isRejected = segment.status === "rejected";
  const isConfirmed = segment.status === "confirmed";
  const isLocked = isApplied || isSaving;

  const warnings = segment.warnings ?? [];
  const config = getDocumentTypeConfig(docType);
  const pageSpan = segment.endPage - segment.startPage + 1;

  const rangeError = validateRange(startPage, endPage, pageCount);

  const commit = (extra: UpdateSegmentPayload = {}) => {
    if (rangeError) return;
    onChange({
      startPage: Number(startPage),
      endPage: Number(endPage),
      docType,
      docName: docName.trim() || null,
      extracted,
      ...extra,
    });
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        isRejected && "border-border bg-muted/40 opacity-60",
        isConfirmed && "border-emerald-500/40 bg-emerald-500/5",
        isApplied && "border-emerald-500/40 bg-emerald-500/10",
        !isConfirmed &&
          !isRejected &&
          !isApplied &&
          "border-border bg-card"
      )}
      data-testid={`segment-${segment.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-muted p-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {config?.displayName ?? docType}
            </p>
            <p className="text-xs text-muted-foreground">
              {pageSpan === 1
                ? `Page ${segment.startPage}`
                : `Pages ${segment.startPage}–${segment.endPage}`}
              {docName ? ` · ${docName}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {segment.confidence !== null && (
            <Badge
              variant={
                segment.confidence <= LOW_CONFIDENCE ? "outline" : "secondary"
              }
              className="rounded-lg text-[11px] font-semibold"
            >
              {Math.round(segment.confidence * 100)}% sure
            </Badge>
          )}
          {isApplied && (
            <Badge className="rounded-lg bg-emerald-600 text-[11px] font-semibold text-white">
              Saved
            </Badge>
          )}
        </div>
      </div>

      {warnings.length > 0 && !isApplied && (
        <ul className="mt-3 space-y-1.5" aria-label="Segment warnings">
          {warnings.map((warning) => (
            <li
              key={warning}
              className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}

      {segment.error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {segment.error}
        </p>
      )}

      {!isApplied && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label
                htmlFor={`start-${segment.id}`}
                className="text-xs font-medium"
              >
                First page
              </Label>
              <Input
                id={`start-${segment.id}`}
                type="number"
                min={1}
                max={pageCount}
                value={startPage}
                disabled={isLocked}
                onChange={(event) => setStartPage(event.target.value)}
                onBlur={() => commit()}
                aria-invalid={Boolean(rangeError)}
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor={`end-${segment.id}`}
                className="text-xs font-medium"
              >
                Last page
              </Label>
              <Input
                id={`end-${segment.id}`}
                type="number"
                min={1}
                max={pageCount}
                value={endPage}
                disabled={isLocked}
                onChange={(event) => setEndPage(event.target.value)}
                onBlur={() => commit()}
                aria-invalid={Boolean(rangeError)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label
                htmlFor={`type-${segment.id}`}
                className="text-xs font-medium"
              >
                Document type
              </Label>
              <Select
                value={docType}
                disabled={isLocked}
                onValueChange={(value) => {
                  setDocType(value);
                  onChange({ docType: value });
                }}
              >
                <SelectTrigger id={`type-${segment.id}`}>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {rangeError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {rangeError}
            </p>
          )}

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label
                htmlFor={`name-${segment.id}`}
                className="text-xs font-medium"
              >
                Label
              </Label>
              <Input
                id={`name-${segment.id}`}
                value={docName}
                disabled={isLocked}
                placeholder="e.g. Cloudnine Hospital"
                onChange={(event) => setDocName(event.target.value)}
                onBlur={() => commit()}
              />
            </div>

            <ExtractedField
              segmentId={segment.id}
              field="documentNumber"
              label="Document number"
              value={extracted.documentNumber ?? ""}
              disabled={isLocked}
              onChange={setExtracted}
              onBlur={() => commit()}
            />

            <ExtractedField
              segmentId={segment.id}
              field="expiryDate"
              label="Expiry date"
              type="date"
              value={extracted.expiryDate ?? ""}
              disabled={isLocked}
              onChange={setExtracted}
              onBlur={() => commit()}
            />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={isConfirmed ? "default" : "outline"}
              disabled={isLocked || Boolean(rangeError)}
              onClick={() => commit({ status: "confirmed" })}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              {isConfirmed ? "Will be saved" : "Confirm"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isLocked}
              onClick={() => onChange({ status: "rejected" })}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              {isRejected ? "Skipped" : "Skip"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface ExtractedFieldProps {
  segmentId: string;
  field: keyof SegmentExtractedFields;
  label: string;
  value: string;
  type?: string;
  disabled: boolean;
  onChange: (
    update: (previous: SegmentExtractedFields) => SegmentExtractedFields
  ) => void;
  onBlur: () => void;
}

function ExtractedField({
  segmentId,
  field,
  label,
  value,
  type = "text",
  disabled,
  onChange,
  onBlur,
}: ExtractedFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={`${field}-${segmentId}`}
        className="text-xs font-medium"
      >
        {label}
      </Label>
      <Input
        id={`${field}-${segmentId}`}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange((previous) => ({
            ...previous,
            [field]: event.target.value || null,
          }))
        }
        onBlur={onBlur}
      />
    </div>
  );
}

/**
 * Exported so the page can block "Save" while any range is invalid, rather
 * than letting the request fail server-side.
 */
export function validateRange(
  start: string,
  end: string,
  pageCount: number
): string | null {
  const startValue = Number(start);
  const endValue = Number(end);

  if (!Number.isInteger(startValue) || !Number.isInteger(endValue)) {
    return "Page numbers must be whole numbers.";
  }
  if (startValue < 1 || endValue < 1) {
    return "Pages start at 1.";
  }
  if (pageCount > 0 && (startValue > pageCount || endValue > pageCount)) {
    return `This file only has ${pageCount} pages.`;
  }
  if (endValue < startValue) {
    return "The last page cannot come before the first.";
  }
  return null;
}
