import { useMemo } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getDocumentTypeConfig } from "@/constants/document-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DocumentSelectionChecklistProps {
  availableDocTypes: string[];
  selected: string[];
  onChange: (docTypes: string[]) => void;
  disabled?: boolean;
}

export function DocumentSelectionChecklist({
  availableDocTypes,
  selected,
  onChange,
  disabled,
}: DocumentSelectionChecklistProps) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selected.length} of {availableDocTypes.length} selected
        </p>
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
                isSelected
                  ? "border-teal-300 bg-teal-50/60 ring-2 ring-teal-200"
                  : "border-border bg-card hover:border-teal-200",
                disabled && "opacity-50 cursor-not-allowed",
              )}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">
                      {config?.label ?? docType}
                    </p>
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      Received
                    </Badge>
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
