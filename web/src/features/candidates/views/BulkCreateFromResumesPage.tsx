import {
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileUp,
  GraduationCap,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CountryCodeSelect,
  QualificationSelect,
} from "@/components/molecules";
import { CANDIDATE_SOURCES } from "@/constants/candidate-constants";
import { useCanAll } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import {
  useBulkParseResumesMutation,
  useBulkCreateFromDraftsMutation,
  type BulkCreateFromResumesResult,
  type BulkResumeDraft,
} from "@/features/candidates/api";
import {
  BULK_RESUME_MAX_FILES,
  BULK_RESUME_PARSE_PAGE_LIMIT,
  bulkCreateFromResumesSchema,
  bulkResumeReviewSchema,
  type BulkCreateFromResumesFormData,
  type BulkResumeReviewFormData,
} from "@/features/candidates/bulkCreateFromResumesSchema";

type Step = "upload" | "review" | "results";

const STEPS: Array<{
  id: Step;
  label: string;
  description: string;
  number: number;
}> = [
  {
    id: "upload",
    label: "Upload",
    description: "Add PDF resumes",
    number: 1,
  },
  {
    id: "review",
    label: "Review",
    description: "Edit & confirm",
    number: 2,
  },
  {
    id: "results",
    label: "Results",
    description: "Created candidates",
    number: 3,
  },
];

function draftsToFormValues(
  drafts: BulkResumeDraft[],
  meta: {
    source: string;
    roleCatalogId?: string;
  },
): BulkResumeReviewFormData {
  return {
    source: meta.source,
    roleCatalogId: meta.roleCatalogId,
    drafts: drafts.map((d) => ({
      draftId: d.draftId,
      fileName: d.fileName,
      included: true,
      parseWarnings: d.parseWarnings ?? [],
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      countryCode: d.countryCode,
      mobileNumber: d.mobileNumber,
      passportNumber: d.passportNumber,
      dateOfBirth: d.dateOfBirth,
      address: d.address,
      educations: (d.educations ?? []).map((e) => ({
        rawDegree: e.rawDegree,
        qualificationId: e.qualificationId,
        university: e.university,
        graduationYear: e.graduationYear,
        notes: e.notes,
      })),
      workExperiences: (d.workExperiences ?? []).map((w) => ({
        jobTitle: w.jobTitle || "Professional",
        companyName: w.companyName,
        location: w.location,
        startDate: w.startDate,
        endDate: w.endDate,
        isCurrent: w.isCurrent ?? false,
        description: w.description,
      })),
    })),
  };
}

