import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CircleCheck,
  CloudUpload,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  useApproveCatalogValueMutation,
  useConfirmImportMutation,
  useCreateImportBatchMutation,
  useGetImportBatchQuery,
  useGetImportRecruitersQuery,
  useSetSheetOwnersMutation,
  useUpdateImportRowMutation,
} from "../data/candidate-import.endpoints";
import { ImportResultsTable } from "../components/ImportResultsTable";
import { ImportRowEditor } from "../components/ImportRowEditor";
import { SheetRecruiterMapper } from "../components/SheetRecruiterMapper";
import type {
  ImportRow,
  ImportRowResult,
  ImportRowStatus,
  UpdateImportRowPayload,
} from "../data/dto";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const POLL_INTERVAL_MS = 2000;

type WizardStep = "upload" | "analyzing" | "review" | "results";

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "analyzing", label: "Analyzing" },
  { id: "review", label: "Review" },
  { id: "results", label: "Results" },
];

const STATUS_TONE: Record<ImportRowStatus, string> = {
  ready: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  needs_review: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  duplicate: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  invalid: "bg-destructive/10 text-destructive",
  imported: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-muted text-muted-foreground",
};

/**
 * Four-step wizard that turns a recruiter's spreadsheet into CRM candidates.
 *
 * Parsing happens in a background job, so the analyzing step polls the batch
 * rather than holding a request open.
 */
