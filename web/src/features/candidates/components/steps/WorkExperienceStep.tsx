import React, { useState, useRef, useEffect, type ChangeEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Plus,
  Star,
  X,
  Pencil,
  Upload,
  FileText,
  Building2,
  Calendar,
  MapPin,
  FileCheck,
  Trash2,
  ImageIcon,
  ChevronDown,
  Info,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DateUtils } from "@/shared/utils/date";
import { JobTitleSelect, DepartmentSelect, CountrySelect } from "@/components/molecules";

export type PendingCertBatch = {
  id: string;
  docName: string;
  files: File[];
};

type WorkExperience = {
  id: string;
  companyName: string;
  departmentId?: string;
  roleCatalogId: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  salary?: number;
  location: string;
  countryCode?: string;
  skills: string[];
  achievements: string;
  pendingCertBatches?: PendingCertBatch[];
};

interface WorkExperienceStepProps {
  workExperiences: WorkExperience[];
  setWorkExperiences: React.Dispatch<
    React.SetStateAction<WorkExperience[]>
  >;
  newWorkExperience: Omit<WorkExperience, "id">;
  setNewWorkExperience: React.Dispatch<
    React.SetStateAction<Omit<WorkExperience, "id">>
  >;
  editingExperienceId: string | null;
  setEditingExperienceId: (id: string | null) => void;
  newSkill: string;
  setNewSkill: React.Dispatch<React.SetStateAction<string>>;
}

const newBatchId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `batch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const formatExperiencePeriod = (
  startDate: string,
  endDate: string,
  isCurrent: boolean
): string => {
  const start = DateUtils.formatDate(startDate);
  if (isCurrent) return `${start} – Present`;
  const end = endDate ? DateUtils.formatDate(endDate) : "—";
  return `${start} – ${end}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isPdfFile = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

type ExperienceCertificatesPanelProps = {
  batches: PendingCertBatch[];
  onAdd: () => void;
  onRemoveBatch: (batchId: string) => void;
  className?: string;
  compact?: boolean;
};

