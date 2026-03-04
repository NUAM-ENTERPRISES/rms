import React from "react";
import { UseFormWatch } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Building2,
  Target,
  User,
  FileText,
  MapPin,
  Heart,
  Ruler,
  Weight,
} from "lucide-react";
import { FlagWithName } from "@/shared";
import { useCountryValidation } from "@/shared/hooks/useCountriesLookup";
import { useGetSystemConfigQuery } from "@/shared/hooks/useSystemConfig";
import { useGetClientQuery } from "@/features/clients";
import { useGetQualificationsQuery } from "@/shared/hooks/useQualificationsLookup";
import { ProjectFormData } from "../../schemas/project-schemas";

interface PreviewStepProps {
  watch: UseFormWatch<ProjectFormData>;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({ watch }) => {
  const formData = watch();
  const { data: selectedClientData } = useGetClientQuery(
    formData.clientId || "",
    { skip: !formData.clientId }
  );
  const { data: systemConfig } = useGetSystemConfigQuery("religions,states");
  const { data: qualificationsData } = useGetQualificationsQuery();
  const { getCountryName } = useCountryValidation();

  // Helper function to get qualification name by ID
  const getQualificationName = (qualificationId: string) => {
    const qualification = qualificationsData?.data?.qualifications?.find(
      (q) => q.id === qualificationId
    );
    return qualification?.name || `Qualification ${qualificationId}`;
  };

  const getClientName = (clientId: string) => {
    return selectedClientData?.data?.name || "N/A";
  };

  const getStateName = (stateId: string) => {
    const state = systemConfig?.data?.constants?.indianStates?.find(
      (s) => s.id === stateId
    );
    return state?.name || stateId;
  };

  const getReligionName = (religionId: string) => {
    const religion = systemConfig?.data?.constants?.religions?.find(
      (r) => r.id === religionId
    );
    return religion?.name || religionId;
  };

  return (
   <div className="space-y-6">
  {/* Project Overview */}
  <Card className="border-0 shadow-lg bg-white/80 dark:bg-black backdrop-blur-sm dark:backdrop-blur-none">
    <CardHeader className="border-b border-slate-200 dark:border-slate-800">
      <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        Project Overview
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 bg-white dark:bg-black">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Title</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{formData.title}</p>
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Client</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">
            {formData.clientId ? getClientName(formData.clientId) : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Deadline</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">
            {formData.deadline instanceof Date
              ? formData.deadline.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : new Date(formData.deadline).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Country</p>
          <div className="font-medium text-slate-800 dark:text-slate-100">
            {formData.countryCode ? (
              <FlagWithName
                countryCode={formData.countryCode}
                countryName={getCountryName(formData.countryCode) || ""}
                size="sm"
              />
            ) : (
              "Not specified"
            )}
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Priority</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">
            {formData.priority?.charAt(0).toUpperCase() +
              formData.priority?.slice(1) || "Medium"}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Project Type</p>
          <p className="font-medium text-slate-800 dark:text-slate-100">
            {formData.projectType === "private"
              ? "Private Sector"
              : "Ministry/Government"}
          </p>
        </div>
      </div>

      {/* Project-specific settings */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Project Settings
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Resume {formData.resumeEditable ? "can be" : "cannot be"}{" "}
              edited
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Grooming:{" "}
              {formData.groomingRequired === "formal"
                ? "Formal Mandatory"
                : formData.groomingRequired === "casual"
                ? "Casual Allowed"
                : "Not Specified"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Contact info {formData.hideContactInfo ? "hidden" : "visible"}
            </span>
          </div>
        </div>

        {/* Required Screening Badge */}
        {formData.requiredScreening && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium border border-blue-200 dark:border-blue-800/50">
              <CheckCircle className="h-4 w-4" />
              Required Screening Process Enabled
            </div>
          </div>
        )}
      </div>

      {formData.description && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">Description</p>
          <p className="text-slate-800 dark:text-slate-200">{formData.description}</p>
        </div>
      )}
    </CardContent>
  </Card>

  {/* Roles Summary */}
  <Card className="border-0 shadow-lg bg-white/80 dark:bg-black backdrop-blur-sm dark:backdrop-blur-none">
    <CardHeader className="border-b border-slate-200 dark:border-slate-800">
      <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        Roles Required ({formData.rolesNeeded.length})
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 bg-white dark:bg-black">
      {formData.rolesNeeded.map((role, index) => (
        <div
          key={index}
          className="bg-slate-50 dark:bg-slate-900/70 rounded-lg p-4 border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-800 dark:text-slate-100">
              {role.designation}
            </h4>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Positions: {role.quantity}
              </Badge>
              <Badge 
                variant="outline" 
                className="text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {role.visaType === "contract" && role.contractDurationYears
                  ? `Contract (${role.contractDurationYears} years)`
                  : role.visaType === "contract"
                  ? "Contract"
                  : "Permanent"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Experience */}
            {role.minExperience && role.maxExperience && (
              <div>
                <span className="text-slate-600 dark:text-slate-400">Experience: </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {role.minExperience}-{role.maxExperience} years
                </span>
              </div>
            )}

            {/* Shift Type */}
            {role.shiftType && (
              <div>
                <span className="text-slate-600 dark:text-slate-400">Shift: </span>
                <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                  {role.shiftType}
                </span>
              </div>
            )}

            {/* Gender & Age & Benefits */}
            {role.genderRequirement && (
              <div>
                <span className="text-slate-600 dark:text-slate-400">Gender: </span>
                <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                  {role.genderRequirement}
                </span>
              </div>
            )}

            {role.ageRequirement && (
              <div>
                <span className="text-slate-600 dark:text-slate-400">Age: </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{role.ageRequirement}</span>
              </div>
            )}

            {(role.accommodation || role.food || role.transport || role.target) && (
              <div>
                <span className="text-slate-600 dark:text-slate-400">Benefits: </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {role.accommodation && "Accommodation"}
                  {role.accommodation && role.food && ", "}
                  {role.food && "Food"}
                  {(role.accommodation || role.food) && role.transport && ", "}
                  {role.transport && "Transport"}
                  {role.target ? ` • Target: ${role.target}` : ""}
                </span>
              </div>
            )}

            {/* Education Requirements */}
            {role.educationRequirementsList &&
              role.educationRequirementsList.length > 0 && (
                <div className="md:col-span-2">
                  <span className="text-slate-600 dark:text-slate-400">Education: </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {role.educationRequirementsList
                      .map((req) =>
                        getQualificationName(req.qualificationId)
                      )
                      .join(", ")}
                  </span>
                </div>
              )}

            {/* Certifications */}
            {role.requiredCertifications && (
              <div className="md:col-span-2">
                <span className="text-slate-600 dark:text-slate-400">Certifications: </span>
                <span className="text-slate-800 dark:text-slate-200">
                  {role.requiredCertifications}
                </span>
              </div>
            )}

            {/* Skills, Location, and Religion in same row */}
            {(role.requiredSkills?.length > 0 ||
              role.candidateStates?.length > 0 ||
              role.candidateReligions?.length > 0) && (
              <div className="md:col-span-2">
                <div className="flex flex-wrap gap-4">
                  {/* Required Skills */}
                  {role.requiredSkills &&
                    role.requiredSkills.length > 0 && (
                      <div className="flex-1 min-w-0">
                        <span className="text-slate-600 dark:text-slate-400 text-xs">
                          Skills:{" "}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {role.requiredSkills.map((skill, skillIndex) => (
                            <Badge
                              key={skillIndex}
                              variant="outline"
                              className="text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Candidate States */}
                  {role.candidateStates &&
                    role.candidateStates.length > 0 && (
                      <div className="flex-1 min-w-0">
                        <span className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          Location:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {role.candidateStates.map((stateId) => (
                            <Badge
                              key={stateId}
                              variant="outline"
                              className="text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              {getStateName(stateId)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Candidate Religions */}
                  {role.candidateReligions &&
                    role.candidateReligions.length > 0 && (
                      <div className="flex-1 min-w-0">
                        <span className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1">
                          <Heart className="h-3 w-3 text-pink-600 dark:text-pink-400" />
                          Religion:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {role.candidateReligions.map((religionId) => (
                            <Badge
                              key={religionId}
                              variant="outline"
                              className="text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              {getReligionName(religionId)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Height and Weight */}
            {(role.minHeight ||
              role.maxHeight ||
              role.minWeight ||
              role.maxWeight) && (
              <div className="md:col-span-2">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Ruler className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                  Physical:
                </span>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-800 dark:text-slate-200">
                  {role.minHeight && role.maxHeight && (
                    <span>
                      Height: {role.minHeight}-{role.maxHeight}cm
                    </span>
                  )}
                  {role.minWeight && role.maxWeight && (
                    <span>
                      Weight: {role.minWeight}-{role.maxWeight}kg
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {role.notes && (
              <div className="md:col-span-2">
                <span className="text-slate-600 dark:text-slate-400">Notes: </span>
                <span className="text-slate-800 dark:text-slate-200">{role.notes}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </CardContent>
  </Card>

  {/* Document Requirements Summary */}
  {formData.documentRequirements &&
    formData.documentRequirements.length > 0 && (
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-black backdrop-blur-sm dark:backdrop-blur-none">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            Document Requirements ({formData.documentRequirements.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-white dark:bg-black">
          <div className="space-y-2">
            {formData.documentRequirements.map((req, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-950/50 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100 capitalize">
                      {req.docType.replace(/_/g, " ")}
                    </p>
                    {req.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {req.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {req.mandatory && (
                    <Badge 
                      variant="destructive" 
                      className="text-xs bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50"
                    >
                      Mandatory
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className="text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Required
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
</div>
  );
};

export default PreviewStep;
