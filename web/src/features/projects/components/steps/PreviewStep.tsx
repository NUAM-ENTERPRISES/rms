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
import { LICENSING_EXAMS } from "@/constants/candidate-constants";

interface PreviewStepProps {
  watch: UseFormWatch<ProjectFormData>;
  initialCountryData?: { code: string; name: string };
}

export const PreviewStep: React.FC<PreviewStepProps> = ({ watch, initialCountryData }) => {
  const formData = watch();
  const { data: selectedClientData } = useGetClientQuery(
    formData.clientId || "",
    { skip: !formData.clientId }
  );
  const { data: systemConfig } = useGetSystemConfigQuery("religions,states");
  const { data: qualificationsData } = useGetQualificationsQuery();
  const { getCountryName } = useCountryValidation();

  // Helper function to get country name - prefer initialCountryData if it matches
  const getDisplayCountryName = (code?: string) => {
    if (!code) return null;
    if (initialCountryData && initialCountryData.code === code) {
      return initialCountryData.name;
    }
    return getCountryName(code);
  };

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

  const getLicensingExamLabel = (value: string) => {
    if (!value) return "";
    const entry = Object.entries(LICENSING_EXAMS).find(([_, val]) => val === value);
    return entry ? entry[0].replace("_", " ") : value.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Project Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">Title</p>
              <p className="font-medium text-slate-800">{formData.title}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Client</p>
              <p className="font-medium text-slate-800">
                {formData.clientId ? getClientName(formData.clientId) : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Deadline</p>
              <p className="font-medium text-slate-800">
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
              <p className="text-sm text-slate-600">Country</p>
              <div className="font-medium text-slate-800">
                {formData.countryCode ? (
                  <FlagWithName
                    countryCode={formData.countryCode}
                    countryName={getDisplayCountryName(formData.countryCode) || ""}
                    size="sm"
                  />
                ) : (
                  "Not specified"
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600">Priority</p>
              <p className="font-medium text-slate-800">
                {formData.priority?.charAt(0).toUpperCase() +
                  formData.priority?.slice(1) || "Medium"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Project Type</p>
              <p className="font-medium text-slate-800">
                {formData.projectType === "private"
                  ? "Private Sector"
                  : "Ministry/Government"}
              </p>
            </div>
          </div>

          {/* Project-specific settings */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              Project Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-slate-600">
                  Resume {formData.resumeEditable ? "can be" : "cannot be"}{" "}
                  edited
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-slate-600">
                  Grooming:{" "}
                  {formData.groomingRequired === "formal"
                    ? "Formal Mandatory"
                    : formData.groomingRequired === "casual"
                    ? "Casual Allowed"
                    : "Not Specified"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-slate-600">
                  Contact info {formData.hideContactInfo ? "hidden" : "visible"}
                </span>
              </div>
            </div>
            
            {/* Required Screening Badge */}
            {formData.requiredScreening && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Required Screening Process Enabled
                </div>
              </div>
            )}

            {/* Licensing and Verification Summary */}
            {(formData.licensingExam || formData.dataFlow || formData.eligibility) && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Licensing & Verification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.licensingExam && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-violet-200 text-violet-700 bg-violet-50">
                        Exam: {getLicensingExamLabel(formData.licensingExam)}
                      </Badge>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {formData.dataFlow && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                        Data Flow Required
                      </Badge>
                    )}
                    {formData.eligibility && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                        Eligibility Required
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {formData.description && (
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">Description</p>
              <p className="text-slate-800">{formData.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roles Summary */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Roles Required ({formData.rolesNeeded.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.rolesNeeded.map((role, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-lg p-4 border border-slate-200"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-800">
                  {role.designation}
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Positions: {role.quantity}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
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
                    <span className="text-slate-600">Experience: </span>
                    <span className="font-medium">
                      {role.minExperience}-{role.maxExperience} years
                    </span>
                  </div>
                )}

                {/* Shift Type */}
                {role.shiftType && (
                  <div>
                    <span className="text-slate-600">Shift: </span>
                    <span className="font-medium capitalize">
                      {role.shiftType}
                    </span>
                  </div>
                )}

                {/* Salary */}
                {(role.minSalaryRange || role.maxSalaryRange) && (
                  <div>
                    <span className="text-slate-600">Salary: </span>
                    <span className="font-medium">
                      {role.minSalaryRange ? role.minSalaryRange.toLocaleString() : "N/A"} - {role.maxSalaryRange ? role.maxSalaryRange.toLocaleString() : "N/A"}
                    </span>
                  </div>
                )}

                {/* Gender & Age & Benefits */}
                {role.genderRequirement && (
                  <div>
                    <span className="text-slate-600">Gender: </span>
                    <span className="font-medium capitalize">
                      {role.genderRequirement}
                    </span>
                  </div>
                )}

                {role.ageRequirement && (
                  <div>
                    <span className="text-slate-600">Age: </span>
                    <span className="font-medium">{role.ageRequirement}</span>
                  </div>
                )}

                {(role.accommodation || role.food || role.transport || role.target) && (
                  <div>
                    <span className="text-slate-600">Benefits: </span>
                    <span className="font-medium">
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
                      <span className="text-slate-600">Education: </span>
                      <span className="text-slate-800">
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
                    <span className="text-slate-600">Certifications: </span>
                    <span className="text-slate-800">
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
                            <span className="text-slate-600 text-xs">
                              Skills:{" "}
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {role.requiredSkills.map((skill, skillIndex) => (
                                <Badge
                                  key={skillIndex}
                                  variant="outline"
                                  className="text-xs"
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
                            <span className="text-slate-600 text-xs flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-blue-600" />
                              Location:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {role.candidateStates.map((stateId) => (
                                <Badge
                                  key={stateId}
                                  variant="outline"
                                  className="text-xs"
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
                            <span className="text-slate-600 text-xs flex items-center gap-1">
                              <Heart className="h-3 w-3 text-pink-600" />
                              Religion:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {role.candidateReligions.map((religionId) => (
                                <Badge
                                  key={religionId}
                                  variant="outline"
                                  className="text-xs"
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
                    <span className="text-slate-600 flex items-center gap-1">
                      <Ruler className="h-3 w-3 text-teal-600" />
                      Physical:
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs">
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
                    <span className="text-slate-600">Notes: </span>
                    <span className="text-slate-800">{role.notes}</span>
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
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                Document Requirements ({formData.documentRequirements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {formData.documentRequirements.map((req, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-3 border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 capitalize">
                          {req.docType.replace(/_/g, " ")}
                        </p>
                        {req.description && (
                          <p className="text-sm text-slate-600">
                            {req.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.mandatory && (
                        <Badge variant="destructive" className="text-xs">
                          Mandatory
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
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
