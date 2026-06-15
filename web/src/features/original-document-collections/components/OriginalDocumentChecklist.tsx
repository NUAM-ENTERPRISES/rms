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

  const filteredDocs = ORIGINAL_DOCUMENT_CHECKLIST.filter((docType) => {
    if (!searchTerm.trim()) return true;
    const label = getDocumentTypeConfig(docType)?.displayName ?? docType;
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

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

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      <div className="max-h-[360px] space-y-1.5 overflow-y-auto">
        {filteredDocs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No documents match your search.
          </p>
        ) : (
          filteredDocs.map((docType) => {
            const item = itemMap.get(docType);
            const label = getDocumentTypeConfig(docType)?.displayName ?? docType;
            const isPreviouslyReceived = lockedSet.has(docType);
            const isReceived =
              isPreviouslyReceived || (item?.isReceived ?? false);
            const isLocked = isPreviouslyReceived;
            const showRemarks = isReceived && !isLocked;

            return (
              <div
                key={docType}
                className={cn(
                  "rounded-lg border px-2.5 py-2",
                  isReceived
                    ? "border-border bg-muted/40"
                    : "border-border bg-background",
                )}
              >
                <div className="flex items-center gap-2">
                  {isLocked ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 gap-1 border-border bg-muted text-muted-foreground"
                    >
                      <Lock className="h-3 w-3" />
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
                      "min-w-0 flex-1 text-sm",
                      isLocked
                        ? "text-muted-foreground"
                        : isReceived
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      !isLocked && !disabled && "cursor-pointer",
                    )}
                  >
                    {label}
                  </Label>
                  {isReceived ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
                    >
                      <Check className="h-3 w-3" />
                      Received
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="shrink-0 gap-1 border-destructive/30 bg-destructive/10 text-destructive"
                    >
                      <X className="h-3 w-3" />
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
                    className="mt-2 h-8 text-xs"
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
