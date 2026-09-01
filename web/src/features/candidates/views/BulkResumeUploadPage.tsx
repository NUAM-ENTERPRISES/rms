import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ProfessionTypeSelect } from "@/components/molecules/ProfessionTypeSelect";
import { useQualificationsLookup } from "@/shared/hooks/useQualificationsLookup";
import {
  useBulkAnalyzeResumesMutation,
  useBulkCreateCandidatesMutation,
  type BulkCreateCandidatePayload,
  type BulkCreateResumeResult,
  type ResumeEducationHint,
} from "@/features/candidates/api";

const MAX_FILES = 20;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type WizardStep = "upload" | "analyzing" | "review" | "results";

interface WorkExperienceForm {
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface RowForm {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  mobileNumber: string;
  professionTypeId: string;
  skills: string[];
  workExperiences: WorkExperienceForm[];
  qualificationId: string;
  university: string;
  graduationYear: string;
}

interface ResumeRow {
  id: string;
  file: File;
  filename: string;
  analysisFailed: boolean;
  analysisError?: string;
  summary: string | null;
  educationHints: ResumeEducationHint[];
  excluded: boolean;
  form: RowForm;
  createResult?: BulkCreateResumeResult;
}

const emptyForm = (): RowForm => ({
  firstName: "",
  lastName: "",
  email: "",
  countryCode: "+91",
  mobileNumber: "",
  professionTypeId: "",
  skills: [],
  workExperiences: [],
  qualificationId: "",
  university: "",
  graduationYear: "",
});

const COUNTRY_CODE_RE = /^\+[1-9]\d{0,3}$/;
const MOBILE_RE = /^\d{6,15}$/;

function validateRow(form: RowForm): string[] {
  const errors: string[] = [];
  if (!form.firstName.trim()) errors.push("First name is required");
  if (!form.professionTypeId) errors.push("Profession type is required");
  if (!COUNTRY_CODE_RE.test(form.countryCode.trim()))
    errors.push("Valid country code required (e.g. +91)");
  if (!MOBILE_RE.test(form.mobileNumber.trim()))
    errors.push("Valid mobile number required (6-15 digits)");
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim()))
    errors.push("Email is invalid");
  return errors;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const STEPS: Array<{ key: WizardStep; label: string }> = [
  { key: "upload", label: "Upload" },
  { key: "analyzing", label: "Analyze" },
  { key: "review", label: "Review" },
  { key: "results", label: "Done" },
];

