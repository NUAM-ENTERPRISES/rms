import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useGetBulkSendCsvProfilesMutation } from "../api";
import {
  BulkSendCsvColumnId,
  MANDATORY_CSV_COLUMNS,
  OPTIONAL_CSV_COLUMNS,
} from "../constants/bulk-send-csv-columns";
import {
  CsvGridState,
  profilesToGridRows,
  resolveSelectedColumnIds,
  sanitizeProjectFileName,
} from "../utils/buildBulkSendCsv";

interface GenerateBulkCsvCandidate {
  id?: string;
  candidateProjectMapId?: string;
  candidate: {
    firstName: string;
    lastName: string;
  };
}

interface GenerateBulkCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: GenerateBulkCsvCandidate[];
  projectTitle: string;
  onGenerated: (grid: CsvGridState) => void;
}

function getCandidateKey(candidate: GenerateBulkCsvCandidate): string {
  return candidate.id || candidate.candidateProjectMapId || "";
}

export function GenerateBulkCsvModal({
  isOpen,
  onClose,
  candidates,
  projectTitle,
  onGenerated,
}: GenerateBulkCsvModalProps) {
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState<Set<string>>(
    new Set(),
  );
  const [selectedOptionalColumns, setSelectedOptionalColumns] = useState<
    Set<BulkSendCsvColumnId>
  >(new Set());
  const [fetchProfiles, { isLoading }] = useGetBulkSendCsvProfilesMutation();

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCandidateKeys(new Set(candidates.map(getCandidateKey)));
    setSelectedOptionalColumns(new Set());
  }, [isOpen, candidates]);

  const allCandidateKeys = useMemo(
    () => candidates.map(getCandidateKey).filter(Boolean),
    [candidates],
  );

  const allCandidatesSelected =
    allCandidateKeys.length > 0 &&
    allCandidateKeys.every((key) => selectedCandidateKeys.has(key));

  const toggleCandidate = (key: string, checked: boolean) => {
    setSelectedCandidateKeys((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const toggleAllCandidates = (checked: boolean) => {
    setSelectedCandidateKeys(checked ? new Set(allCandidateKeys) : new Set());
  };

  const toggleOptionalColumn = (
    columnId: BulkSendCsvColumnId,
    checked: boolean,
  ) => {
    setSelectedOptionalColumns((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(columnId);
      } else {
        next.delete(columnId);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    const selectedCandidates = candidates.filter((candidate) =>
      selectedCandidateKeys.has(getCandidateKey(candidate)),
    );

    if (selectedCandidates.length === 0) {
      toast.error("Select at least one candidate");
      return;
    }

    const candidateProjectMapIds = selectedCandidates
      .map((candidate) => getCandidateKey(candidate))
      .filter(Boolean);

    try {
      const response = await fetchProfiles({ candidateProjectMapIds }).unwrap();
      const columnIds = resolveSelectedColumnIds(
        Array.from(selectedOptionalColumns),
      );
      const { headers, rows } = profilesToGridRows(response.data, columnIds);
      const grid: CsvGridState = {
        headers,
        rows,
        fileName: sanitizeProjectFileName(projectTitle),
      };
      onGenerated(grid);
      onClose();
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to generate CSV profiles";
      toast.error(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Generate CSV
          </DialogTitle>
          <DialogDescription>
            Choose candidates and optional columns for {projectTitle}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 py-4 space-y-4">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Candidates
              </h3>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <Checkbox
                  checked={allCandidatesSelected}
                  onCheckedChange={(checked) => toggleAllCandidates(checked === true)}
                  aria-label="Select all candidates"
                />
                Select all
              </label>
            </div>
            <ScrollArea className="h-40 rounded-md border p-3">
              <div className="space-y-2">
                {candidates.map((candidate) => {
                  const key = getCandidateKey(candidate);
                  const name = `${candidate.candidate.firstName} ${candidate.candidate.lastName}`;
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                    >
                      <Checkbox
                        checked={selectedCandidateKeys.has(key)}
                        onCheckedChange={(checked) =>
                          toggleCandidate(key, checked === true)
                        }
                        aria-label={`Include ${name}`}
                      />
                      <span>{name}</span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Mandatory columns
            </h3>
            <div className="flex flex-wrap gap-2">
              {MANDATORY_CSV_COLUMNS.map((column) => (
                <Badge key={column.id} variant="secondary">
                  {column.label}
                </Badge>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Optional columns
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {OPTIONAL_CSV_COLUMNS.map((column) => (
                <label
                  key={column.id}
                  className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                >
                  <Checkbox
                    checked={selectedOptionalColumns.has(column.id)}
                    onCheckedChange={(checked) =>
                      toggleOptionalColumn(column.id, checked === true)
                    }
                    aria-label={`Include ${column.label}`}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || selectedCandidateKeys.size === 0}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Generate CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
