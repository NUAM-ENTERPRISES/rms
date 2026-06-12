import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  GraduationCap,
  Award,
  Briefcase,
  Search,
  CheckCircle2,
  Circle,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { ORIGINAL_DOCUMENT_CHECKLIST } from "../constants";
import type { CollectionItem } from "../types";
import { cn } from "@/lib/utils";

interface OriginalDocumentChecklistProps {
  items: CollectionItem[];
  onChange: (items: CollectionItem[]) => void;
  disabled?: boolean;
  /** Doc types already received in prior completed collection events */
  previouslyReceivedDocTypes?: string[];
}

function getDocumentIcon(docType: string) {
  if (docType.includes("degree") || docType.includes("certificate")) return GraduationCap;
  if (docType.includes("passport")) return FileText;
  if (docType.includes("registration")) return Award;
  if (docType.includes("experience")) return Briefcase;
  return FileText;
}

export function OriginalDocumentChecklist({
  items,
  onChange,
  disabled,
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
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              {hasPriorReceipts
                ? `${newReceivedCount} new of ${totalCount} total`
                : `${newReceivedCount} of ${totalCount} documents received`}
            </p>
            {hasPriorReceipts ? (
              <p className="text-xs text-emerald-700/80">
                {lockedCount} previously received — mark only new documents for
                this event
              </p>
            ) : null}
            <div className="mt-1.5 h-2 w-40 overflow-hidden rounded-full bg-emerald-100">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-300 bg-white px-3 py-1.5 text-sm font-bold text-emerald-700"
        >
          {progressPercent}%
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-10 border-slate-200 focus:border-emerald-300 focus:ring-emerald-100"
        />
      </div>

      {/* Document Grid */}
      <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/30 p-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filteredDocs.map((docType) => {
              const item = itemMap.get(docType);
              const label = getDocumentTypeConfig(docType)?.displayName ?? docType;
              const Icon = getDocumentIcon(docType);
              const isPreviouslyReceived = lockedSet.has(docType);
              const isReceived =
                isPreviouslyReceived || (item?.isReceived ?? false);
              const isLocked = isPreviouslyReceived;

              return (
                <motion.div
                  key={docType}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border-2 bg-white p-3 transition-all",
                    isLocked
                      ? "border-slate-200 bg-slate-50/80 opacity-90"
                      : isReceived
                        ? "border-emerald-200 bg-emerald-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
                  )}
                >
                  {/* Checkmark / Lock Badge */}
                  {isLocked ? (
                    <div className="absolute right-2 top-2">
                      <Badge
                        variant="outline"
                        className="border-slate-300 bg-white text-[10px] text-slate-600"
                      >
                        <Lock className="mr-1 inline h-3 w-3" />
                        Previously received
                      </Badge>
                    </div>
                  ) : isReceived ? (
                    <div className="absolute right-2 top-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  ) : null}

                  {/* Document Header */}
                  <div className="mb-2 flex items-start gap-2.5 pr-8">
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isReceived
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`doc-${docType}`}
                          checked={isReceived}
                          onCheckedChange={(checked) =>
                            handleToggle(docType, checked === true)
                          }
                          disabled={disabled || isLocked}
                          className={cn(
                            "h-5 w-5 transition-all",
                            isReceived && "border-emerald-500 bg-emerald-500",
                            isLocked && "opacity-60",
                          )}
                        />
                        <Label
                          htmlFor={`doc-${docType}`}
                          className={cn(
                            "text-sm font-medium leading-tight transition-colors",
                            isLocked
                              ? "cursor-not-allowed text-slate-500"
                              : "cursor-pointer",
                            !isLocked &&
                              (isReceived
                                ? "text-emerald-900"
                                : "text-slate-700 group-hover:text-slate-900"),
                          )}
                        >
                          {label}
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Remarks Input */}
                  <Input
                    placeholder="Add remarks..."
                    value={item?.remarks ?? ""}
                    onChange={(e) => handleRemarks(docType, e.target.value)}
                    disabled={disabled || isLocked}
                    className={cn(
                      "h-8 text-xs transition-all",
                      isReceived
                        ? "border-emerald-200 bg-white focus:border-emerald-300"
                        : "border-slate-200 bg-slate-50/50 focus:border-slate-300",
                    )}
                    aria-label={`Remarks for ${label}`}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredDocs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Circle className="mb-2 h-12 w-12 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No documents found</p>
            <p className="text-xs text-slate-400">Try a different search term</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{newReceivedCount}</p>
          <p className="text-xs text-slate-500">
            {hasPriorReceipts ? "New this event" : "Received"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">
            {newTotalCount - newReceivedCount}
          </p>
          <p className="text-xs text-slate-500">
            {hasPriorReceipts ? "Remaining new" : "Pending"}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{progressPercent}%</p>
          <p className="text-xs text-emerald-600">Complete</p>
        </div>
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
