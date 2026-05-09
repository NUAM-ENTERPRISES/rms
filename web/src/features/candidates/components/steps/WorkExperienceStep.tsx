import React, { useState, useRef, type ChangeEvent } from "react";
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
import {
  Briefcase,
  Plus,
  Star,
  X,
  Pencil,
  Upload,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { JobTitleSelect, DepartmentSelect } from "@/components/molecules";

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
    skills: [],
    achievements: "",
    pendingCertBatches: [],
  });

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
    } else {
      toast.error(
        "Please fill in the required fields (Job Title and Start Date) to add this work experience entry."
      );
    }
  };

  const removeWorkExperience = (id: string) => {
    setWorkExperiences(workExperiences.filter((exp) => exp.id !== id));
    if (editingExperienceId === id) {
      setEditingExperienceId(null);
      setNewWorkExperience(emptyWorkExperience());
    }
  };

  const editWorkExperience = (id: string) => {
    const experienceToEdit = workExperiences.find((exp) => exp.id === id);
    if (experienceToEdit) {
      const { id: _, ...expData } = experienceToEdit;
      setNewWorkExperience(expData);
      setEditingExperienceId(id);
      const formElement = document.getElementById("work-experience-form");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth" });
      }
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
              <h4 className="text-lg font-semibold text-slate-800">
                Added Work Experiences
              </h4>
              {workExperiences.map((experience) => (
                <div
                  key={experience.id}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900">
                        {experience.jobTitle}
                      </h4>
                      <p className="text-slate-600">{experience.companyName}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(experience.startDate).toLocaleDateString()} -{" "}
                        {experience.isCurrent
                          ? "Present"
                          : new Date(experience.endDate).toLocaleDateString()}
                      </p>
                      {experience.location && (
                        <p className="text-sm text-slate-500">
                          {experience.location}
                        </p>
                      )}
                      {experience.skills && experience.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {experience.skills.map(
                            (skill: string, index: number) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200"
                              >
                                <Star className="h-3 w-3" />
                                {skill}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              Experience certificates
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              PDF or image. Queued files upload when you create
                              the candidate.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs shrink-0"
                            onClick={() => openCertModal(experience.id)}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Add document
                          </Button>
                        </div>
                        {(experience.pendingCertBatches ?? []).length > 0 && (
                          <ul className="space-y-1.5">
                            {(experience.pendingCertBatches ?? []).map(
                              (batch) => (
                                <li
                                  key={batch.id}
                                  className="flex items-center justify-between gap-2 rounded-md border border-blue-100 bg-blue-50/80 px-2.5 py-1.5 text-[11px] text-blue-900"
                                >
                                  <span className="min-w-0 truncate">
                                    <span className="font-medium">
                                      {batch.docName || "Experience letter"}
                                    </span>
                                    <span className="text-blue-700/80">
                                      {" "}
                                      · {batch.files.length} file
                                      {batch.files.length === 1 ? "" : "s"}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeBatchFromExperience(
                                        experience.id,
                                        batch.id
                                      )
                                    }
                                    className="shrink-0 text-blue-500 hover:text-red-600 transition-colors"
                                    aria-label="Remove pending upload"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </li>
                              )
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => editWorkExperience(experience.id)}
                        className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeWorkExperience(experience.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            id="work-experience-form"
            className="border border-slate-200 rounded-lg p-6 bg-slate-50 relative transition-all duration-300"
          >
            {editingExperienceId && (
              <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-300">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                  <Pencil className="h-3 w-3" />
                  Editing Mode
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExperienceId(null);
                      setNewWorkExperience(emptyWorkExperience());
                    }}
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

            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label className="text-sm font-semibold text-slate-800">
                    Experience certificates
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    PDF or image. Add one or more groups before saving this entry.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => openCertModal("draft")}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add document
                </Button>
              </div>
              {(newWorkExperience.pendingCertBatches ?? []).length > 0 && (
                <ul className="space-y-1.5">
                  {(newWorkExperience.pendingCertBatches ?? []).map((batch) => (
                    <li
                      key={batch.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-blue-900"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium">
                          {batch.docName || "Experience letter"}
                        </span>
                        <span className="text-blue-700/80">
                          {" "}
                          · {batch.files.length} file
                          {batch.files.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBatchFromDraft(batch.id)}
                        className="shrink-0 text-blue-500 hover:text-red-600 transition-colors"
                        aria-label="Remove pending upload"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end mt-4 gap-2">
              {editingExperienceId && (
                <Button
                  type="button"
                  onClick={() => {
                    setEditingExperienceId(null);
                    setNewWorkExperience(emptyWorkExperience());
                  }}
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
        </CardContent>
      </Card>

      <Dialog
        open={certModalOpen}
        onOpenChange={(open) => {
          if (!open) closeCertModal();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add experience certificate</DialogTitle>
            <DialogDescription>
              Optional label for this group of files. Upload one or more PDFs or
              images.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="we-step-cert-doc-name">Document name</Label>
              <Input
                id="we-step-cert-doc-name"
                value={certDocName}
                onChange={(e) => setCertDocName(e.target.value)}
                placeholder="e.g. Aster Hospital"
              />
              <p className="text-[11px] text-muted-foreground">
                Shown as a prefix when viewing the certificate after upload.
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
              {certFiles.length > 0 && (
                <ul className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50/80 p-2">
                  {certFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs text-slate-800 max-w-full border border-slate-100"
                    >
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeCertFileAt(idx)}
                        className="text-slate-500 hover:text-red-600"
                        aria-label="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => certFileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {certFiles.length > 0 ? "Add more files" : "Choose files"}
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeCertModal}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmCertModal}>
              Add to list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkExperienceStep;
