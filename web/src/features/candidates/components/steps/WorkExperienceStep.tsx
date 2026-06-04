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
};

function ExperienceCertificatesPanel({
  batches,
  onAdd,
  onRemoveBatch,
  className,
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
          : "border-slate-200 bg-slate-50/50",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 border-b border-slate-200/80 bg-white/80">
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
                className="text-sm font-semibold text-slate-800 leading-tight"
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
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              PDF or image · uploads when you save the candidate
            </p>
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
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white/80 px-3 py-3 text-sm text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            <Upload className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
            <span>No files queued — tap to attach certificates</span>
          </button>
        ) : (
          <ul className="space-y-2" aria-label="Queued certificate uploads">
            {batches.map((batch) => (
              <li
                key={batch.id}
                className="rounded-lg border border-indigo-100 bg-white overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-indigo-50 bg-indigo-50/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                    <span className="text-sm font-medium text-slate-800 truncate">
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
                    className="h-7 w-7 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                    onClick={() => onRemoveBatch(batch.id)}
                    aria-label={`Remove ${batch.docName || "certificate group"}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ul className="divide-y divide-slate-100">
                  {batch.files.map((file, fileIdx) => (
                    <li
                      key={`${batch.id}-${file.name}-${fileIdx}`}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-slate-600"
                    >
                      {isPdfFile(file) ? (
                        <FileText className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
                      ) : (
                        <ImageIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      )}
                      <span className="truncate flex-1 font-medium text-slate-700">
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
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certDocName, setCertDocName] = useState("");
  const [certFiles, setCertFiles] = useState<File[]>([]);
  const [certModalTarget, setCertModalTarget] = useState<
    "draft" | string | null
  >(null);

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
    setIsFormOpen(true);
    scrollToWorkExperienceForm();
  };

  const closeWorkExperienceForm = () => {
    setIsFormOpen(false);
    setEditingExperienceId(null);
    setNewWorkExperience(emptyWorkExperience());
    setNewSkill("");
  };

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

  const addWorkExperience = () => {
    if (
      newWorkExperience.jobTitle &&
      newWorkExperience.startDate
    ) {
      if (editingExperienceId) {
        setWorkExperiences(
          workExperiences.map((exp) =>
            exp.id === editingExperienceId
              ? { ...newWorkExperience, id: editingExperienceId }
              : exp
          )
        );
        setEditingExperienceId(null);
        toast.success("Work experience updated successfully.");
      } else {
        const newId = `work-exp-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        setWorkExperiences([
          ...workExperiences,
          { ...newWorkExperience, id: newId },
        ]);
        toast.success("Work experience added successfully.");
      }
      setNewWorkExperience(emptyWorkExperience());
      setNewSkill("");
      setIsFormOpen(false);
    } else {
      toast.error(
        "Please fill in the required fields (Job Title and Start Date) to add this work experience entry."
      );
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

  return (
    <>
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Work Experience
          </CardTitle>
          <CardDescription>
            Add work experience entries for the candidate (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {workExperiences.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-lg font-semibold text-slate-800">
                  Added work experiences
                </h4>
                <Badge
                  variant="secondary"
                  className="bg-slate-100 text-slate-600 font-medium"
                >
                  {workExperiences.length}{" "}
                  {workExperiences.length === 1 ? "entry" : "entries"}
                </Badge>
              </div>
              <ul className="space-y-3" aria-label="Saved work experiences">
                {workExperiences.map((experience) => {
                  const certCount = (experience.pendingCertBatches ?? []).reduce(
                    (sum, b) => sum + b.files.length,
                    0
                  );

                  return (
                  <li
                    key={experience.id}
                    className="rounded-xl border border-blue-100/80 bg-white shadow-sm overflow-hidden ring-1 ring-blue-50 hover:shadow-md hover:border-blue-200/80 transition-all"
                  >
                    <div className="relative flex flex-col sm:flex-row sm:items-start gap-3 p-4 border-b border-blue-100/60 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/40">
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full"
                        aria-hidden
                      />
                      <span
                        className="relative ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200/40"
                        aria-hidden
                      >
                        <Briefcase className="h-5 w-5" />
                      </span>
                      <div className="relative flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1.5">
                            <h4 className="text-base font-bold text-slate-900 leading-snug truncate">
                              {experience.jobTitle}
                            </h4>
                            {experience.companyName ? (
                              <p className="inline-flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white/90 px-2.5 py-1 text-sm font-medium text-slate-700 shadow-sm">
                                <Building2
                                  className="h-4 w-4 shrink-0 text-blue-600"
                                  aria-hidden
                                />
                                <span className="truncate max-w-[240px]">
                                  {experience.companyName}
                                </span>
                              </p>
                            ) : null}
                          </div>
                          {certCount > 0 && (
                            <Badge
                              variant="outline"
                              className="shrink-0 gap-1 border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold"
                            >
                              <FileCheck className="h-3.5 w-3.5" aria-hidden />
                              {certCount} cert{certCount === 1 ? "" : "s"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                            <Calendar className="h-3.5 w-3.5" aria-hidden />
                            {formatExperiencePeriod(
                              experience.startDate,
                              experience.endDate,
                              experience.isCurrent
                            )}
                          </span>
                          {(experience.location || experience.countryCode) && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                              <MapPin
                                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                                aria-hidden
                              />
                              {[experience.location, experience.countryCode]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => editWorkExperience(experience.id)}
                          className="h-9 border-blue-200 bg-white text-blue-700 font-semibold shadow-sm hover:bg-blue-50 hover:border-blue-300"
                          aria-label={`Edit ${experience.jobTitle}`}
                        >
                          <Pencil className="h-4 w-4 mr-1.5 text-blue-600" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeWorkExperience(experience.id)}
                          className="h-9 border-red-200 bg-white text-red-600 font-semibold shadow-sm hover:bg-red-50 hover:border-red-300"
                          aria-label={`Remove ${experience.jobTitle}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1.5 text-red-500" aria-hidden />
                          Remove
                        </Button>
                      </div>
                    </div>

                    {experience.skills && experience.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-slate-100 bg-slate-50/40">
                        {experience.skills.map((skill: string, index: number) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="gap-1 bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium"
                          >
                            <Star className="h-3 w-3" aria-hidden />
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="p-4">
                      <ExperienceCertificatesPanel
                        batches={experience.pendingCertBatches ?? []}
                        onAdd={() => openCertModal(experience.id)}
                        onRemoveBatch={(batchId) =>
                          removeBatchFromExperience(experience.id, batchId)
                        }
                      />
                    </div>
                  </li>
                  );
                })}
              </ul>

              {!isFormOpen && !editingExperienceId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={openAddForm}
                  className="w-full h-11 gap-2 border-dashed border-blue-300 bg-blue-50/50 text-blue-700 font-semibold hover:bg-blue-50 hover:border-blue-400"
                  aria-label="Add another work experience"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add more work experience
                </Button>
              )}
            </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
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
              </div>

              <div className="space-y-2">
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
                  label="Job Title"
                  placeholder="e.g., Registered Nurse"
                  required
                  allowEmpty={false}
                  departmentId={newWorkExperience.departmentId}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  Organization Name
                </Label>
                <Input
                  value={newWorkExperience.companyName}
                  onChange={(e) =>
                    setNewWorkExperience({
                      ...newWorkExperience,
                      companyName: e.target.value,
                    })
                  }
                  placeholder="ABC Hospital"
                  className="h-11 bg-white border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  Start Date *
                </Label>
                <Input
                  type="date"
                  value={newWorkExperience.startDate}
                  onChange={(e) =>
                    setNewWorkExperience({
                      ...newWorkExperience,
                      startDate: e.target.value,
                    })
                  }
                  className="h-11 bg-white border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">End Date</Label>
                <Input
                  type="date"
                  value={newWorkExperience.endDate}
                  onChange={(e) =>
                    setNewWorkExperience({
                      ...newWorkExperience,
                      endDate: e.target.value,
                    })
                  }
                  disabled={newWorkExperience.isCurrent}
                  className="h-11 bg-white border-slate-200"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={newWorkExperience.isCurrent}
                  onChange={(e) =>
                    setNewWorkExperience({
                      ...newWorkExperience,
                      isCurrent: e.target.checked,
                    })
                  }
                  className="border-slate-300"
                />
                <Label
                  htmlFor="isCurrent"
                  className="text-slate-700 font-medium cursor-pointer"
                >
                  This is my current position
                </Label>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Salary</Label>
                <Input
                  type="number"
                  value={newWorkExperience.salary || ""}
                  onChange={(e) =>
                    setNewWorkExperience({
                      ...newWorkExperience,
                      salary: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="50000"
                  min="0"
                  className="h-11 bg-white border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Location</Label>
                <Input
                  value={newWorkExperience.location}
                  onChange={(e) =>
                    setNewWorkExperience({
                      ...newWorkExperience,
                      location: e.target.value,
                    })
                  }
                  placeholder="New York, NY"
                  className="h-11 bg-white border-slate-200"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <CountrySelect
                  label="Country (optional)"
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

            <div className="space-y-2 mt-4">
              <Label className="text-slate-700 font-medium">
                Job Description
              </Label>
              <textarea
                value={newWorkExperience.description}
                onChange={(e) =>
                  setNewWorkExperience({
                    ...newWorkExperience,
                    description: e.target.value,
                  })
                }
                placeholder="Describe your responsibilities and achievements..."
                className="w-full min-h-[80px] p-3 border border-slate-200 rounded-md bg-white"
              />
            </div>

            <div className="space-y-3 mt-4">
              <Label className="text-slate-700 font-medium">
                Skills Gained/Used
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkillToNewExperience();
                    }
                  }}
                  placeholder="Add a skill..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={addSkillToNewExperience}
                  variant="outline"
                  size="sm"
                  className="px-3"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {newWorkExperience.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newWorkExperience.skills.map((skill, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 text-sm"
                    >
                      <Star className="h-3 w-3" />
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkillFromNewExperience(skill)}
                        className="ml-1 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200">
              <ExperienceCertificatesPanel
                batches={newWorkExperience.pendingCertBatches ?? []}
                onAdd={() => openCertModal("draft")}
                onRemoveBatch={removeBatchFromDraft}
              />
            </div>

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
        </CardContent>
      </Card>

      <Dialog
        open={certModalOpen}
        onOpenChange={(open) => {
          if (!open) closeCertModal();
        }}
      >
        <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
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
              <Label htmlFor="we-step-cert-doc-name" className="text-slate-700">
                Document label
              </Label>
              <Input
                id="we-step-cert-doc-name"
                value={certDocName}
                onChange={(e) => setCertDocName(e.target.value)}
                placeholder="e.g. Aster Hospital experience letter"
                className="h-10 bg-white border-slate-200"
              />
              <p className="text-xs text-muted-foreground">
                Optional — helps identify this batch later.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Files</Label>
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
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-4 py-5 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Upload className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-slate-700">
                  {certFiles.length > 0 ? "Add more files" : "Choose PDF or images"}
                </span>
                <span className="text-xs text-muted-foreground">
                  JPEG, PNG, or PDF
                </span>
              </button>
              {certFiles.length > 0 && (
                <ul
                  className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 max-h-40 overflow-y-auto"
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
                      <span className="truncate flex-1 font-medium text-slate-800">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
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
          <DialogFooter className="gap-2 border-t border-slate-100 px-5 py-4 sm:gap-2">
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