function initials(first?: string, last?: string) {
  const a = (first ?? "").trim().charAt(0);
  const b = (last ?? "").trim().charAt(0);
  const value = `${a}${b}`.toUpperCase();
  return value || "?";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StepProgress({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="grid grid-cols-3 gap-2 sm:gap-3">
        {STEPS.map((s, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={s.id}>
              <div
                className={cn(
                  "relative flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-300",
                  active &&
                    "border-blue-200 bg-blue-50/80 shadow-sm shadow-blue-100/60",
                  done && "border-emerald-200 bg-emerald-50/50",
                  !done && !active && "border-slate-200/80 bg-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300",
                    done && "bg-emerald-500 text-white shadow-sm",
                    active && "bg-blue-600 text-white shadow-md shadow-blue-200",
                    !done && !active && "bg-slate-100 text-slate-400",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : s.number}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-sm font-semibold",
                      active && "text-blue-900",
                      done && "text-emerald-900",
                      !done && !active && "text-slate-500",
                    )}
                  >
                    {s.label}
                  </p>
                  <p
                    className={cn(
                      "hidden truncate text-xs sm:block",
                      active && "text-blue-700/80",
                      done && "text-emerald-700/70",
                      !done && !active && "text-slate-400",
                    )}
                  >
                    {s.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function DraftReviewCard({
  index,
  control,
  expanded,
  onToggle,
  onRemoveEducation,
  onAddEducation,
  onRemoveWork,
  onAddWork,
}: {
  index: number;
  control: ReturnType<typeof useForm<BulkResumeReviewFormData>>["control"];
  expanded: boolean;
  onToggle: () => void;
  onRemoveEducation: (eduIndex: number) => void;
  onAddEducation: () => void;
  onRemoveWork: (weIndex: number) => void;
  onAddWork: () => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-white transition-all duration-300",
        expanded
          ? "border-blue-200 shadow-lg shadow-blue-100/40"
          : "border-slate-200/90 shadow-sm hover:border-slate-300 hover:shadow-md",
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3 px-4 py-4 sm:px-5",
          expanded
            ? "bg-gradient-to-r from-blue-50/80 via-white to-white"
            : "bg-slate-50/60",
        )}
      >
        <Controller
          name={`drafts.${index}.included`}
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
              aria-label={`Include draft ${index + 1}`}
              className="mt-2.5"
            />
          )}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <Controller
            name={`drafts.${index}.firstName`}
            control={control}
            render={({ field: first }) => (
              <Controller
                name={`drafts.${index}.lastName`}
                control={control}
                render={({ field: last }) => (
                  <span
                    className={cn(
                      "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold tracking-wide",
                      expanded
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                        : "bg-white text-slate-700 ring-1 ring-slate-200",
                    )}
                  >
                    {initials(first.value, last.value)}
                  </span>
                )}
              />
            )}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Controller
                  name={`drafts.${index}.firstName`}
                  control={control}
                  render={({ field: first }) => (
                    <Controller
                      name={`drafts.${index}.lastName`}
                      control={control}
                      render={({ field: last }) => (
                        <p className="truncate text-base font-semibold text-slate-900">
                          {first.value} {last.value}
                        </p>
                      )}
                    />
                  )}
                />
                <Controller
                  name={`drafts.${index}.fileName`}
                  control={control}
                  render={({ field }) => (
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <FileText className="h-3 w-3 shrink-0" />
                      {field.value}
                    </p>
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                  expanded
                    ? "bg-blue-100 text-blue-700"
                    : "bg-white text-slate-400 ring-1 ring-slate-200",
                )}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Controller
                name={`drafts.${index}.parseWarnings`}
                control={control}
                render={({ field }) =>
                  (field.value ?? []).length === 0 ? (
                    <Badge className="gap-1 border-0 bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                      <CheckCircle2 className="h-3 w-3" />
                      Ready
                    </Badge>
                  ) : (
                    <>
                      {(field.value ?? []).map((w) => (
                        <Badge
                          key={w}
                          variant="secondary"
                          className="gap-1 border-0 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {w}
                        </Badge>
                      ))}
                    </>
                  )
                }
              />
            </div>
          </div>
        </button>
      </div>

      {expanded && (
        <div className="animate-in fade-in slide-in-from-top-1 space-y-6 border-t border-slate-100 px-4 py-5 duration-200 sm:px-5">
          <section className="space-y-3">
            <SectionHeading icon={User} title="Contact" />
            <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/40 p-4 md:grid-cols-2 xl:grid-cols-4">
              <Controller
                name={`drafts.${index}.firstName`}
                control={control}
                render={({ field, fieldState }) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={`fn-${index}`}>First name</Label>
                    <Input
                      id={`fn-${index}`}
                      className="rounded-xl bg-white"
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-rose-600">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )}
              />
              <Controller
                name={`drafts.${index}.lastName`}
                control={control}
                render={({ field, fieldState }) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={`ln-${index}`}>Last name</Label>
                    <Input
                      id={`ln-${index}`}
                      className="rounded-xl bg-white"
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-rose-600">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )}
              />
              <Controller
                name={`drafts.${index}.email`}
                control={control}
                render={({ field, fieldState }) => (
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor={`em-${index}`}>Email</Label>
                    <Input
                      id={`em-${index}`}
                      type="email"
                      className="rounded-xl bg-white"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-rose-600">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )}
              />
              <Controller
                name={`drafts.${index}.countryCode`}
                control={control}
                render={({ field, fieldState }) => (
                  <CountryCodeSelect
                    label="Country code"
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name={`drafts.${index}.mobileNumber`}
                control={control}
                render={({ field, fieldState }) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={`mob-${index}`}>Mobile</Label>
                    <Input
                      id={`mob-${index}`}
                      className="rounded-xl bg-white"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      inputMode="numeric"
                    />
                    {fieldState.error && (
                      <p className="text-xs text-rose-600">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeading
              icon={GraduationCap}
              title="Education"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl border-slate-200"
                  onClick={onAddEducation}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              }
            />
            <Controller
              name={`drafts.${index}.educations`}
              control={control}
              render={({ field }) =>
                (field.value?.length ?? 0) === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                    <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      No education detected
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Add a row if the resume has qualifications to capture.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {field.value.map((_, eduIndex) => (
                      <div
                        key={eduIndex}
                        className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:grid-cols-2"
                      >
                        <Controller
                          name={`drafts.${index}.educations.${eduIndex}.qualificationId`}
                          control={control}
                          render={({ field: qField }) => (
                            <div className="space-y-1.5 sm:col-span-2">
                              <Label>Qualification</Label>
                              <QualificationSelect
                                value={qField.value}
                                onValueChange={qField.onChange}
                                placeholder="Select qualification"
                              />
                              <Controller
                                name={`drafts.${index}.educations.${eduIndex}.rawDegree`}
                                control={control}
                                render={({ field: raw }) => (
                                  <>
                                    {raw.value ? (
                                      <p className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-500">
                                        Parsed: {raw.value}
                                      </p>
                                    ) : null}
                                  </>
                                )}
                              />
                            </div>
                          )}
                        />
                        <Controller
                          name={`drafts.${index}.educations.${eduIndex}.university`}
                          control={control}
                          render={({ field: u }) => (
                            <div className="space-y-1.5">
                              <Label>University</Label>
                              <Input
                                className="rounded-xl"
                                value={u.value ?? ""}
                                onChange={u.onChange}
                              />
                            </div>
                          )}
                        />
                        <Controller
                          name={`drafts.${index}.educations.${eduIndex}.graduationYear`}
                          control={control}
                          render={({ field: y }) => (
                            <div className="space-y-1.5">
                              <Label>Graduation year</Label>
                              <Input
                                type="number"
                                className="rounded-xl"
                                value={y.value ?? ""}
                                onChange={(e) =>
                                  y.onChange(
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                  )
                                }
                              />
                            </div>
                          )}
                        />
                        <div className="flex justify-end sm:col-span-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => onRemoveEducation(eduIndex)}
                            aria-label="Remove education"
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            />
          </section>

          <section className="space-y-3">
            <SectionHeading
              icon={Briefcase}
              title="Work experience"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl border-slate-200"
                  onClick={onAddWork}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              }
            />
            <Controller
              name={`drafts.${index}.workExperiences`}
              control={control}
              render={({ field }) =>
                (field.value?.length ?? 0) === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                    <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      No work experience detected
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Add a row if the resume has roles to capture.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {field.value.map((_, weIndex) => (
                      <div
                        key={weIndex}
                        className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:grid-cols-2"
                      >
                        <Controller
                          name={`drafts.${index}.workExperiences.${weIndex}.jobTitle`}
                          control={control}
                          render={({ field: jt, fieldState }) => (
                            <div className="space-y-1.5">
                              <Label>Job title</Label>
                              <Input className="rounded-xl" {...jt} />
                              {fieldState.error && (
                                <p className="text-xs text-rose-600">
                                  {fieldState.error.message}
                                </p>
                              )}
                            </div>
                          )}
                        />
                        <Controller
                          name={`drafts.${index}.workExperiences.${weIndex}.companyName`}
                          control={control}
                          render={({ field: c }) => (
                            <div className="space-y-1.5">
                              <Label>Company</Label>
                              <Input
                                className="rounded-xl"
                                value={c.value ?? ""}
                                onChange={c.onChange}
                              />
                            </div>
                          )}
                        />
                        <Controller
                          name={`drafts.${index}.workExperiences.${weIndex}.startDate`}
                          control={control}
                          render={({ field: s }) => (
                            <div className="space-y-1.5">
                              <Label>Start date</Label>
                              <Input
                                type="date"
                                className="rounded-xl"
                                value={s.value ?? ""}
                                onChange={s.onChange}
                              />
                            </div>
                          )}
                        />
                        <Controller
                          name={`drafts.${index}.workExperiences.${weIndex}.endDate`}
                          control={control}
                          render={({ field: e }) => (
                            <div className="space-y-1.5">
                              <Label>End date</Label>
                              <Input
                                type="date"
                                className="rounded-xl"
                                value={e.value ?? ""}
                                onChange={e.onChange}
                              />
                            </div>
                          )}
                        />
                        <Controller
                          name={`drafts.${index}.workExperiences.${weIndex}.isCurrent`}
                          control={control}
                          render={({ field: cur }) => (
                            <label className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm text-slate-700 sm:col-span-2">
                              <Checkbox
                                checked={cur.value === true}
                                onCheckedChange={(v) =>
                                  cur.onChange(v === true)
                                }
                              />
                              Currently working here
                            </label>
                          )}
                        />
                        <div className="flex justify-end sm:col-span-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => onRemoveWork(weIndex)}
                            aria-label="Remove work experience"
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            />
          </section>
        </div>
      )}
    </div>
  );
}

export default function BulkCreateFromResumesPage() {
  const navigate = useNavigate();
  const canAccess = useCanAll([
    "write:candidates",
    "write:candidates_bulk_resume",
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parseFailed, setParseFailed] = useState<
    Array<{ fileName: string; reason: string }>
  >([]);
  const [result, setResult] = useState<BulkCreateFromResumesResult | null>(
    null,
  );
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 0: true });
  const [reviewPage, setReviewPage] = useState(1);

  const [bulkParse, { isLoading: isParsing }] = useBulkParseResumesMutation();
  const [bulkCreate, { isLoading: isCreating }] =
    useBulkCreateFromDraftsMutation();

  const uploadForm = useForm<BulkCreateFromResumesFormData>({
    resolver: zodResolver(bulkCreateFromResumesSchema) as never,
    defaultValues: {
      source: "direct_application",
      roleCatalogId: "",
    },
  });

  const reviewForm = useForm<BulkResumeReviewFormData>({
    resolver: zodResolver(bulkResumeReviewSchema) as never,
    defaultValues: {
      source: "direct_application",
      drafts: [],
    },
  });

  const { fields, update } = useFieldArray({
    control: reviewForm.control,
    name: "drafts",
  });

  const selectedDrafts = reviewForm.watch("drafts") ?? [];
  const includedCount = selectedDrafts.filter(
    (d: BulkResumeReviewFormData["drafts"][number]) => d.included,
  ).length;
  const createBlocked =
    includedCount === 0 ||
    selectedDrafts.some(
      (d: BulkResumeReviewFormData["drafts"][number]) =>
        d.included &&
        (!d.countryCode?.trim() || !d.mobileNumber?.trim()),
    );

  const totalSizeLabel = useMemo(() => {
    if (files.length === 0) return null;
    const bytes = files.reduce((sum, f) => sum + f.size, 0);
    return formatFileSize(bytes);
  }, [files]);

  const warningCount = useMemo(
    () =>
      selectedDrafts.filter(
        (d: BulkResumeReviewFormData["drafts"][number]) =>
          d.included && (d.parseWarnings?.length ?? 0) > 0,
      ).length,
    [selectedDrafts],
  );

  const reviewTotalPages = Math.max(
    1,
    Math.ceil(fields.length / BULK_RESUME_PARSE_PAGE_LIMIT),
  );
  const safeReviewPage = Math.min(reviewPage, reviewTotalPages);
  const reviewStart = (safeReviewPage - 1) * BULK_RESUME_PARSE_PAGE_LIMIT;
  const pagedFieldIndices = fields
    .map((field, index) => ({ field, index }))
    .slice(reviewStart, reviewStart + BULK_RESUME_PARSE_PAGE_LIMIT);

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6">
        <Card className="mx-auto max-w-lg border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              You do not have permission to create candidates from bulk resume
              uploads. Ask an admin to enable this on your user settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/candidates")}>
              Back to candidates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onFilesChosen = (list: FileList | null) => {
    if (!list?.length) return;
    const pdfs = Array.from(list).filter(
      (f) =>
        f.type === "application/pdf" ||
        f.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfs.length !== list.length) {
      toast.warning("Only PDF resumes are accepted; other files were skipped.");
    }
    setFiles((prev) => {
      const merged = [...prev, ...pdfs];
      if (merged.length > BULK_RESUME_MAX_FILES) {
        toast.error(`Maximum ${BULK_RESUME_MAX_FILES} PDF files allowed.`);
        return merged.slice(0, BULK_RESUME_MAX_FILES);
      }
      return merged;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onParse = uploadForm.handleSubmit(async (data) => {
    if (files.length === 0) {
      toast.error("Select at least one PDF resume.");
      return;
    }

    const limit = BULK_RESUME_PARSE_PAGE_LIMIT;

    try {
      const chunks: File[][] = [];
      for (let i = 0; i < files.length; i += limit) {
        chunks.push(files.slice(i, i + limit));
      }

      const responses = await Promise.all(
        chunks.map((chunk) =>
          bulkParse({
            source: data.source,
            roleCatalogId: data.roleCatalogId || undefined,
            files: chunk,
          }).unwrap(),
        ),
      );

      const allDrafts: BulkResumeDraft[] = [];
      const allFailed: Array<{ fileName: string; reason: string }> = [];
      let source = data.source;
      let roleCatalogId = data.roleCatalogId || undefined;

      for (const response of responses) {
        allDrafts.push(...(response.drafts ?? []));
        allFailed.push(...(response.failed ?? []));
        source = response.source || source;
        roleCatalogId = response.roleCatalogId ?? roleCatalogId;
      }

      setParseFailed(allFailed);
      if (!allDrafts.length) {
        toast.error("No drafts could be parsed from the uploaded resumes.");
        return;
      }

      const values = draftsToFormValues(allDrafts, {
        source,
        roleCatalogId,
      });
      reviewForm.reset(values);
      setExpanded({ 0: true });
      setReviewPage(1);
      setStep("review");
      toast.success(
        `Parsed ${allDrafts.length} draft(s)${
          allFailed.length ? `, ${allFailed.length} failed to parse` : ""
        }`,
      );
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Bulk resume parse failed";
      toast.error(message);
    }
  });

  const onCreate = reviewForm.handleSubmit(async (data) => {
    const selected = data.drafts.filter((d) => d.included);
    if (selected.length === 0) {
      toast.error("Select at least one draft to create.");
      return;
    }

    try {
      const response = await bulkCreate({
        source: data.source,
        roleCatalogId: data.roleCatalogId || undefined,
        drafts: selected.map((d) => ({
          draftId: d.draftId,
          fileName: d.fileName,
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email || undefined,
          countryCode: d.countryCode || undefined,
          mobileNumber: d.mobileNumber || undefined,
          passportNumber: d.passportNumber || undefined,
          dateOfBirth: d.dateOfBirth || undefined,
          address: d.address || undefined,
          educations: d.educations,
          workExperiences: d.workExperiences,
        })),
      }).unwrap();

      setResult(response);
      setStep("results");
      setFiles([]);
      toast.success(
        `Created ${response.created.length}, failed ${response.failed.length}`,
      );
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Bulk create from drafts failed";
      toast.error(message);
    }
  });

  const startOver = () => {
    setStep("upload");
    setResult(null);
    setParseFailed([]);
    setFiles([]);
    reviewForm.reset({
      source: "direct_application",
      drafts: [],
    });
  };

  const uploadFillPct = Math.min(
    100,
    Math.round((files.length / BULK_RESUME_MAX_FILES) * 100),
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-50/40">
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-transparent to-transparent"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mt-0.5 h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-white/80"
                onClick={() => navigate("/candidates")}
                aria-label="Back to candidates"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                  <Sparkles className="h-3 w-3" />
                  Bulk import
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Create from resumes
                </h1>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
                  Upload PDFs, review parsed education and experience, then
                  create candidates in one pass.
                </p>
              </div>
            </div>
            <div className="w-full lg:max-w-xl">
              <StepProgress current={step} />
            </div>
          </div>
        </header>

        {step === "upload" && (
          <Card className="w-full overflow-hidden border-slate-200/80 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white pb-5">
              <CardTitle className="flex items-center gap-3 text-lg text-slate-900">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-200">
                  <FileUp className="h-5 w-5" />
                </span>
                Upload resumes
              </CardTitle>
              <CardDescription className="ml-[52px]">
                Add up to {BULK_RESUME_MAX_FILES} PDF resumes. We&apos;ll parse
                them into editable drafts for review.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={onParse} className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-source">Candidate source</Label>
                    <Controller
                      name="source"
                      control={uploadForm.control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id="bulk-source"
                            className="h-11 rounded-xl"
                            aria-label="Candidate source"
                          >
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent>
                            {CANDIDATE_SOURCES.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <p className="text-xs text-slate-500">
                      Applied to every candidate created from this batch.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="bulk-resume-files">Resume PDFs</Label>
                      {files.length > 0 && (
                        <span className="text-xs font-medium text-slate-500">
                          {files.length}/{BULK_RESUME_MAX_FILES}
                          {totalSizeLabel ? ` · ${totalSizeLabel}` : ""}
                        </span>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      id="bulk-resume-files"
                      type="file"
                      accept="application/pdf,.pdf"
                      multiple
                      className="sr-only"
                      onChange={(e) => onFilesChosen(e.target.files)}
                      aria-describedby="bulk-resume-files-help"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        onFilesChosen(e.dataTransfer.files);
                      }}
                      className={cn(
                        "group relative flex w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-all duration-300",
                        isDragging
                          ? "scale-[1.01] border-blue-500 bg-blue-50 shadow-lg shadow-blue-100"
                          : "border-slate-200 bg-gradient-to-b from-slate-50/80 to-white hover:border-blue-300 hover:from-blue-50/40 hover:to-white hover:shadow-md",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300",
                          isDragging
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 group-hover:scale-105 group-hover:shadow-md",
                        )}
                      >
                        <Upload className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-base font-semibold text-slate-800">
                          Drop PDF resumes here
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          or{" "}
                          <span className="font-medium text-blue-600">
                            browse your files
                          </span>
                        </p>
                        <p
                          id="bulk-resume-files-help"
                          className="mt-3 text-xs text-slate-400"
                        >
                          PDF only · up to {BULK_RESUME_MAX_FILES} files
                        </p>
                      </div>
                    </button>

                    {files.length > 0 && (
                      <div className="space-y-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              "h-full rounded-full bg-blue-500 transition-all duration-500",
                              uploadFillPct <= 20 && "w-1/5",
                              uploadFillPct > 20 &&
                                uploadFillPct <= 40 &&
                                "w-2/5",
                              uploadFillPct > 40 &&
                                uploadFillPct <= 60 &&
                                "w-3/5",
                              uploadFillPct > 60 &&
                                uploadFillPct <= 80 &&
                                "w-4/5",
                              uploadFillPct > 80 && "w-full",
                            )}
                          />
                        </div>
                        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {files.map((file, index) => (
                            <li
                              key={`${file.name}-${index}`}
                              className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm transition-shadow hover:shadow-md"
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                                <FileText className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-800">
                                  {file.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatFileSize(file.size)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-lg text-slate-400 opacity-70 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                                onClick={() => removeFile(index)}
                                aria-label={`Remove ${file.name}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    {files.length === 0
                      ? "Select at least one resume to continue."
                      : `${files.length} resume${files.length === 1 ? "" : "s"} ready to parse.`}
                  </p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => navigate("/candidates")}
                      disabled={isParsing}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-xl bg-blue-600 shadow-md shadow-blue-200 hover:bg-blue-700"
                      disabled={isParsing || files.length === 0}
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Parsing resumes…
                        </>
                      ) : (
                        <>
                          Parse & review
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "review" && (
          <div className="space-y-4">
            {/* Review summary strip */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-500">Drafts</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {fields.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3.5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-blue-700/80">Selected</p>
                  <p className="text-xl font-semibold text-blue-900">
                    {includedCount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3.5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-amber-800/80">
                    Need attention
                  </p>
                  <p className="text-xl font-semibold text-amber-900">
                    {warningCount}
                  </p>
                </div>
              </div>
            </div>

            <Card className="w-full overflow-hidden border-slate-200/80 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white pb-5">
                <CardTitle className="text-lg text-slate-900">
                  Review drafts
                </CardTitle>
                <CardDescription>
                  Expand a draft to edit contact, education, and work
                  experience. Uncheck any draft you want to skip.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <form onSubmit={onCreate} className="space-y-4">
                  {parseFailed.length > 0 && (
                    <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5">
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold text-rose-800">
                          Failed to parse ({parseFailed.length})
                        </p>
                        <ul className="mt-1.5 space-y-1 text-rose-700/90">
                          {parseFailed.map((f) => (
                            <li key={f.fileName}>
                              <span className="font-medium">{f.fileName}</span>
                              {": "}
                              {f.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {pagedFieldIndices.map(({ field, index }) => (
                      <DraftReviewCard
                        key={field.id}
                        index={index}
                        control={reviewForm.control}
                        expanded={expanded[index] === true}
                        onToggle={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [index]: !prev[index],
                          }))
                        }
                        onAddEducation={() => {
                          const draft = reviewForm.getValues(`drafts.${index}`);
                          update(index, {
                            ...draft,
                            educations: [
                              ...(draft.educations ?? []),
                              { qualificationId: undefined, university: "" },
                            ],
                          });
                        }}
                        onRemoveEducation={(eduIndex) => {
                          const draft = reviewForm.getValues(`drafts.${index}`);
                          update(index, {
                            ...draft,
                            educations: (draft.educations ?? []).filter(
                              (_, i) => i !== eduIndex,
                            ),
                          });
                        }}
                        onAddWork={() => {
                          const draft = reviewForm.getValues(`drafts.${index}`);
                          update(index, {
                            ...draft,
                            workExperiences: [
                              ...(draft.workExperiences ?? []),
                              {
                                jobTitle: "Professional",
                                isCurrent: false,
                              },
                            ],
                          });
                        }}
                        onRemoveWork={(weIndex) => {
                          const draft = reviewForm.getValues(`drafts.${index}`);
                          update(index, {
                            ...draft,
                            workExperiences: (
                              draft.workExperiences ?? []
                            ).filter((_, i) => i !== weIndex),
                          });
                        }}
                      />
                    ))}
                  </div>

                  {fields.length > 0 && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-500">
                        Showing{" "}
                        <span className="font-semibold text-slate-700">
                          {fields.length === 0 ? 0 : reviewStart + 1}
                        </span>
                        –
                        <span className="font-semibold text-slate-700">
                          {Math.min(
                            reviewStart + BULK_RESUME_PARSE_PAGE_LIMIT,
                            fields.length,
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-slate-700">
                          {fields.length}
                        </span>{" "}
                        drafts
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          disabled={safeReviewPage <= 1}
                          onClick={() =>
                            setReviewPage((p) => Math.max(1, p - 1))
                          }
                        >
                          <ChevronLeft className="mr-0.5 h-3.5 w-3.5" />
                          Prev
                        </Button>
                        <span className="min-w-[4.5rem] px-2 text-center text-xs font-medium text-slate-600">
                          {safeReviewPage} / {reviewTotalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          disabled={safeReviewPage >= reviewTotalPages}
                          onClick={() =>
                            setReviewPage((p) =>
                              Math.min(reviewTotalPages, p + 1),
                            )
                          }
                        >
                          Next
                          <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="sticky bottom-3 z-10 mt-2 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-4 shadow-lg shadow-slate-200/50 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setStep("upload")}
                      disabled={isCreating}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to upload
                    </Button>
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                      {createBlocked && includedCount > 0 && (
                        <p className="text-center text-xs text-amber-700 sm:text-right">
                          Selected drafts need a phone number.
                        </p>
                      )}
                      <Button
                        type="submit"
                        className="rounded-xl bg-blue-600 shadow-md shadow-blue-200 hover:bg-blue-700"
                        disabled={isCreating || createBlocked}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating…
                          </>
                        ) : (
                          <>
                            <Users className="mr-2 h-4 w-4" />
                            Create {includedCount} candidate
                            {includedCount === 1 ? "" : "s"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "results" && result && (
          <div className="w-full space-y-5">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              <div className="relative border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 px-5 py-6 sm:px-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-200">
                      <CheckCircle2 className="h-6 w-6" />
                    </span>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Import complete
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {result.created.length} candidate
                        {result.created.length === 1 ? "" : "s"} created
                        {result.failed.length > 0
                          ? `, ${result.failed.length} failed`
                          : ""}
                        .
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-emerald-800">
                        Created
                      </p>
                      <p className="text-3xl font-semibold tracking-tight text-emerald-900">
                        {result.created.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-rose-50/30 p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                      <XCircle className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-rose-800">Failed</p>
                      <p className="text-3xl font-semibold tracking-tight text-rose-900">
                        {result.failed.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg text-slate-900">Details</CardTitle>
                <CardDescription>
                  Open a profile to continue screening or processing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-5">
                {result.created.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Created
                    </h3>
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                            <TableHead>File</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Qualifications</TableHead>
                            <TableHead>Experience</TableHead>
                            <TableHead>Candidate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.created.map((row) => (
                            <TableRow key={row.candidateId}>
                              <TableCell className="text-sm text-slate-600">
                                {row.fileName}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                                    {initials(row.firstName, row.lastName)}
                                  </span>
                                  <span className="text-sm font-medium text-slate-900">
                                    {row.firstName} {row.lastName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.qualificationCount ?? 0}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.workExperienceCount ?? 0}
                              </TableCell>
                              <TableCell>
                                <Link
                                  to={`/candidates/${row.candidateId}`}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                                >
                                  Open profile
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {result.failed.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <XCircle className="h-4 w-4 text-rose-600" />
                      Failed
                    </h3>
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                            <TableHead>File</TableHead>
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.failed.map((row, idx) => (
                            <TableRow key={`${row.fileName}-${idx}`}>
                              <TableCell className="text-sm">
                                {row.fileName}
                              </TableCell>
                              <TableCell className="text-sm text-rose-700">
                                {row.reason}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={startOver}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload more
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl bg-blue-600 shadow-md shadow-blue-200 hover:bg-blue-700"
                    onClick={() => navigate("/candidates")}
                  >
                    Back to candidates
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