export default function CandidateImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [activeTabsOnly, setActiveTabsOnly] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [results, setResults] = useState<ImportRowResult[]>([]);

  const [createBatch, { isLoading: isUploading }] =
    useCreateImportBatchMutation();
  const [updateRow, { isLoading: isSavingRow }] = useUpdateImportRowMutation();
  const [setSheetOwners, { isLoading: isSavingOwners }] =
    useSetSheetOwnersMutation();
  const [approveCatalogValue] = useApproveCatalogValueMutation();
  const [confirmImport, { isLoading: isConfirming }] =
    useConfirmImportMutation();

  const { data: recruiterData } = useGetImportRecruitersQuery();
  const recruiters = recruiterData?.recruiters ?? [];

  const { data: batchData } = useGetImportBatchQuery(batchId as string, {
    skip: !batchId,
    // Only poll while the worker is still parsing.
    pollingInterval: step === "analyzing" ? POLL_INTERVAL_MS : 0,
  });
  const batch = batchData?.batch;

  // Advance out of the analyzing step as soon as the worker reports back.
  useEffect(() => {
    if (step !== "analyzing" || !batch) return;
    if (batch.status === "review" || batch.status === "completed") {
      setStep("review");
    } else if (batch.status === "failed") {
      setStep("upload");
      toast.error(batch.error ?? "Could not read that file.");
    }
  }, [step, batch]);

  const rows = useMemo(() => batch?.rows ?? [], [batch]);
  const selectedRow: ImportRow | null =
    rows.find((row) => row.id === selectedRowId) ?? rows[0] ?? null;

  const handleFileChange = useCallback((nextFile: File | undefined) => {
    if (!nextFile) return;
    if (nextFile.size > MAX_FILE_BYTES) {
      toast.error("That file is larger than 25MB.");
      return;
    }
    if (!/\.(xlsx|xls|csv)$/i.test(nextFile.name)) {
      toast.error("Upload an .xlsx, .xls or .csv file.");
      return;
    }
    setFile(nextFile);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    try {
      const response = await createBatch({ file, activeTabsOnly }).unwrap();
      setBatchId(response.batch.id);
      setStep("analyzing");
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Upload failed.";
      toast.error(message);
    }
  }, [file, activeTabsOnly, createBatch]);

  const handleRowSave = useCallback(
    async (changes: UpdateImportRowPayload) => {
      if (!batchId || !selectedRow) return;
      try {
        await updateRow({ batchId, rowId: selectedRow.id, changes }).unwrap();
        toast.success("Row updated.");
      } catch (error) {
        const message =
          (error as { data?: { message?: string } })?.data?.message ??
          "Could not save the row.";
        toast.error(message);
      }
    },
    [batchId, selectedRow, updateRow],
  );

  const handleCatalogChange = useCallback(
    async (
      field: "professionTypeId" | "qualificationId" | "roleCatalogId",
      id: string,
    ) => {
      if (!batchId || !selectedRow) return;
      try {
        await updateRow({
          batchId,
          rowId: selectedRow.id,
          changes: { [field]: id },
        }).unwrap();
      } catch {
        toast.error("Could not apply that mapping.");
      }
    },
    [batchId, selectedRow, updateRow],
  );

  const handleProposeQualification = useCallback(
    async (value: string) => {
      if (!batchId || !selectedRow?.mapping) return;
      // Prefer attaching an alias to the closest existing qualification; only
      // fall back to a brand-new row when there is nothing to attach it to.
      const closest = selectedRow.mapping.qualification.options[0];
      if (!closest) {
        toast.error(
          "No close qualification to alias. Create it in System Settings first.",
        );
        return;
      }
      try {
        await approveCatalogValue({
          batchId,
          payload: {
            target: "qualification_alias",
            value,
            qualificationId: closest.id,
          },
        }).unwrap();
        toast.success(`Added "${value}" as an alias of ${closest.label}.`);
      } catch (error) {
        const message =
          (error as { data?: { message?: string } })?.data?.message ??
          "Could not add that alias.";
        toast.error(message);
      }
    },
    [batchId, selectedRow, approveCatalogValue],
  );

  const handleConfirm = useCallback(async () => {
    if (!batchId) return;
    try {
      const response = await confirmImport({ batchId }).unwrap();
      setResults(response.results);
      setStep("results");
      toast.success(
        `Imported ${response.imported} candidate${response.imported === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Import failed.";
      toast.error(message);
    }
  }, [batchId, confirmImport]);

  const currentStepIndex = STEPS.findIndex((entry) => entry.id === step);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/candidates")}
            aria-label="Back to candidates"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Import candidates from a sheet
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload a recruiter workbook. Qualifications and departments are
              matched to the catalog, and you confirm before anything is saved.
            </p>
          </div>
        </div>
      </header>

      <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
        {STEPS.map((entry, index) => (
          <li key={entry.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                index < currentStepIndex && "bg-primary text-primary-foreground",
                index === currentStepIndex &&
                  "bg-primary text-primary-foreground ring-2 ring-primary/30",
                index > currentStepIndex && "bg-muted text-muted-foreground",
              )}
              aria-current={index === currentStepIndex ? "step" : undefined}
            >
              {index < currentStepIndex ? (
                <CircleCheck className="h-4 w-4" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "text-sm",
                index === currentStepIndex
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {entry.label}
            </span>
            {index < STEPS.length - 1 ? (
              <span className="mx-1 h-px w-6 bg-border" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>

      {step === "upload" ? (
        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFileChange(event.dataTransfer.files?.[0]);
            }}
          >
            <CloudUpload
              className="mb-3 h-10 w-10 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">
              Drop a workbook here, or choose a file
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              .xlsx, .xls or .csv up to 25MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              id="import-file"
              onChange={(event) => handleFileChange(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose file
            </Button>
            {file ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-foreground">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                {file.name}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border p-3">
            <Switch
              id="activeTabsOnly"
              checked={activeTabsOnly}
              onCheckedChange={setActiveTabsOnly}
            />
            <div>
              <Label htmlFor="activeTabsOnly">
                Only read active (red) worksheet tabs
              </Label>
              <p className="text-xs text-muted-foreground">
                Use this for the full multi-recruiter workbook, where archived
                recruiters are marked with blue tabs. Leave off for a single
                recruiter sheet or a CSV.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Uploading...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                  Analyze sheet
                </>
              )}
            </Button>
          </div>
        </section>
      ) : null}

      {step === "analyzing" ? (
        <section
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-12 text-center"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <h2 className="text-base font-medium text-foreground">
            Reading the sheet and matching the catalog
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Large workbooks take a minute. You can leave this page and come back
            to the batch later.
          </p>
          <Progress value={undefined} className="mt-2 w-64" />
        </section>
      ) : null}

      {step === "review" && batch ? (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-4">
            <SummaryTile label="Total rows" value={batch.totalRows} />
            <SummaryTile
              label="Ready"
              value={batch.readyRows}
              tone="text-emerald-700 dark:text-emerald-400"
            />
            <SummaryTile
              label="Need review"
              value={batch.reviewRows}
              tone="text-amber-700 dark:text-amber-400"
            />
            <SummaryTile
              label="Invalid"
              value={batch.invalidRows}
              tone="text-destructive"
            />
          </section>

          {batch.sheetOwners && batch.sheetOwners.length > 1 ? (
            <SheetRecruiterMapper
              sheetOwners={batch.sheetOwners}
              recruiters={recruiters}
              isSaving={isSavingOwners}
              onSave={async (owners) => {
                if (!batchId) return;
                try {
                  await setSheetOwners({ batchId, owners }).unwrap();
                  toast.success("Sheet owners applied.");
                } catch {
                  toast.error("Could not apply sheet owners.");
                }
              }}
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
            <nav
              className="max-h-[32rem] overflow-y-auto rounded-lg border border-border"
              aria-label="Parsed rows"
            >
              <ul>
                {rows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRowId(row.id)}
                      aria-current={
                        selectedRow?.id === row.id ? "true" : undefined
                      }
                      className={cn(
                        "flex w-full flex-col items-start gap-1 border-b border-border px-3 py-2 text-left transition-colors hover:bg-muted/60",
                        selectedRow?.id === row.id && "bg-muted",
                      )}
                    >
                      <span className="text-sm font-medium text-foreground">
                        {row.normalized.firstName}{" "}
                        {row.normalized.lastName ?? ""}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {row.sheetName}:{row.rowNumber}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "border-0 px-1.5 py-0 text-[10px]",
                            STATUS_TONE[row.status],
                          )}
                        >
                          {row.status.replace(/_/g, " ")}
                        </Badge>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <section className="rounded-lg border border-border bg-card p-4">
              {selectedRow ? (
                <ImportRowEditor
                  row={selectedRow}
                  recruiters={recruiters}
                  isSaving={isSavingRow}
                  onSave={handleRowSave}
                  onSkip={() => handleRowSave({ skip: true })}
                  onCatalogChange={handleCatalogChange}
                  onProposeQualification={handleProposeQualification}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No rows to review.
                </p>
              )}
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {batch.readyRows > 0 ? (
                <Users className="h-4 w-4" aria-hidden="true" />
              ) : (
                <TriangleAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />
              )}
              {batch.readyRows} of {batch.totalRows} rows are ready to import.
            </p>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming || batch.readyRows === 0}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Importing...
                </>
              ) : (
                `Import ${batch.readyRows} candidates`
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "results" ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">
              Import complete
            </h2>
            <p className="text-sm text-muted-foreground">
              {results.filter((result) => result.success).length} created,{" "}
              {results.filter((result) => !result.success).length} failed.
            </p>
          </div>
          <ImportResultsTable results={results} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep("upload");
                setFile(null);
                setBatchId(null);
                setResults([]);
              }}
            >
              Import another sheet
            </Button>
            <Button type="button" onClick={() => navigate("/candidates")}>
              Go to candidates
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  );
}
