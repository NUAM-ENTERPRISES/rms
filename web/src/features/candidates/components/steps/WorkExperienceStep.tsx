import React, { useRef } from "react";
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
import { Briefcase, Plus, Star, X, Pencil, Upload, FileText, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { JobTitleSelect, DepartmentSelect } from "@/components/molecules";

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
  pendingFiles?: File[];
  docName?: string;
};

interface WorkExperienceStepProps {
  workExperiences: WorkExperience[];
  setWorkExperiences: (experiences: WorkExperience[]) => void;
  newWorkExperience: Omit<WorkExperience, "id">;
  setNewWorkExperience: React.Dispatch<React.SetStateAction<Omit<WorkExperience, "id">>>;
  editingExperienceId: string | null;
  setEditingExperienceId: (id: string | null) => void;
  newSkill: string;
  setNewSkill: React.Dispatch<React.SetStateAction<string>>;
  onUpdateFiles?: (id: string, files: File[]) => void;
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
  onUpdateFiles,
}) => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const newExperienceFileInputRef = useRef<HTMLInputElement | null>(null);
  const addWorkExperience = () => {
    if (
      newWorkExperience.companyName &&
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
      setNewWorkExperience({
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
        pendingFiles: [],
        docName: "",
      });
      setNewSkill("");
    } else {
      toast.error(
        "Please fill in the required fields (Company, Job Title, and Start Date) to add this work experience entry."
      );
    }
  };

  const removeWorkExperience = (id: string) => {
    setWorkExperiences(workExperiences.filter((exp) => exp.id !== id));
    if (editingExperienceId === id) {
      setEditingExperienceId(null);
      setNewWorkExperience({
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
        pendingFiles: [],
        docName: "",
      });
    }
  };

  const editWorkExperience = (id: string) => {
    const experienceToEdit = workExperiences.find((exp) => exp.id === id);
    if (experienceToEdit) {
      const { id: _, ...expData } = experienceToEdit;
      setNewWorkExperience(expData);
      setEditingExperienceId(id);
      // Optional: scroll to the form
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
        {/* Work Experience List */}
        {workExperiences.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-slate-800">Added Work Experiences</h4>
            {workExperiences.map((experience) => (
              <div
                key={experience.id}
                className="p-4 border border-slate-200 rounded-lg bg-slate-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">
                      {experience.jobTitle}
                    </h4>
                    <p className="text-slate-600">
                      {experience.companyName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(
                        experience.startDate
                      ).toLocaleDateString()}{" "}
                      -{" "}
                      {experience.isCurrent
                        ? "Present"
                        : new Date(
                            experience.endDate
                          ).toLocaleDateString()}
                    </p>
                    {experience.location && (
                      <p className="text-sm text-slate-500">
                        {experience.location}
                      </p>
                    )}
                    {experience.skills &&
                      experience.skills.length > 0 && (
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

                    {/* Experience certificate upload */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-2">
                        <Paperclip className="h-3 w-3" />
                        Experience Certificates
                        <span className="text-[10px] font-normal text-muted-foreground">(PDF / Image)</span>
                      </p>
                      {(experience.pendingFiles ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(experience.pendingFiles ?? []).map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-medium"
                            >
                              <FileText className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (experience.pendingFiles ?? []).filter((_, i) => i !== idx);
                                  onUpdateFiles?.(experience.id, updated);
                                }}
                                className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        multiple
                        className="hidden"
                        ref={(el) => { fileInputRefs.current[experience.id] = el; }}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length > 0) {
                            const existing = experience.pendingFiles ?? [];
                            onUpdateFiles?.(experience.id, [...existing, ...files]);
                            e.target.value = "";
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => fileInputRefs.current[experience.id]?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Attach Files
                      </Button>

                      {/* Doc name shown after upload */}
                      <div className="mt-2">
                        <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          Doc Name (for easy identification)
                        </Label>
                        <Input
                          value={experience.docName ?? ""}
                          onChange={(e) => {
                            const updated = workExperiences.map((exp) =>
                              exp.id === experience.id
                                ? { ...exp, docName: e.target.value }
                                : exp
                            );
                            setWorkExperiences(updated);
                          }}
                          placeholder={experience.companyName || "Aster"}
                          className="h-8 mt-1 bg-white border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        editWorkExperience(experience.id)
                      }
                      className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        removeWorkExperience(experience.id)
                      }
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

        {/* Add New Work Experience Form */}
        <div id="work-experience-form" className="border border-slate-200 rounded-lg p-6 bg-slate-50 relative transition-all duration-300">
          {editingExperienceId && (
            <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-300">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                <Pencil className="h-3 w-3" />
                Editing Mode
                <button
                  type="button"
                  onClick={() => {
                    setEditingExperienceId(null);
                    setNewWorkExperience({
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
                      pendingFiles: [],
                      docName: "",
                    });
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
              {editingExperienceId ? "Edit Work Experience" : "Add New Work Experience (Optional)"}
            </h4>
            <p className="text-sm text-slate-500 italic">
              {editingExperienceId ? "Modify your work experience details below" : "You can skip this step and add experience later"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department */}
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

            {/* Job Title */}
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

            {/* Company Name */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Company Name *
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

            {/* Start Date */}
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

            {/* End Date */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                End Date
              </Label>
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

            {/* Current Position */}
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

            {/* Salary */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Salary
              </Label>
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

            {/* Location */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Location
              </Label>
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

          {/* Description */}
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

          {/* Skills */}
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

            {/* Skills List */}
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
                      onClick={() =>
                        removeSkillFromNewExperience(skill)
                      }
                      className="ml-1 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        
          {/* Doc Name at end (after upload) */}
          <div className="mt-4 space-y-2">
            <Label className="text-slate-700 font-medium">
              Experience Certificate Doc Name
            </Label>
            <Input
              value={newWorkExperience.docName ?? ""}
              onChange={(e) =>
                setNewWorkExperience({
                  ...newWorkExperience,
                  docName: e.target.value,
                })
              }
              placeholder={newWorkExperience.companyName || "Aster"}
              className="h-11 bg-white border-slate-200"
            />
          </div>
 {/* Experience certificate upload (for the form entry) */}
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-2">
              <Paperclip className="h-3 w-3" />
              Experience Certificates
              <span className="text-[10px] font-normal text-muted-foreground">(PDF / Image)</span>
            </p>

            {(newWorkExperience.pendingFiles ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(newWorkExperience.pendingFiles ?? []).map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-medium"
                  >
                    <FileText className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate max-w-[160px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (newWorkExperience.pendingFiles ?? []).filter(
                          (_, i) => i !== idx
                        );
                        setNewWorkExperience({
                          ...newWorkExperience,
                          pendingFiles: updated,
                        });
                      }}
                      className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              multiple
              className="hidden"
              ref={(el) => {
                newExperienceFileInputRef.current = el;
              }}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) {
                  const existing = newWorkExperience.pendingFiles ?? [];
                  setNewWorkExperience({
                    ...newWorkExperience,
                    pendingFiles: [...existing, ...files],
                  });
                  e.target.value = "";
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
              onClick={() => newExperienceFileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3 mr-1" />
              Attach Files
            </Button>
          </div>

          {/* Add/Update Button */}
          <div className="flex justify-end mt-4 gap-2">
            {editingExperienceId && (
              <Button
                type="button"
                onClick={() => {
                  setEditingExperienceId(null);
                  setNewWorkExperience({
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
                    pendingFiles: [],
                    docName: "",
                  });
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
              className={editingExperienceId 
                ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800" 
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {editingExperienceId ? "Update Experience" : "Add Work Experience"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkExperienceStep;