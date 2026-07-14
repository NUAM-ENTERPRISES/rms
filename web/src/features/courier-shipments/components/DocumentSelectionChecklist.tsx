import { useMemo } from "react";
import { CheckCircle2, FileText, MapPin, Package } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SHIPMENT_STATUS } from "../constants";
import {
  countShippedDocuments,
  formatMovementSummary,
  type DocMovementStatus,
} from "../utils/documentMovementStatus";

interface DocumentSelectionChecklistProps {
  availableDocTypes: string[];
  selected: string[];
  onChange: (docTypes: string[]) => void;
  disabled?: boolean;
  movements?: Record<string, DocMovementStatus>;
}

export function DocumentSelectionChecklist({
  availableDocTypes,
  selected,
  onChange,
  disabled,
  movements = {},
}: DocumentSelectionChecklistProps) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const shippedCount = countShippedDocuments(movements);

  const toggle = (docType: string) => {
    if (disabled) return;
    if (selectedSet.has(docType)) {
      onChange(selected.filter((d) => d !== docType));
    } else {
      onChange([...selected, docType]);
    }
  };

  const selectAll = () => onChange([...availableDocTypes]);

  if (availableDocTypes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No received original documents found for this candidate.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {selected.length} of {availableDocTypes.length} selected
          </p>
          {shippedCount > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-rose-200 bg-rose-50 text-[10px] font-medium text-rose-800"
            >
              <Package className="h-3 w-3" aria-hidden />
              {shippedCount} already shipped
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={selectAll}
          disabled={disabled}
        >
          Select all received
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {availableDocTypes.map((docType, index) => {
          const config = getDocumentTypeConfig(docType);
          const isSelected = selectedSet.has(docType);
          const movement = movements[docType];
          const hasMovement = Boolean(movement);

          return (
            <motion.button
              key={docType}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              disabled={disabled}
              onClick={() => toggle(docType)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                isSelected &&
                  "border-teal-300 bg-teal-50/60 ring-2 ring-teal-200",
                !isSelected &&
                  hasMovement &&
                  "border-rose-200 bg-gradient-to-br from-rose-50 via-rose-50/80 to-orange-50/40 hover:border-rose-300",
                !isSelected &&
                  !hasMovement &&
                  "border-border bg-card hover:border-teal-200",
                disabled && "cursor-not-allowed opacity-50",
              )}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      hasMovement && !isSelected
                        ? "bg-rose-100 text-rose-700"
                        : "bg-teal-50 text-teal-600",
                      isSelected && "bg-teal-100 text-teal-700",
                    )}
                  >
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-medium leading-snug">
                      {config?.label ?? docType}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!hasMovement && (
                        <Badge variant="secondary" className="text-[10px]">
                          Received
                        </Badge>
                      )}
                      {movement && (
                        <>
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 text-[10px]",
                              movement.status === SHIPMENT_STATUS.IN_TRANSIT
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800",
                            )}
                          >
                            {movement.status === SHIPMENT_STATUS.IN_TRANSIT
                              ? "In transit"
                              : "Arrived"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="gap-1 border-rose-200 bg-rose-50/90 text-[10px] text-rose-800"
                          >
                            <MapPin className="h-3 w-3" aria-hidden />
                            {movement.toAddressLabel}
                          </Badge>
                        </>
                      )}
                    </div>
                    {movement && (
                      <p className="text-[11px] leading-relaxed text-rose-800/80">
                        {formatMovementSummary(movement)}
                      </p>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
