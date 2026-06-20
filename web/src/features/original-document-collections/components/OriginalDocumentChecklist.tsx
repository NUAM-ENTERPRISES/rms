import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, Search, X } from "lucide-react";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { ORIGINAL_DOCUMENT_CHECKLIST } from "../constants";
import type { CollectionItem } from "../types";
import { cn } from "@/lib/utils";
import { getDocumentChecklistStyles } from "../utils/documentChecklistColors";

interface OriginalDocumentChecklistProps {
  items: CollectionItem[];
  onChange: (items: CollectionItem[]) => void;
  disabled?: boolean;
  error?: string;
  /** Doc types already received in prior completed collection events */
  previouslyReceivedDocTypes?: string[];
}

export function OriginalDocumentChecklist({
  items,
  onChange,
  disabled,
  error,
  previouslyReceivedDocTypes = [],
}: OriginalDocumentChecklistProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const itemMap = new Map(items.map((item) => [item.docType, item]));
  const lockedSet = new Set(previouslyReceivedDocTypes);

  const handleToggle = (docType: string, checked: boolean) => {
    if (lockedSet.has(docType)) return;
    const next = ORIGINAL_DOCUMENT_CHECKLIST.map((type) => {
      const existing = itemMap.get(type);
      if (type === docType) {
        return {
          docType: type,
          isReceived: checked,
          remarks: existing?.remarks ?? "",
        };
      }
      return (
        existing ?? {
          docType: type,
          isReceived: false,
          remarks: "",
        }
      );
    });
    onChange(next);
  };

  const handleRemarks = (docType: string, remarks: string) => {
    const next = ORIGINAL_DOCUMENT_CHECKLIST.map((type) => {
      const existing = itemMap.get(type);
      if (type === docType) {
        return {
          docType: type,
          isReceived: existing?.isReceived ?? false,
          remarks,
        };
      }
      return (
        existing ?? {
          docType: type,
          isReceived: false,
          remarks: "",
        }
      );
    });
    onChange(next);
  };

  const filteredDocs = ORIGINAL_DOCUMENT_CHECKLIST.filter((docType) => {
    if (!searchTerm.trim()) return true;
    const label = getDocumentTypeConfig(docType)?.displayName ?? docType;
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectableFilteredDocTypes = filteredDocs.filter(
    (docType) => !lockedSet.has(docType),
  );

  const selectedSelectableCount = selectableFilteredDocTypes.filter((docType) => {
    const item = itemMap.get(docType);
    return item?.isReceived ?? false;
  }).length;

  const allSelectableSelected =
    selectableFilteredDocTypes.length > 0 &&
    selectedSelectableCount === selectableFilteredDocTypes.length;
  const someSelectableSelected =
    selectedSelectableCount > 0 && !allSelectableSelected;
  const selectAllChecked: boolean | "indeterminate" = allSelectableSelected
    ? true
    : someSelectableSelected
      ? "indeterminate"
      : false;

  const handleSelectAll = (checked: boolean) => {
    const targetSet = new Set(selectableFilteredDocTypes);
    const next = ORIGINAL_DOCUMENT_CHECKLIST.map((type) => {
      const existing = itemMap.get(type);
      if (lockedSet.has(type)) {
        return (
          existing ?? {
            docType: type,
            isReceived: false,
            remarks: "",
          }
        );
      }
      if (targetSet.has(type)) {
        return {
          docType: type,
          isReceived: checked,
          remarks: checked ? (existing?.remarks ?? "") : "",
        };
      }
      return (
        existing ?? {
          docType: type,
          isReceived: false,
          remarks: "",
        }
      );
    });
    onChange(next);
  };

  const newReceivedCount = items.filter(
    (item) => item.isReceived && !lockedSet.has(item.docType),
  ).length;
  const lockedCount = previouslyReceivedDocTypes.length;
  const totalCount = ORIGINAL_DOCUMENT_CHECKLIST.length;
  const newTotalCount = Math.max(totalCount - lockedCount, 0);
  const progressPercent =
    newTotalCount > 0
      ? Math.round((newReceivedCount / newTotalCount) * 100)
      : 0;
  const hasPriorReceipts = lockedCount > 0;
  const isFiltering = searchTerm.trim().length > 0;
  const selectAllLabel = isFiltering
    ? "Select all visible"
    : "Select all documents";

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {hasPriorReceipts
            ? `${newReceivedCount} new this visit · ${lockedCount} already on file`
            : `${newReceivedCount} of ${totalCount} marked received`}
        </p>
        <Badge variant="outline" className="text-xs">
          {progressPercent}% complete
        </Badge>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <Checkbox
          id="select-all-documents"
          checked={selectAllChecked}
          onCheckedChange={(checked) => handleSelectAll(checked === true)}
          disabled={disabled || selectableFilteredDocTypes.length === 0}
          className="h-4 w-4 shrink-0"
          aria-label={selectAllLabel}
        />
        <Label
          htmlFor="select-all-documents"
          className={cn(
            "text-sm font-medium text-foreground",
            !disabled && selectableFilteredDocTypes.length > 0 && "cursor-pointer",
          )}
        >
          {selectAllLabel}
        </Label>
        {isFiltering ? (
          <span className="text-xs text-muted-foreground">
            ({selectableFilteredDocTypes.length} shown)
          </span>
        ) : null}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      <div className="space-y-1">
        {filteredDocs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No documents match your search.
          </p>
        ) : (
          filteredDocs.map((docType) => {
            const item = itemMap.get(docType);
            const label = getDocumentTypeConfig(docType)?.displayName ?? docType;
            const docStyles = getDocumentChecklistStyles(docType);
            const isPreviouslyReceived = lockedSet.has(docType);
            const isReceived =
              isPreviouslyReceived || (item?.isReceived ?? false);
            const isLocked = isPreviouslyReceived;
            const showRemarks = isReceived && !isLocked;

            return (
              <div
                key={docType}
                className={cn(
                  "rounded-md border px-2 py-1",
                  docStyles.row,
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {isLocked ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-0.5 border-border bg-background/70 px-1.5 py-0 text-[10px] text-muted-foreground"
                      >
                        <Lock className="h-2.5 w-2.5" />
                        On file
                      </Badge>
                    ) : (
                      <Checkbox
                        id={`doc-${docType}`}
                        checked={isReceived}
                        onCheckedChange={(checked) =>
                          handleToggle(docType, checked === true)
                        }
                        disabled={disabled || isLocked}
                        className="h-4 w-4 shrink-0"
                      />
                    )}
                    <Label
                      htmlFor={isLocked ? undefined : `doc-${docType}`}
                      className={cn(
                        "min-w-0",
                        !isLocked && !disabled && "cursor-pointer",
                      )}
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "max-w-full truncate px-2 py-0.5 text-[11px] font-semibold",
                          docStyles.chip,
                          isLocked && "opacity-80",
                        )}
                      >
                        {label}
                      </Badge>
                    </Label>
                  </div>
                  {isReceived ? (
                    <Badge
                      variant="outline"
                      className="ml-auto h-5 shrink-0 gap-0.5 border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700"
                    >
                      <Check className="h-2.5 w-2.5" />
                      Received
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="ml-auto h-5 shrink-0 gap-0.5 border-destructive/30 bg-destructive/10 px-1.5 py-0 text-[10px] text-destructive"
                    >
                      <X className="h-2.5 w-2.5" />
                      Not uploaded
                    </Badge>
                  )}
                </div>
                {showRemarks ? (
                  <Input
                    placeholder="Remarks (optional)"
                    value={item?.remarks ?? ""}
                    onChange={(e) => handleRemarks(docType, e.target.value)}
                    disabled={disabled}
                    className="mt-1.5 h-7 text-xs"
                    aria-label={`Remarks for ${label}`}
                  />
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function buildDefaultChecklistItems(): CollectionItem[] {
  return ORIGINAL_DOCUMENT_CHECKLIST.map((docType) => ({
    docType,
    isReceived: false,
    remarks: "",
  }));
}

/** Fresh checklist for a new event; locked types passed separately to the checklist UI */
export function buildChecklistItemsForNewEvent(
  cumulativeReceived: Array<{ docType: string }>,
): { items: CollectionItem[]; lockedDocTypes: string[] } {
  return {
    items: buildDefaultChecklistItems(),
    lockedDocTypes: cumulativeReceived.map((item) => item.docType),
  };
}