export default function BulkResumeUploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [rows, setRows] = useState<ResumeRow[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [batchProfessionTypeId, setBatchProfessionTypeId] = useState("");
  const [skillInput, setSkillInput] = useState("");

  const [bulkAnalyze] = useBulkAnalyzeResumesMutation();
  const [bulkCreate, { isLoading: isCreating }] =
    useBulkCreateCandidatesMutation();
  const { qualifications } = useQualificationsLookup({
    isActive: true,
    limit: 100,
  });

  // ---------- Upload step ----------

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      const next: File[] = [...files];
      for (const file of list) {
        if (file.type !== "application/pdf") {
          toast.error(`"${file.name}" skipped — only PDF files are allowed`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`"${file.name}" skipped — larger than 5MB`);
          continue;
        }
        if (next.some((f) => f.name === file.name && f.size === file.size)) {
          toast.warning(`"${file.name}" is already added`);
          continue;
        }
        if (next.length >= MAX_FILES) {
          toast.error(`Maximum ${MAX_FILES} resumes at a time`);
          break;
        }
        next.push(file);
      }
      setFiles(next);
    },
    [files]
  );

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setStep("analyzing");
    try {
      const response = await bulkAnalyze(files).unwrap();
      const newRows: ResumeRow[] = response.results.map((result, i) => {
        const draft = result.draft;
        return {
          id: `${i}-${result.filename}`,
          file: files[i],
          filename: result.filename,
          analysisFailed: !result.success,
          analysisError: result.error,
          summary: draft?.summary ?? null,
          educationHints: draft?.educationHints ?? [],
          excluded: false,
          form: draft
            ? {
                firstName: draft.firstName ?? "",
                lastName: draft.lastName ?? "",
                email: draft.email ?? "",
                countryCode: draft.countryCode ?? "+91",
                mobileNumber: draft.mobileNumber ?? "",
                professionTypeId: "",
                skills: draft.skills ?? [],
                workExperiences: draft.workExperiences.map((exp) => ({
                  companyName: exp.companyName ?? "",
                  jobTitle: exp.jobTitle ?? "",
                  startDate: exp.startDate ?? "",
                  endDate: exp.endDate ?? "",
                  isCurrent: exp.isCurrent,
                })),
                qualificationId: "",
                university: draft.educationHints[0]?.institutions[0] ?? "",
                graduationYear: "",
              }
            : emptyForm(),
        };
      });
      setRows(newRows);
      setSelectedRowId(newRows[0]?.id ?? null);
      setStep("review");
      const failed = newRows.filter((r) => r.analysisFailed).length;
      if (failed > 0) {
        toast.warning(
          `${failed} resume(s) could not be analyzed — fill them manually or exclude them`
        );
      }
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Resume analysis failed. Is the AI service running?"
      );
      setStep("upload");
    }
  };

  // ---------- Review step ----------

  const selectedRow = rows.find((r) => r.id === selectedRowId) ?? null;

  const updateForm = (rowId: string, patch: Partial<RowForm>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, form: { ...row.form, ...patch } } : row
      )
    );
  };

  const updateExperience = (
    rowId: string,
    index: number,
    patch: Partial<WorkExperienceForm>
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const workExperiences = row.form.workExperiences.map((exp, i) =>
          i === index ? { ...exp, ...patch } : exp
        );
        return { ...row, form: { ...row.form, workExperiences } };
      })
    );
  };

  const applyBatchProfession = () => {
    if (!batchProfessionTypeId) return;
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        form: { ...row.form, professionTypeId: batchProfessionTypeId },
      }))
    );
    toast.success("Profession applied to all resumes");
  };

  const includedRows = rows.filter((r) => !r.excluded);
  const validIncludedRows = includedRows.filter(
    (r) => validateRow(r.form).length === 0
  );
  const attentionCount = includedRows.length - validIncludedRows.length;

  const submitCreate = async () => {
    if (validIncludedRows.length === 0) return;
    if (attentionCount > 0) {
      toast.error(
        `${attentionCount} included resume(s) still need attention. Fix or exclude them first.`
      );
      return;
    }

    const filesToSend = includedRows.map((r) => r.file);
    const payloads: BulkCreateCandidatePayload[] = includedRows.map((row) => {
      const f = row.form;
      const workExperiences = f.workExperiences
        .filter((exp) => exp.jobTitle.trim() && exp.startDate)
        .map((exp) => ({
          companyName: exp.companyName.trim() || undefined,
          jobTitle: exp.jobTitle.trim(),
          startDate: exp.startDate,
          endDate: exp.isCurrent || !exp.endDate ? undefined : exp.endDate,
          isCurrent: exp.isCurrent,
        }));
      const graduationYear = Number(f.graduationYear);
      return {
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        professionTypeId: f.professionTypeId,
        countryCode: f.countryCode.trim(),
        mobileNumber: f.mobileNumber.trim(),
        email: f.email.trim() || undefined,
        source: "resume_bulk_upload",
        skills: f.skills.length > 0 ? JSON.stringify(f.skills) : undefined,
        workExperiences:
          workExperiences.length > 0 ? workExperiences : undefined,
        qualifications: f.qualificationId
          ? [
              {
                qualificationId: f.qualificationId,
                university: f.university.trim() || undefined,
                graduationYear:
                  graduationYear >= 1950 && graduationYear <= 2030
                    ? graduationYear
                    : undefined,
                isCompleted: true,
              },
            ]
          : undefined,
      };
    });

    try {
      const response = await bulkCreate({
        files: filesToSend,
        candidates: payloads,
      }).unwrap();

      setRows((prev) =>
        prev.map((row) => {
          const idx = includedRows.findIndex((r) => r.id === row.id);
          return idx >= 0 ? { ...row, createResult: response.results[idx] } : row;
        })
      );
      setStep("results");
      const created = response.results.filter((r) => r.success).length;
      const failed = response.results.length - created;
      if (created > 0) toast.success(`${created} candidate(s) created`);
      if (failed > 0) toast.error(`${failed} candidate(s) failed`);
    } catch (error: any) {
      toast.error(error?.data?.message || "Bulk create failed");
    }
  };

  const retryFailed = () => {
    setRows((prev) =>
      prev
        .filter((row) => row.createResult && !row.createResult.success)
        .map((row) => ({ ...row, createResult: undefined }))
    );
    setSelectedRowId(
      rows.find((r) => r.createResult && !r.createResult.success)?.id ?? null
    );
    setStep("review");
  };

  // ---------- Render ----------

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/candidates")}
            aria-label="Back to candidates"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold md:text-2xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Bulk Resume Upload
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload up to {MAX_FILES} PDF resumes — AI drafts the candidates,
              you review and create.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  i < stepIndex && "bg-primary/10 text-primary",
                  i === stepIndex && "bg-primary text-primary-foreground",
                  i > stepIndex && "bg-muted text-muted-foreground"
                )}
              >
                {i < stepIndex ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <span>{i + 1}</span>
                )}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ---------- STEP 1: UPLOAD ---------- */}
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-all",
                isDragOver
                  ? "scale-[1.01] border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50 hover:bg-muted/40"
              )}
            >
              <div className="rounded-full bg-primary/10 p-4">
                <CloudUpload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  Drag & drop resumes here, or click to browse
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  PDF only · max {MAX_FILES} files · 5MB each
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {files.length} / {MAX_FILES} resumes
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setFiles([])}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear all
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {files.map((file) => (
                    <motion.div
                      key={`${file.name}-${file.size}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3"
                    >
                      <FileText className="h-5 w-5 shrink-0 text-red-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatSize(file.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() =>
                          setFiles((prev) => prev.filter((f) => f !== file))
                        }
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                size="lg"
                disabled={files.length === 0}
                onClick={startAnalysis}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Analyze {files.length > 0 ? `${files.length} ` : ""}Resume
                {files.length === 1 ? "" : "s"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ---------- STEP 2: ANALYZING ---------- */}
        {step === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mx-auto max-w-xl space-y-6 rounded-2xl border bg-card p-8 text-center"
          >
            <div className="mx-auto w-fit rounded-full bg-primary/10 p-5">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                Analyzing {files.length} resume{files.length === 1 ? "" : "s"}…
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Extracting text and running AI analysis. This can take a couple
                of minutes for large batches.
              </p>
            </div>
            <Progress value={undefined} className="h-2 animate-pulse" />
            <div className="max-h-56 space-y-1.5 overflow-y-auto text-left">
              {files.map((file) => (
                <div
                  key={`${file.name}-${file.size}`}
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ---------- STEP 3: REVIEW ---------- */}
        {step === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* Batch toolbar */}
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-end">
              <div className="flex-1">
                <ProfessionTypeSelect
                  value={batchProfessionTypeId}
                  onValueChange={setBatchProfessionTypeId}
                  label="Batch profession"
                  description="Apply the same profession type to every resume in this batch"
                />
              </div>
              <Button
                variant="secondary"
                onClick={applyBatchProfession}
                disabled={!batchProfessionTypeId}
              >
                Apply to all
              </Button>
              <div className="flex items-center gap-2 md:ml-auto">
                <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <CheckCircle2 className="h-3 w-3" />
                  {validIncludedRows.length} ready
                </Badge>
                {attentionCount > 0 && (
                  <Badge className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
                    <TriangleAlert className="h-3 w-3" />
                    {attentionCount} need attention
                  </Badge>
                )}
                {rows.length - includedRows.length > 0 && (
                  <Badge variant="secondary">
                    {rows.length - includedRows.length} excluded
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
              {/* Sidebar */}
              <div className="space-y-1.5 lg:max-h-[65vh] lg:overflow-y-auto lg:pr-1">
                {rows.map((row) => {
                  const errors = validateRow(row.form);
                  const isSelected = row.id === selectedRowId;
                  return (
                    <button
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg border p-3 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "bg-card hover:bg-muted/50",
                        row.excluded && "opacity-50"
                      )}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-red-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {row.form.firstName || row.form.lastName
                            ? `${row.form.firstName} ${row.form.lastName}`.trim()
                            : row.filename}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.filename}
                        </p>
                      </div>
                      {row.excluded ? (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          Skip
                        </Badge>
                      ) : row.analysisFailed && errors.length > 0 ? (
                        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                      ) : errors.length > 0 ? (
                        <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Editor */}
              {selectedRow ? (
                <div className="space-y-5 rounded-xl border bg-card p-5 lg:max-h-[65vh] lg:overflow-y-auto">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{selectedRow.filename}</h3>
                      {selectedRow.analysisFailed && (
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-red-600">
                          <XCircle className="h-3.5 w-3.5" />
                          AI analysis failed
                          {selectedRow.analysisError
                            ? `: ${selectedRow.analysisError}`
                            : ""}{" "}
                          — enter details manually
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`exclude-${selectedRow.id}`}
                        className="text-sm text-muted-foreground"
                      >
                        Include in batch
                      </Label>
                      <Switch
                        id={`exclude-${selectedRow.id}`}
                        checked={!selectedRow.excluded}
                        onCheckedChange={(checked) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.id === selectedRow.id
                                ? { ...r, excluded: !checked }
                                : r
                            )
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Validation summary */}
                  {!selectedRow.excluded &&
                    validateRow(selectedRow.form).length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <ul className="list-inside list-disc space-y-0.5">
                          {validateRow(selectedRow.form).map((err) => (
                            <li key={err}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Identity */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>First name *</Label>
                      <Input
                        value={selectedRow.form.firstName}
                        onChange={(e) =>
                          updateForm(selectedRow.id, { firstName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Last name *</Label>
                      <Input
                        value={selectedRow.form.lastName}
                        onChange={(e) =>
                          updateForm(selectedRow.id, { lastName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={selectedRow.form.email}
                        onChange={(e) =>
                          updateForm(selectedRow.id, { email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone *</Label>
                      <div className="flex gap-2">
                        <Input
                          className="w-20"
                          placeholder="+91"
                          value={selectedRow.form.countryCode}
                          onChange={(e) =>
                            updateForm(selectedRow.id, {
                              countryCode: e.target.value,
                            })
                          }
                        />
                        <Input
                          className="flex-1"
                          placeholder="Mobile number"
                          value={selectedRow.form.mobileNumber}
                          onChange={(e) =>
                            updateForm(selectedRow.id, {
                              mobileNumber: e.target.value.replace(/\D/g, ""),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <ProfessionTypeSelect
                    value={selectedRow.form.professionTypeId}
                    onValueChange={(value) =>
                      updateForm(selectedRow.id, { professionTypeId: value })
                    }
                    label="Profession type"
                    description=""
                    required
                    error={
                      !selectedRow.excluded && !selectedRow.form.professionTypeId
                        ? "Required"
                        : undefined
                    }
                  />

                  {/* Skills */}
                  <div className="space-y-2">
                    <Label>Skills</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRow.form.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          {skill}
                          <button
                            onClick={() =>
                              updateForm(selectedRow.id, {
                                skills: selectedRow.form.skills.filter(
                                  (s) => s !== skill
                                ),
                              })
                            }
                            aria-label={`Remove ${skill}`}
                            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a skill and press Enter"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && skillInput.trim()) {
                            e.preventDefault();
                            if (
                              !selectedRow.form.skills.includes(skillInput.trim())
                            ) {
                              updateForm(selectedRow.id, {
                                skills: [
                                  ...selectedRow.form.skills,
                                  skillInput.trim(),
                                ],
                              });
                            }
                            setSkillInput("");
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Work experience */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Work experience</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateForm(selectedRow.id, {
                            workExperiences: [
                              ...selectedRow.form.workExperiences,
                              {
                                companyName: "",
                                jobTitle: "",
                                startDate: "",
                                endDate: "",
                                isCurrent: false,
                              },
                            ],
                          })
                        }
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                    {selectedRow.form.workExperiences.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No work experience rows. Rows without a job title and
                        start date are skipped on create.
                      </p>
                    )}
                    {selectedRow.form.workExperiences.map((exp, i) => (
                      <div
                        key={i}
                        className="space-y-2 rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            placeholder="Company"
                            value={exp.companyName}
                            onChange={(e) =>
                              updateExperience(selectedRow.id, i, {
                                companyName: e.target.value,
                              })
                            }
                          />
                          <Input
                            placeholder="Job title *"
                            value={exp.jobTitle}
                            onChange={(e) =>
                              updateExperience(selectedRow.id, i, {
                                jobTitle: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="date"
                            className="w-40"
                            value={exp.startDate}
                            onChange={(e) =>
                              updateExperience(selectedRow.id, i, {
                                startDate: e.target.value,
                              })
                            }
                          />
                          <span className="text-sm text-muted-foreground">to</span>
                          <Input
                            type="date"
                            className="w-40"
                            value={exp.endDate}
                            disabled={exp.isCurrent}
                            onChange={(e) =>
                              updateExperience(selectedRow.id, i, {
                                endDate: e.target.value,
                              })
                            }
                          />
                          <label className="flex items-center gap-1.5 text-sm">
                            <Switch
                              checked={exp.isCurrent}
                              onCheckedChange={(checked) =>
                                updateExperience(selectedRow.id, i, {
                                  isCurrent: checked,
                                })
                              }
                            />
                            Current
                          </label>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-8 w-8 text-muted-foreground"
                            onClick={() =>
                              updateForm(selectedRow.id, {
                                workExperiences:
                                  selectedRow.form.workExperiences.filter(
                                    (_, idx) => idx !== i
                                  ),
                              })
                            }
                            aria-label="Remove experience"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Qualification */}
                  <div className="space-y-2">
                    <Label>Qualification</Label>
                    {selectedRow.educationHints.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        AI found:{" "}
                        {selectedRow.educationHints
                          .map((h) =>
                            [h.institutions.join(", "), h.years]
                              .filter(Boolean)
                              .join(" · ")
                          )
                          .filter(Boolean)
                          .join(" | ") || "no education details"}
                      </p>
                    )}
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Select
                        value={selectedRow.form.qualificationId}
                        onValueChange={(value) =>
                          updateForm(selectedRow.id, {
                            qualificationId: value === "none" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select qualification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {qualifications.map((q) => (
                            <SelectItem key={q.id} value={q.id}>
                              {q.shortName || q.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="University"
                        value={selectedRow.form.university}
                        onChange={(e) =>
                          updateForm(selectedRow.id, {
                            university: e.target.value,
                          })
                        }
                        disabled={!selectedRow.form.qualificationId}
                      />
                      <Input
                        placeholder="Graduation year"
                        value={selectedRow.form.graduationYear}
                        onChange={(e) =>
                          updateForm(selectedRow.id, {
                            graduationYear: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        disabled={!selectedRow.form.qualificationId}
                      />
                    </div>
                  </div>

                  {/* AI summary */}
                  {selectedRow.summary && (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Sparkles className="h-3 w-3" /> AI summary
                      </p>
                      <p className="text-sm">{selectedRow.summary}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-xl border bg-card p-10 text-muted-foreground">
                  Select a resume to review
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between rounded-xl border bg-card p-4">
              <Button variant="ghost" onClick={() => setStep("upload")}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to upload
              </Button>
              <Button
                size="lg"
                className="gap-2"
                disabled={
                  validIncludedRows.length === 0 ||
                  attentionCount > 0 ||
                  isCreating
                }
                onClick={submitCreate}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                Create {validIncludedRows.length} Candidate
                {validIncludedRows.length === 1 ? "" : "s"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ---------- STEP 4: RESULTS ---------- */}
        {step === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              {rows
                .filter((row) => row.createResult)
                .map((row) => {
                  const result = row.createResult!;
                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-4",
                        result.success
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-red-200 bg-red-50/60"
                      )}
                    >
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {`${row.form.firstName} ${row.form.lastName}`.trim() ||
                            row.filename}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {result.success
                            ? `${row.filename} — candidate created with resume attached`
                            : `${row.filename} — ${result.error}`}
                        </p>
                      </div>
                      {result.success && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/candidates/${result.candidateId}`)
                          }
                        >
                          View profile
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-between rounded-xl border bg-card p-4">
              {rows.some((r) => r.createResult && !r.createResult.success) ? (
                <Button variant="outline" onClick={retryFailed} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Edit & retry failed
                </Button>
              ) : (
                <span />
              )}
              <Button size="lg" onClick={() => navigate("/candidates")}>
                Done — back to candidates
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
