import React from "react";
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
import { Briefcase, Plus, Star, X } from "lucide-react";
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
};

interface WorkExperienceStepProps {
  workExperiences: WorkExperience[];
  setWorkExperiences: (experiences: WorkExperience[]) => void;
  newWorkExperience: Omit<WorkExperience, "id">;
  setNewWorkExperience: React.Dispatch<React.SetStateAction<Omit<WorkExperience, "id">>>;
  newSkill: string;
  setNewSkill: React.Dispatch<React.SetStateAction<string>>;
}

export const WorkExperienceStep: React.FC<WorkExperienceStepProps> = ({
  workExperiences,
  setWorkExperiences,
  newWorkExperience,
  setNewWorkExperience,
  newSkill,
  setNewSkill,
}) => {
  const addWorkExperience = () => {
    if (
      newWorkExperience.companyName &&
      newWorkExperience.jobTitle &&
      newWorkExperience.startDate
    ) {
      const newId = `work-exp-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      setWorkExperiences([
        ...workExperiences,
        { ...newWorkExperience, id: newId },
      ]);
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
    <Card className="border-0 shadow-lg bg-white/80 dark:bg-black backdrop-blur-sm dark:backdrop-blur-none">
      <CardHeader className="border-b border-slate-200 dark:border-slate-800">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800 dark:text-slate-100">
          <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Work Experience
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Add work experience entries for the candidate (optional)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6 bg-white dark:bg-black">
        {/* Work Experience List */}
        {workExperiences.length > 0 && (
          <div className="space-y-5">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Added Work Experiences
            </h4>
            {workExperiences.map((experience) => (
              <div
                key={experience.id}
                className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/70"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                      {experience.jobTitle}
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">
                      {experience.companyName}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(experience.startDate).toLocaleDateString()}{" "}
                      -{" "}
                      {experience.isCurrent
                        ? "Present"
                        : new Date(experience.endDate).toLocaleDateString()}
                    </p>
                    {experience.location && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {experience.location}
                      </p>
                    )}
                    {experience.skills && experience.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {experience.skills.map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800/50 text-sm"
                          >
                            <Star className="h-3.5 w-3.5" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeWorkExperience(experience.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-800/50"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Work Experience Form */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-slate-50 dark:bg-slate-900/70">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Add New Work Experience (Optional)
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              You can skip this step and add experience later
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              <Label className="text-slate-700 dark:text-slate-300 font-medium">
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
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 font-medium">
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
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500"
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 font-medium">
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
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500"
              />
            </div>

            {/* Current Position */}
            <div className="flex items-center space-x-3 py-2">
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
                className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-900"
              />
              <Label
                htmlFor="isCurrent"
                className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
              >
                This is my current position
              </Label>
            </div>

            {/* Salary */}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 font-medium">
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
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 font-medium">
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
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 mt-6">
            <Label className="text-slate-700 dark:text-slate-300 font-medium">
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
              className="w-full min-h-[120px] p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500 resize-y"
            />
          </div>

          {/* Skills */}
          <div className="space-y-4 mt-6">
            <Label className="text-slate-700 dark:text-slate-300 font-medium">
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
                className="flex-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-500"
              />
              <Button
                type="button"
                onClick={addSkillToNewExperience}
                variant="outline"
                size="sm"
                className="px-4 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800/50 text-sm"
                  >
                    <Star className="h-3.5 w-3.5" />
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkillFromNewExperience(skill)}
                      className="ml-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full p-1 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Button */}
          <div className="flex justify-end mt-8">
            <Button
              type="button"
              onClick={addWorkExperience}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Work Experience
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkExperienceStep;