import { useMemo } from "react";
import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface ReceiveDocumentVerificationItem {
  docType: string;
  isVerified: boolean;
  remarks: string;
}

interface ReceiveDocumentVerificationChecklistProps {
  docTypes: string[];
  items: ReceiveDocumentVerificationItem[];
  onChange: (items: ReceiveDocumentVerificationItem[]) => void;
  disabled?: boolean;
  error?: string;
}

function buildItems(
  docTypes: string[],
  currentItems: ReceiveDocumentVerificationItem[],
): ReceiveDocumentVerificationItem[] {
  const itemMap = new Map(currentItems.map((item) => [item.docType, item]));

  return docTypes.map((docType) => {
    const existing = itemMap.get(docType);
    return (
      existing ?? {
        docType,
        isVerified: false,
        remarks: "",
      }
    );
  });
}

export function ReceiveDocumentVerificationChecklist({
  docTypes,
  items,
  onChange,
  disabled,
  error,
}: ReceiveDocumentVerificationChecklistProps) {
  const normalizedItems = useMemo(
    () => buildItems(docTypes, items),
    [docTypes, items],
  );
  const itemMap = useMemo(
    () => new Map(normalizedItems.map((item) => [item.docType, item])),
    [normalizedItems],
  );

  const arrivedCount = normalizedItems.filter((item) => item.isVerified).length;
  const notArrivedCount = normalizedItems.length - arrivedCount;
  const allArrived =
    docTypes.length > 0 && arrivedCount === docTypes.length;

  const updateItems = (nextItems: ReceiveDocumentVerificationItem[]) => {
    onChange(buildItems(docTypes, nextItems));
  };

  const handleToggle = (docType: string, checked: boolean) => {
    updateItems(
      docTypes.map((type) => {
        const existing = itemMap.get(type);
        if (type === docType) {
          return {
            docType: type,
            isVerified: checked,
            remarks: existing?.remarks ?? "",
          };
        }
        return (
          existing ?? {
            docType: type,
            isVerified: false,
            remarks: "",
          }
        );
      }),
    );
  };

  const handleRemarks = (docType: string, remarks: string) => {
    updateItems(
      docTypes.map((type) => {
        const existing = itemMap.get(type);
        if (type === docType) {
          return {
            docType: type,
            isVerified: existing?.isVerified ?? false,
            remarks,
          };
        }
        return (
          existing ?? {
            docType: type,
            isVerified: false,
            remarks: "",
          }
        );
      }),
    );
  };

  const handleVerifyAll = () => {
    updateItems(
      docTypes.map((docType) => {
        const existing = itemMap.get(docType);
        return {
          docType,
          isVerified: true,
          remarks: existing?.remarks ?? "",
        };
      }),
    );
  };

  if (docTypes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="alert">
        No documents are attached to this leg. Receipt cannot be confirmed.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Verify documents received</p>
          <p className="text-[11px] text-muted-foreground">
            {arrivedCount} arrived · {notArrivedCount} not arrived
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleVerifyAll}
          disabled={disabled || allArrived}
        >
          Mark all arrived
        </Button>
      </div>

      <div className="max-h-[220px] space-y-1.5 overflow-y-auto pr-0.5">
        {docTypes.map((docType) => {
          const item = itemMap.get(docType);
          const label = getDocumentTypeConfig(docType)?.displayName ?? docType;
          const isVerified = item?.isVerified ?? false;
          const checkboxId = `receive-doc-${docType}`;
          const remarksMissing = !isVerified && !item?.remarks?.trim();

          return (
            <div
              key={docType}
              className={cn(
                "rounded-lg border px-2.5 py-2 transition-colors",
                isVerified
                  ? "border-emerald-300 bg-emerald-50/50"
                  : "border-amber-300 bg-amber-50/40",
              )}
            >
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id={checkboxId}
                  checked={isVerified}
                  onCheckedChange={(checked) =>
                    handleToggle(docType, checked === true)
                  }
                  disabled={disabled}
                  className="h-4 w-4 shrink-0"
                  aria-label={`Mark ${label} as arrived`}
                />
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    isVerified
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                </span>
                <Label
                  htmlFor={checkboxId}
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm font-medium",
                    !disabled && "cursor-pointer",
                  )}
                >
                  {label}
                </Label>
                {isVerified ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                ) : (
                  <AlertCircle
                    className="h-4 w-4 shrink-0 text-amber-600"
                    aria-hidden
                  />
                )}
              </div>

              <div className="mt-1.5 pl-[1.875rem]">
                <Input
                  id={`${checkboxId}-remarks`}
                  value={item?.remarks ?? ""}
                  onChange={(event) =>
                    handleRemarks(docType, event.target.value)
                  }
                  disabled={disabled}
                  placeholder={
                    isVerified
                      ? "Remarks (optional)"
                      : "Not arrived — add reason (required)"
                  }
                  className={cn(
                    "h-8 bg-background text-xs",
                    remarksMissing && "border-amber-400",
                  )}
                  maxLength={500}
                  aria-label={`Remarks for ${label}`}
                  aria-required={!isVerified}
                />
                {remarksMissing ? (
                  <p className="mt-1 text-[11px] text-amber-700" role="alert">
                    Add a remark explaining why this document did not arrive.
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function isReceiveReviewComplete(
  docTypes: string[],
  items: ReceiveDocumentVerificationItem[],
): boolean {
  if (docTypes.length === 0) return false;

  const itemMap = new Map(items.map((item) => [item.docType, item]));

  return docTypes.every((docType) => {
    const item = itemMap.get(docType);
    if (!item) return false;
    if (item.isVerified) return true;
    return Boolean(item.remarks.trim());
  });
}

export function getReceiveReviewCounts(
  docTypes: string[],
  items: ReceiveDocumentVerificationItem[],
) {
  const itemMap = new Map(items.map((item) => [item.docType, item]));
  let arrivedCount = 0;
  let notArrivedCount = 0;

  for (const docType of docTypes) {
    const item = itemMap.get(docType);
    if (item?.isVerified) {
      arrivedCount += 1;
    } else {
      notArrivedCount += 1;
    }
  }

  return { arrivedCount, notArrivedCount };
}

export function getReceiveReviewBlockReason(
  docTypes: string[],
  items: ReceiveDocumentVerificationItem[],
): string | undefined {
  if (docTypes.length === 0) {
    return "This leg has no documents to review";
  }

  const itemMap = new Map(items.map((item) => [item.docType, item]));
  const missingRemarks = docTypes.filter((docType) => {
    const item = itemMap.get(docType);
    return item && !item.isVerified && !item.remarks.trim();
  });

  if (missingRemarks.length > 0) {
    return missingRemarks.length === 1
      ? "Add a remark for the document that did not arrive"
      : `Add remarks for ${missingRemarks.length} documents that did not arrive`;
  }

  return undefined;
}

export function toVerifiedDocumentsPayload(
  items: ReceiveDocumentVerificationItem[],
) {
  return items.map((item) => ({
    docType: item.docType,
    isReceived: item.isVerified,
    remarks: item.remarks.trim() || undefined,
  }));
}
