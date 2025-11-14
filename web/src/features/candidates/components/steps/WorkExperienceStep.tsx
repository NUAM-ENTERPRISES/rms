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

type WorkExperience = {
  id: string;
  companyName: string;
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
        "Please fill in required fields (Company, Job Title, Start Date)"
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
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        removeWorkExperience(experience.id)
                      }
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Work Experience Form */}
        <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">
            Add New Work Experience
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Job Title */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Job Title *
              </Label>
              <Input
                value={newWorkExperience.jobTitle}
                onChange={(e) =>
                  setNewWorkExperience({
                    ...newWorkExperience,
                    jobTitle: e.target.value,
                  })
                }
                placeholder="Staff Nurse"
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

          {/* Add Button */}
          <div className="flex justify-end mt-4">
            <Button
              type="button"
              onClick={addWorkExperience}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
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