function ExperienceCertificatesPanel({
  batches,
  onAdd,
  onRemoveBatch,
  className,
  compact = false,
}: ExperienceCertificatesPanelProps) {
  const totalFiles = batches.reduce((sum, b) => sum + b.files.length, 0);
  const hasQueued = batches.length > 0;

  return (
    <section
      aria-labelledby="experience-certificates-heading"
      className={cn(
        "rounded-lg border overflow-hidden",
        hasQueued
          ? "border-indigo-200 bg-indigo-50/30"
          : "border-border bg-muted/30",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 border-b border-border/80 bg-background/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"
            aria-hidden
          >
            <FileCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h5
                id="experience-certificates-heading"
                className="text-sm font-semibold text-foreground leading-tight"
              >
                Experience certificates
              </h5>
              {hasQueued && (
                <Badge
                  variant="secondary"
                  className="h-5 px-2 text-xs font-medium bg-indigo-100 text-indigo-700 border-0"
                >
                  {totalFiles} queued
                </Badge>
              )}
            </div>
            {!compact && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Optional · PDF or image · uploads when you save the candidate
              </p>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 px-2.5 text-sm border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          onClick={onAdd}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          Add document
        </Button>
      </div>

      <div className="px-3 py-2.5">
        {batches.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/80 px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            <Upload className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
            <span>No files yet — tap to attach certificates</span>
          </button>
        ) : (
          <ul className="space-y-2" aria-label="Queued certificate uploads">
            {batches.map((batch) => (
              <li
                key={batch.id}
                className="rounded-lg border border-indigo-100 bg-background overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-indigo-50 bg-indigo-50/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                    <span className="text-sm font-medium text-foreground truncate">
                      {batch.docName || "Experience letter"}
                    </span>
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 border-0 shrink-0"
                    >
                      {batch.files.length} file{batch.files.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => onRemoveBatch(batch.id)}
                    aria-label={`Remove ${batch.docName || "certificate group"}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ul className="divide-y divide-border">
                  {batch.files.map((file, fileIdx) => (
                    <li
                      key={`${batch.id}-${file.name}-${fileIdx}`}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground"
                    >
                      {isPdfFile(file) ? (
                        <FileText className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
                      ) : (
                        <ImageIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      )}
                      <span className="truncate flex-1 font-medium text-foreground">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-background p-4 space-y-4",
        className
      )}
    >
      <div className="space-y-1">
        <h5 className="text-sm font-semibold text-foreground">{title}</h5>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export const WorkExperienceStep: React.FC<WorkExperienceStepProps> = ({
  workExperiences,
  setWorkExperiences,
  newWorkExperience,
  setNewWorkExperience,
  editingExperienceId,
  setEditingExperienceId,
  newSkill,
  setNewSkill,
}) => {
  const certFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(workExperiences.length === 0);
  const [optionalDetailsOpen, setOptionalDetailsOpen] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certDocName, setCertDocName] = useState("");
  const [certFiles, setCertFiles] = useState<File[]>([]);
  const [certModalTarget, setCertModalTarget] = useState<
    "draft" | string | null
  >(null);

  const resetCertModalFields = () => {
    setCertDocName("");
    setCertFiles([]);
    if (certFileInputRef.current) certFileInputRef.current.value = "";
  };

  const openCertModal = (target: "draft" | string) => {
    setCertModalTarget(target);
    resetCertModalFields();
    setCertModalOpen(true);
  };

  const closeCertModal = () => {
    setCertModalOpen(false);
    setCertModalTarget(null);
    resetCertModalFields();
  };

  const confirmCertModal = () => {
    if (certFiles.length === 0) {
      toast.error("Select at least one file to add.");
      return;
    }
    if (!certModalTarget) return;
    const batch: PendingCertBatch = {
      id: newBatchId(),
      docName: certDocName.trim(),
      files: [...certFiles],
    };
    if (certModalTarget === "draft") {
      setNewWorkExperience((prev) => ({
        ...prev,
        pendingCertBatches: [...(prev.pendingCertBatches ?? []), batch],
      }));
    } else {
      setWorkExperiences((prev) =>
        prev.map((exp) =>
          exp.id === certModalTarget
            ? {
                ...exp,
                pendingCertBatches: [...(exp.pendingCertBatches ?? []), batch],
              }
            : exp
        )
      );
    }
    closeCertModal();
  };

  const addCertFilesFromInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setCertFiles((prev) => [...prev, ...files]);
      e.target.value = "";
    }
  };

  const removeCertFileAt = (idx: number) => {
    setCertFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeBatchFromExperience = (expId: string, batchId: string) => {
    setWorkExperiences((prev) =>
      prev.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              pendingCertBatches: (exp.pendingCertBatches ?? []).filter(
                (b) => b.id !== batchId
              ),
            }
          : exp
      )
    );
  };

  const removeBatchFromDraft = (batchId: string) => {
    setNewWorkExperience((prev) => ({
      ...prev,
      pendingCertBatches: (prev.pendingCertBatches ?? []).filter(
        (b) => b.id !== batchId
      ),
    }));
  };

  const emptyWorkExperience = (): Omit<WorkExperience, "id"> => ({
    companyName: "",
    departmentId: undefined,
    roleCatalogId: "",
    jobTitle: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
    salary: undefined,
    location: "",
    countryCode: "",
    skills: [],
    achievements: "",
    pendingCertBatches: [],
  });

  useEffect(() => {
    if (workExperiences.length === 0 && !editingExperienceId) {
      setIsFormOpen(true);
    }
  }, [workExperiences.length, editingExperienceId]);

  const scrollToWorkExperienceForm = () => {
    requestAnimationFrame(() => {
      document
        .getElementById("work-experience-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const openAddForm = () => {
    setEditingExperienceId(null);
    setNewWorkExperience(emptyWorkExperience());
    setNewSkill("");
    setOptionalDetailsOpen(false);
    setIsFormOpen(true);
    scrollToWorkExperienceForm();
  };

  const closeWorkExperienceForm = () => {
    setIsFormOpen(false);
    setEditingExperienceId(null);
    setNewWorkExperience(emptyWorkExperience());
    setNewSkill("");
    setOptionalDetailsOpen(false);
  };

  const addWorkExperience = () => {
    if (newWorkExperience.jobTitle && newWorkExperience.startDate) {
      if (editingExperienceId) {
        setWorkExperiences(
          workExperiences.map((exp) =>
            exp.id === editingExperienceId
              ? { ...newWorkExperience, id: editingExperienceId }
              : exp
          )
        );
        setEditingExperienceId(null);
        toast.success("Work experience updated.");
      } else {
        const newId = `work-exp-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        setWorkExperiences([
          ...workExperiences,
          { ...newWorkExperience, id: newId },
        ]);
        toast.success("Work experience added.");
      }
      setNewWorkExperience(emptyWorkExperience());
      setNewSkill("");
      setOptionalDetailsOpen(false);
      setIsFormOpen(false);
    } else {
      toast.error("Job title and start date are required.");
    }
  };

  const removeWorkExperience = (id: string) => {
    setWorkExperiences(workExperiences.filter((exp) => exp.id !== id));
    if (editingExperienceId === id) {
      closeWorkExperienceForm();
    }
  };

  const editWorkExperience = (id: string) => {
    const experienceToEdit = workExperiences.find((exp) => exp.id === id);
    if (experienceToEdit) {
      const { id: _expId, ...expData } = experienceToEdit;
      setNewWorkExperience(expData);
      setEditingExperienceId(id);
      setIsFormOpen(true);
      scrollToWorkExperienceForm();
    }
  };

  const addSkillToNewExperience = () => {
    if (
      newSkill.trim() &&
      !newWorkExperience.skills.includes(newSkill.trim())
    ) {
      setNewWorkExperience({
        ...newWorkExperience,
        skills: [...newWorkExperience.skills, newSkill.trim()],
      });
      setNewSkill("");
    }
  };

  const removeSkillFromNewExperience = (skillToRemove: string) => {
    setNewWorkExperience({
      ...newWorkExperience,
      skills: newWorkExperience.skills.filter(
        (skill) => skill !== skillToRemove
      ),
    });
  };

  const canSave =
    Boolean(newWorkExperience.jobTitle) &&
    Boolean(newWorkExperience.startDate);

  return (
    <>
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Briefcase className="h-5 w-5 text-primary" />
            Work Experience
          </CardTitle>
          <CardDescription>
            Add past or current roles for this candidate. This step is optional
            — you can skip it and add experience later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4"
            role="note"
          >
            <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" aria-hidden />
            <div className="space-y-1 text-sm text-foreground">
              <p className="font-medium">How this works</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>
                  Click <span className="font-medium text-foreground">Add work experience</span>{" "}
                  to open the form for one role.
                </li>
                <li>
                  Only <span className="font-medium text-foreground">job title</span> and{" "}
                  <span className="font-medium text-foreground">start date</span> are required.
                </li>
                <li>
                  Save the entry, then add another role or continue to the next step.
                </li>
              </ol>
            </div>
          </div>

          {workExperiences.length > 0 && (
            <section aria-labelledby="saved-experiences-heading" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4
                  id="saved-experiences-heading"
                  className="text-base font-semibold text-foreground"
                >
                  Saved roles
                </h4>
                <Badge variant="secondary">
                  {workExperiences.length}{" "}
                  {workExperiences.length === 1 ? "entry" : "entries"}
                </Badge>
              </div>
              <ul className="space-y-2" aria-label="Saved work experiences">
                {workExperiences.map((experience) => {
                  const certCount = (experience.pendingCertBatches ?? []).reduce(
                    (sum, b) => sum + b.files.length,
                    0
                  );
                  const isBeingEdited = editingExperienceId === experience.id;

                  return (
                    <li
                      key={experience.id}
                      className={cn(
                        "rounded-lg border bg-background overflow-hidden transition-colors",
                        isBeingEdited
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3 min-w-0 flex-1">
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                            aria-hidden
                          >
                            <Briefcase className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 space-y-1.5">
                            <p className="font-semibold text-foreground leading-snug">
                              {experience.jobTitle}
                            </p>
                            {experience.companyName ? (
                              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                {experience.companyName}
                              </p>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" aria-hidden />
                                {formatExperiencePeriod(
                                  experience.startDate,
                                  experience.endDate,
                                  experience.isCurrent
                                )}
                              </span>
                              {(experience.location || experience.countryCode) && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                                  {[experience.location, experience.countryCode]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              )}
                              {certCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="h-5 gap-1 text-xs"
                                >
                                  <FileCheck className="h-3 w-3" aria-hidden />
                                  {certCount} cert{certCount === 1 ? "" : "s"}
                                </Badge>
                              )}
                            </div>
                            {experience.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {experience.skills.map((skill, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="h-5 px-2 text-xs font-normal"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2 sm:flex-col">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => editWorkExperience(experience.id)}
                            aria-label={`Edit ${experience.jobTitle}`}
                          >
                            <Pencil className="h-4 w-4 mr-1.5" aria-hidden />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeWorkExperience(experience.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label={`Remove ${experience.jobTitle}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" aria-hidden />
                            Remove
                          </Button>
                        </div>
                      </div>

                      {certCount > 0 && !isBeingEdited && (
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between border-t border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            >
                              <span className="inline-flex items-center gap-2">
                                <FileCheck className="h-4 w-4" aria-hidden />
                                View queued certificates
                              </span>
                              <ChevronDown className="h-4 w-4" aria-hidden />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-4 pb-4">
                            <ExperienceCertificatesPanel
                              batches={experience.pendingCertBatches ?? []}
                              onAdd={() => openCertModal(experience.id)}
                              onRemoveBatch={(batchId) =>
                                removeBatchFromExperience(experience.id, batchId)
                              }
                              compact
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </li>
                  );
                })}
              </ul>

              {!isFormOpen && !editingExperienceId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={openAddForm}
                  className="w-full gap-2 border-dashed"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add more work experience
                </Button>
              )}
            </section>
          )}

          {(isFormOpen || editingExperienceId) && (
          <div
            id="work-experience-form"
            className="border border-slate-200 rounded-xl p-6 bg-gradient-to-b from-slate-50/80 to-white relative transition-all duration-300 shadow-sm"
          >
            {editingExperienceId && (
              <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-300">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                  <Pencil className="h-3 w-3" />
                  Editing Mode
                  <button
                    type="button"
                    onClick={closeWorkExperienceForm}
                    className="ml-1 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-slate-800">
                {editingExperienceId
                  ? "Edit Work Experience"
                  : "Add New Work Experience (Optional)"}
              </h4>
              <p className="text-sm text-slate-500 italic">
                {editingExperienceId
                  ? "Modify your work experience details below"
                  : "You can skip this step and add experience later"}
              </p>
            </div>

              <FormSection
                title="Role"
                description="Pick a department first, then choose the job title."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DepartmentSelect
                    value={newWorkExperience.departmentId}
                    onValueChange={(value) => {
                      setNewWorkExperience({
                        ...newWorkExperience,
                        departmentId: value,
                        roleCatalogId: "",
                        jobTitle: "",
                      });
                    }}
                    label="Department"
                    placeholder="Select department"
                  />
                  <JobTitleSelect
                    value={newWorkExperience.jobTitle}
                    onRoleChange={(role) => {
                      if (role) {
                        setNewWorkExperience({
                          ...newWorkExperience,
                          roleCatalogId: role.id,
                          jobTitle: role.label || role.name,
                        });
                      } else {
                        setNewWorkExperience({
                          ...newWorkExperience,
                          roleCatalogId: "",
                          jobTitle: "",
                        });
                      }
                    }}
                    label="Job title"
                    placeholder="e.g. Registered Nurse"
                    required
                    allowEmpty={false}
                    departmentId={newWorkExperience.departmentId}
                  />
                </div>
              </FormSection>

              <FormSection
                title="Employment period"
                description="When did this role start and end?"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="we-company-name">Organization name</Label>
                    <Input
                      id="we-company-name"
                      value={newWorkExperience.companyName}
                      onChange={(e) =>
                        setNewWorkExperience({
                          ...newWorkExperience,
                          companyName: e.target.value,
                        })
                      }
                      placeholder="e.g. Aster Hospital"
                      className="h-11 bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="we-start-date">
                      Start date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="we-start-date"
                      type="date"
                      value={newWorkExperience.startDate}
                      onChange={(e) =>
                        setNewWorkExperience({
                          ...newWorkExperience,
                          startDate: e.target.value,
                        })
                      }
                      className="h-11 bg-background"
                      aria-required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="we-end-date">End date</Label>
                    <Input
                      id="we-end-date"
                      type="date"
                      value={newWorkExperience.endDate}
                      onChange={(e) =>
                        setNewWorkExperience({
                          ...newWorkExperience,
                          endDate: e.target.value,
                        })
                      }
                      disabled={newWorkExperience.isCurrent}
                      className="h-11 bg-background"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5">
                  <Checkbox
                    id="we-is-current"
                    checked={newWorkExperience.isCurrent}
                    onCheckedChange={(checked) =>
                      setNewWorkExperience({
                        ...newWorkExperience,
                        isCurrent: checked === true,
                        endDate: checked === true ? "" : newWorkExperience.endDate,
                      })
                    }
                  />
                  <Label
                    htmlFor="we-is-current"
                    className="cursor-pointer font-normal"
                  >
                    Currently working in this role
                  </Label>
                </div>
              </FormSection>

              <Collapsible
                open={optionalDetailsOpen}
                onOpenChange={setOptionalDetailsOpen}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
                      Additional details (optional)
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        optionalDetailsOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="we-salary">Salary</Label>
                      <Input
                        id="we-salary"
                        type="number"
                        value={newWorkExperience.salary ?? ""}
                        onChange={(e) =>
                          setNewWorkExperience({
                            ...newWorkExperience,
                            salary: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Optional"
                        min="0"
                        className="h-11 bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="we-location">Location</Label>
                      <Input
                        id="we-location"
                        value={newWorkExperience.location}
                        onChange={(e) =>
                          setNewWorkExperience({
                            ...newWorkExperience,
                            location: e.target.value,
                          })
                        }
                        placeholder="City or region"
                        className="h-11 bg-background"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <CountrySelect
                        label="Country"
                        value={newWorkExperience.countryCode || ""}
                        onValueChange={(code) =>
                          setNewWorkExperience({
                            ...newWorkExperience,
                            countryCode: code,
                          })
                        }
                        allowEmpty
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="we-description">Job description</Label>
                    <Textarea
                      id="we-description"
                      value={newWorkExperience.description}
                      onChange={(e) =>
                        setNewWorkExperience({
                          ...newWorkExperience,
                          description: e.target.value,
                        })
                      }
                      placeholder="Responsibilities, team, or context for this role"
                      className="min-h-[88px] bg-background"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="we-skill-input">Skills used in this role</Label>
                    <div className="flex gap-2">
                      <Input
                        id="we-skill-input"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkillToNewExperience();
                          }
                        }}
                        placeholder="Type a skill and press Enter"
                        className="flex-1 bg-background"
                      />
                      <Button
                        type="button"
                        onClick={addSkillToNewExperience}
                        variant="outline"
                        size="sm"
                        className="px-3"
                        aria-label="Add skill"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {newWorkExperience.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newWorkExperience.skills.map((skill, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="gap-1 pr-1"
                          >
                            <Star className="h-3 w-3" aria-hidden />
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkillFromNewExperience(skill)}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Remove ${skill}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <ExperienceCertificatesPanel
                    batches={newWorkExperience.pendingCertBatches ?? []}
                    onAdd={() => openCertModal("draft")}
                    onRemoveBatch={removeBatchFromDraft}
                  />
                </CollapsibleContent>
              </Collapsible>

            <div className="flex justify-end mt-4 gap-2">
              {(editingExperienceId ||
                (isFormOpen && workExperiences.length > 0)) && (
                <Button
                  type="button"
                  onClick={closeWorkExperienceForm}
                  variant="outline"
                  className="border-slate-300 text-slate-600"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                onClick={addWorkExperience}
                disabled={!canSave}
                className={
                  editingExperienceId
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                }
              >
                <Pencil className="h-4 w-4 mr-2" />
                {editingExperienceId
                  ? "Update Experience"
                  : "Add Work Experience"}
              </Button>
            </div>
          </div>
          )}

          {workExperiences.length === 0 && !isFormOpen && !editingExperienceId && (
            <Button
              type="button"
              onClick={openAddForm}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add work experience
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={certModalOpen}
        onOpenChange={(open) => {
          if (!open) closeCertModal();
        }}
      >
        <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FileCheck className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <DialogTitle className="text-lg">Add experience certificate</DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  PDF or image — uploads when you save the candidate.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="we-step-cert-doc-name">Document label</Label>
              <Input
                id="we-step-cert-doc-name"
                value={certDocName}
                onChange={(e) => setCertDocName(e.target.value)}
                placeholder="e.g. Aster Hospital experience letter"
                className="h-10 bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Optional — helps identify this batch later.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Files</Label>
              <input
                ref={certFileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                multiple
                className="hidden"
                onChange={addCertFilesFromInput}
              />
              <button
                type="button"
                onClick={() => certFileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Upload className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {certFiles.length > 0 ? "Add more files" : "Choose PDF or images"}
                </span>
                <span className="text-xs text-muted-foreground">
                  JPEG, PNG, or PDF
                </span>
              </button>
              {certFiles.length > 0 && (
                <ul
                  className="rounded-lg border border-border bg-background divide-y divide-border max-h-40 overflow-y-auto"
                  aria-label="Selected files"
                >
                  {certFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      {isPdfFile(file) ? (
                        <FileText className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
                      ) : (
                        <ImageIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      )}
                      <span className="truncate flex-1 font-medium text-foreground">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeCertFileAt(idx)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-border px-5 py-4 sm:gap-2">
            <Button type="button" variant="outline" onClick={closeCertModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmCertModal}
              disabled={certFiles.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <FileCheck className="h-4 w-4 mr-2" aria-hidden />
              {certFiles.length > 0
                ? `Add ${certFiles.length} file${certFiles.length === 1 ? "" : "s"} to queue`
                : "Add to queue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkExperienceStep;
