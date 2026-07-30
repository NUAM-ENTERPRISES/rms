import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, FileText, UploadCloud, UsersRound } from "lucide-react";
import { useCanAll } from "@/hooks/useCan";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BULK_RESUME_PARSE_PAGE_LIMIT,
  bulkCreateFromResumesSchema,
  bulkResumeReviewDraftSchema,
  type BulkCreateFromResumesFormValues,
} from "@/features/candidates/bulkCreateFromResumesSchema";
import {
  useBulkCreateFromDraftsMutation,
  useBulkParseResumesMutation,
  type BulkCreateFromResumesResult,
  type BulkResumeDraft,
} from "@/features/candidates/api";

type ReviewRow = BulkResumeDraft & { include: boolean };
type Step = "upload" | "review" | "results";

export default function BulkCreateFromResumesFlowPage() {
  const navigate = useNavigate();
  const canUseBulk = useCanAll([
    "write:candidates",
    "write:candidates_bulk_resume",
  ]);
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [result, setResult] = useState<BulkCreateFromResumesResult | null>(null);
  const [parseFailures, setParseFailures] = useState<
    Array<{ fileName: string; reason: string }>
  >([]);
  const [bulkParseResumes, { isLoading: isParsing }] =
    useBulkParseResumesMutation();
  const [bulkCreateFromDrafts, { isLoading: isCreating }] =
    useBulkCreateFromDraftsMutation();

  const form = useForm<BulkCreateFromResumesFormValues>({
    resolver: zodResolver(bulkCreateFromResumesSchema),
    defaultValues: { source: "manual", files: [] },
  });

  const included = useMemo(() => rows.filter((row) => row.include), [rows]);

  const parse = form.handleSubmit(async (values) => {
    const drafts: BulkResumeDraft[] = [];
    const failures: Array<{ fileName: string; reason: string }> = [];
    for (let i = 0; i < values.files.length; i += BULK_RESUME_PARSE_PAGE_LIMIT) {
      const fd = new FormData();
      values.files
        .slice(i, i + BULK_RESUME_PARSE_PAGE_LIMIT)
        .forEach((file) => fd.append("files", file));
      if (values.source) fd.append("source", values.source);
      if (values.professionTypeId) fd.append("professionTypeId", values.professionTypeId);
      if (values.roleCatalogId) fd.append("roleCatalogId", values.roleCatalogId);
      try {
        const response = await bulkParseResumes(fd).unwrap();
        drafts.push(...response.data.drafts);
        failures.push(...response.data.failed);
      } catch (error) {
        failures.push({
          fileName: values.files
            .slice(i, i + BULK_RESUME_PARSE_PAGE_LIMIT)
            .map((file) => file.name)
            .join(", "),
          reason:
            (error as { data?: { message?: string } })?.data?.message ??
            "Chunk parse failed.",
        });
      }
    }
    if (!drafts.length) {
      toast.error("No drafts parsed. Please try different resume files.");
      return;
    }
    setParseFailures(failures);
    setRows(drafts.map((draft) => ({ ...draft, include: true })));
    setStep("review");
  });

  const create = async () => {
    const invalid = included.find(
      (row) => !bulkResumeReviewDraftSchema.safeParse(row).success,
    );
    if (invalid) {
      toast.error("Please fix invalid included rows before creating.");
      return;
    }
    try {
      const response = await bulkCreateFromDrafts({
        source: form.getValues("source"),
        professionTypeId: form.getValues("professionTypeId") || undefined,
        roleCatalogId: form.getValues("roleCatalogId") || undefined,
        drafts: included.map(({ include, ...draft }) => draft),
      }).unwrap();
      setResult(response.data);
      setStep("results");
    } catch (error) {
      toast.error(
        (error as { data?: { message?: string } })?.data?.message ??
          "Bulk create failed.",
      );
    }
  };

  const stepOrder: Step[] = ["upload", "review", "results"];
  const activeStepIndex = stepOrder.indexOf(step);

  const updateRow = (draftId: string, updater: (row: ReviewRow) => ReviewRow) => {
    setRows((prev) => prev.map((row) => (row.draftId === draftId ? updater(row) : row)));
  };

  const updateEducationField = (
    draftId: string,
    index: number,
    field: "rawDegree" | "graduationYear" | "university",
    value: string,
  ) => {
    updateRow(draftId, (row) => {
      const educations = [...(row.educations ?? [])];
      educations[index] = { ...educations[index], [field]: value };
      return { ...row, educations };
    });
  };

  const updateWorkField = (
    draftId: string,
    index: number,
    field: "jobTitle" | "companyName" | "description" | "startDate" | "endDate",
    value: string,
  ) => {
    updateRow(draftId, (row) => {
      const workExperiences = [...(row.workExperiences ?? [])];
      workExperiences[index] = { ...workExperiences[index], [field]: value };
      return { ...row, workExperiences };
    });
  };

  if (!canUseBulk) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-foreground">Access denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You need both candidate write and bulk resume permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Bulk Resume Candidate Creation
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Upload PDFs, review parsed data, and create candidates in one guided flow.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl border bg-background px-3 py-2 text-center">
                <div className="font-semibold">{rows.length || 0}</div>
                <div className="text-muted-foreground">Parsed</div>
              </div>
              <div className="rounded-xl border bg-background px-3 py-2 text-center">
                <div className="font-semibold">{included.length}</div>
                <div className="text-muted-foreground">Included</div>
              </div>
              <div className="rounded-xl border bg-background px-3 py-2 text-center">
                <div className="font-semibold">{parseFailures.length}</div>
                <div className="text-muted-foreground">Parse Issues</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: "upload", label: "Upload", icon: UploadCloud },
            { id: "review", label: "Review", icon: FileText },
            { id: "results", label: "Results", icon: CheckCircle2 },
          ].map((s, index) => {
            const Icon = s.icon;
            const isDone = index < activeStepIndex;
            const isActive = index === activeStepIndex;
            return (
              <div
                key={s.id}
                className={`rounded-xl border p-3 transition ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : isDone
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

      {step === "upload" ? (
        <form
          className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void parse();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="source">Source</Label>
              <Input id="source" placeholder="manual" {...form.register("source")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="professionTypeId">Profession Type ID</Label>
              <Input
                id="professionTypeId"
                placeholder="Optional"
                {...form.register("professionTypeId")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="roleCatalogId">Role Catalog ID</Label>
              <Input
                id="roleCatalogId"
                placeholder="Optional"
                {...form.register("roleCatalogId")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(event) =>
                form.setValue("files", Array.from(event.target.files ?? []), {
                  shouldValidate: true,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              PDF files only. Parsed in chunks of {BULK_RESUME_PARSE_PAGE_LIMIT} files.
            </p>
          </div>
          <div className="flex items-center justify-end">
            <Button type="submit" disabled={isParsing}>
              {isParsing ? "Parsing resumes..." : "Parse resumes"}
            </Button>
          </div>
        </form>
      ) : null}
      {step === "review" ? (
        <div className="space-y-4">
          {parseFailures.length > 0 ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
              <p className="font-medium text-sm text-amber-900">Some files had parse issues</p>
              <div className="mt-1 space-y-1">
                {parseFailures.map((item) => (
                  <p key={`${item.fileName}-${item.reason}`} className="text-xs text-amber-800">
                    {item.fileName}: {item.reason}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          {rows.map((row) => (
            <div key={row.draftId} className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{row.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Draft ID: {row.draftId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={row.include}
                    onCheckedChange={(checked) =>
                      updateRow(row.draftId, (entry) => ({
                        ...entry,
                        include: Boolean(checked),
                      }))
                    }
                  />
                  <span className="text-sm">Include</span>
                </div>
              </div>
              {(row.warnings ?? []).length > 0 ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                  {(row.warnings ?? []).map((warning, warningIndex) => (
                    <p
                      key={`${row.draftId}-warning-${warningIndex}`}
                      className="text-xs text-amber-800"
                    >
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="First name"
                  value={row.firstName ?? ""}
                  onChange={(event) =>
                    updateRow(row.draftId, (entry) => ({
                      ...entry,
                      firstName: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Last name"
                  value={row.lastName ?? ""}
                  onChange={(event) =>
                    updateRow(row.draftId, (entry) => ({
                      ...entry,
                      lastName: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Country code"
                  value={row.countryCode ?? ""}
                  onChange={(event) =>
                    updateRow(row.draftId, (entry) => ({
                      ...entry,
                      countryCode: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Mobile number"
                  value={row.mobileNumber ?? ""}
                  onChange={(event) =>
                    updateRow(row.draftId, (entry) => ({
                      ...entry,
                      mobileNumber: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Education</Label>
                {(row.educations ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No education detected from this resume.
                  </p>
                ) : null}
                {(row.educations ?? []).map((education, index) => (
                  <div key={`${row.draftId}-edu-${index}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-md border border-border bg-background p-3">
                    <Input
                      placeholder="Degree / Qualification"
                      value={education.rawDegree ?? ""}
                      onChange={(event) =>
                        updateEducationField(
                          row.draftId,
                          index,
                          "rawDegree",
                          event.target.value,
                        )
                      }
                    />
                    <Input
                      placeholder="University / Institute"
                      value={education.university ?? ""}
                      onChange={(event) =>
                        updateEducationField(
                          row.draftId,
                          index,
                          "university",
                          event.target.value,
                        )
                      }
                    />
                    <Input
                      placeholder="Graduation year"
                      value={education.graduationYear ?? ""}
                      onChange={(event) =>
                        updateEducationField(
                          row.draftId,
                          index,
                          "graduationYear",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Work Experience</Label>
                {(row.workExperiences ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No work experience detected from this resume.
                  </p>
                ) : null}
                {(row.workExperiences ?? []).map((work, index) => (
                  <div key={`${row.draftId}-work-${index}`} className="space-y-2 rounded-md border border-border bg-background p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input
                        placeholder="Job title"
                        value={work.jobTitle ?? ""}
                        onChange={(event) =>
                          updateWorkField(
                            row.draftId,
                            index,
                            "jobTitle",
                            event.target.value,
                          )
                        }
                      />
                      <Input
                        placeholder="Company"
                        value={work.companyName ?? ""}
                        onChange={(event) =>
                          updateWorkField(
                            row.draftId,
                            index,
                            "companyName",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input
                        type="date"
                        placeholder="Start date"
                        value={work.startDate ?? ""}
                        onChange={(event) =>
                          updateWorkField(
                            row.draftId,
                            index,
                            "startDate",
                            event.target.value,
                          )
                        }
                      />
                      <Input
                        type="date"
                        placeholder="End date"
                        value={work.endDate ?? ""}
                        onChange={(event) =>
                          updateWorkField(
                            row.draftId,
                            index,
                            "endDate",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                    <Textarea
                      placeholder="Work description"
                      value={work.description ?? ""}
                      onChange={(event) =>
                        updateWorkField(
                          row.draftId,
                          index,
                          "description",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UsersRound className="h-4 w-4" />
              {included.length} of {rows.length} drafts selected for creation
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={() => void create()} disabled={isCreating || included.length === 0}>
                {isCreating ? "Creating candidates..." : `Create ${included.length} candidates`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {step === "results" && result ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <h2 className="text-lg font-semibold text-foreground">Bulk create completed</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Created {result.created.length} candidates, failed {result.failed.length}.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <h3 className="font-medium text-foreground mb-3">Created Candidates</h3>
            <div className="space-y-2">
              {result.created.length === 0 ? (
                <p className="text-sm text-muted-foreground">No candidates were created.</p>
              ) : (
                result.created.map((item) => (
                  <div
                    key={item.draftId}
                    className="rounded-lg border border-border bg-background p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.fileName}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/candidates/${item.candidateId}`)}
                    >
                      Open
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {result.failed.length > 0 ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 md:p-6">
              <h3 className="font-medium text-destructive mb-3">Failed Records</h3>
              <div className="space-y-1">
                {result.failed.map((item) => (
                  <p key={`${item.draftId}-${item.reason}`} className="text-sm text-destructive">
                    {item.fileName}: {item.reason}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Start New Batch
            </Button>
            <Button onClick={() => navigate("/candidates")}>Go to Candidates</Button>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
