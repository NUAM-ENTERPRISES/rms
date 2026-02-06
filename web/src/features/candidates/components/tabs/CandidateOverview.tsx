import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  GraduationCap,
  Plus,
  Briefcase,
  Edit,
  MapPin,
  CheckCircle2,
  Trophy,
  Sparkles,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getAge } from "@/utils/getAge";
import { Candidate, CandidateQualification, WorkExperience } from "../../api";
import { CandidateResumeList } from "@/components/molecules";

interface CandidateOverviewProps {
  candidate: Candidate;
  canWriteCandidates: boolean;
  openAddModal: (type: "qualification" | "workExperience") => void;
  openEditModal: (
    type: "qualification" | "workExperience",
    data: CandidateQualification | WorkExperience
  ) => void;
}

export const CandidateOverview: React.FC<CandidateOverviewProps> = ({
  candidate,
  canWriteCandidates,
  openAddModal,
  openEditModal,
}) => {
  const age = getAge(candidate.dateOfBirth);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Candidate Information */}
        <Card className="xl:col-span-2 border border-gray-300 rounded-lg shadow-lg bg-white bg-opacity-90 backdrop-blur-md transition-shadow hover:shadow-2xl">
          <CardHeader className="border-b border-gray-300 px-6 py-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900 select-none">
              <User className="h-6 w-6 text-blue-600" />
              Candidate Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Email
                  </label>
                  <p className="text-sm flex items-center gap-2 mt-1">
                    <Mail className="h-3 w-3 text-slate-400" />
                    {candidate.email || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Phone
                  </label>
                  <p className="text-sm flex items-center gap-2 mt-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {candidate.mobileNumber || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Date of Birth
                  </label>
                  <p className="text-sm flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {formatDate(candidate.dateOfBirth)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Age
                  </label>
                  <p className="text-sm flex items-center gap-2 mt-1">
                    <User className="h-3 w-3 text-slate-400" />
                    {age !== null ? `${age} years` : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Gender
                  </label>
                  <p className="text-sm flex items-center gap-2 mt-1 lowercase capitalize">
                    <User className="h-3 w-3 text-slate-400" />
                    {candidate.gender || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Experience
                  </label>
                  <p className="text-sm flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {(() => {
                      if (
                        candidate.workExperiences &&
                        candidate.workExperiences.length > 0
                      ) {
                        let totalMonths = 0;
                        candidate.workExperiences.forEach((exp) => {
                          const startDate = new Date(exp.startDate);
                          const endDate = exp.isCurrent
                            ? new Date()
                            : new Date(exp.endDate || new Date());
                          const months =
                            (endDate.getFullYear() -
                              startDate.getFullYear()) *
                              12 +
                            (endDate.getMonth() - startDate.getMonth());
                          totalMonths += months;
                        });
                        const years = Math.floor(totalMonths / 12);
                        const months = totalMonths % 12;
                        return years > 0
                          ? `${years} years ${
                              months > 0 ? `${months} months` : ""
                            }`
                          : `${months} months`;
                      }
                      return (
                        candidate.totalExperience ||
                        candidate.experience ||
                        0
                      );
                    })()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Expected Salary
                  </label>
                  <p className="text-sm flex items-center gap-2 mt-1">
                    <DollarSign className="h-3 w-3 text-slate-400" />
                    {candidate.expectedSalary
                      ? formatCurrency(candidate.expectedSalary)
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Source
                  </label>
                  <p className="text-sm mt-1 capitalize">
                    {candidate.source || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Created
                  </label>
                  <p className="text-sm mt-1">
                    {formatDate(candidate.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Last Updated
                  </label>
                  <p className="text-sm mt-1">
                    {formatDate(candidate.updatedAt)}
                  </p>
                </div>

                {/* Referral Fields Integrated */}
                {candidate.source === "referral" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Referral Company
                      </label>
                      <p className="text-sm mt-1">
                        {candidate.referralCompanyName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Referral Email
                      </label>
                      <p className="text-sm flex items-center gap-2 mt-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {candidate.referralEmail || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Referral Phone
                      </label>
                      <p className="text-sm flex items-center gap-2 mt-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {candidate.referralCountryCode}
                        {candidate.referralPhone || "N/A"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Referral Description Integrated */}
              {candidate.source === "referral" &&
                candidate.referralDescription && (
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                      Referral Description
                    </label>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {candidate.referralDescription}
                    </p>
                  </div>
                )}

              {/* Skills Section */}
              {candidate.skills && candidate.skills.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                    Skills
                  </label>
                  <div className="flex wrap gap-1">
                    {candidate.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs px-2 py-1"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card
          className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden 
               ring-1 ring-gray-200/50 hover:ring-blue-400/30 hover:shadow-2xl 
               transition-all duration-500"
        >
          <CardHeader className="border-b border-gray-200 bg-gradient-to-r px-6 py-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/5" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-16 translate-x-16" />

            <CardTitle className="relative flex items-center gap-3 text-black text-lg font-semibold tracking-tight">
              <div className="p-2.5 backdrop-blur-md rounded-xl border shadow-lg">
                <Plus className="h-6 w-6 text-black" />
              </div>
              <span>Quick Stats</span>
              <div className="ml-auto flex items-center gap-1">
                <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium opacity-90">Live</span>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
            {[
              {
                label: "Applications",
                value: candidate.metrics?.totalApplications ?? 0,
                icon: "paper-plane",
                color: "from-gray-500 to-slate-600",
                bg: "bg-gray-100",
                hoverBg: "hover:bg-gray-200",
              },
              {
                label: "Interviews",
                value: candidate.metrics?.interviewsScheduled ?? 0,
                icon: "calendar-check",
                color: "from-blue-500 to-blue-600",
                bg: "bg-blue-50",
                hoverBg: "hover:bg-blue-100",
              },
              {
                label: "Offers",
                value: candidate.metrics?.offersReceived ?? 0,
                icon: "handshake",
                color: "from-emerald-500 to-green-600",
                bg: "bg-emerald-50",
                hoverBg: "hover:bg-emerald-100",
              },
              {
                label: "Placements",
                value: candidate.metrics?.placements ?? 0,
                icon: "trophy",
                color: "from-purple-500 to-indigo-600",
                bg: "bg-purple-50",
                hoverBg: "hover:bg-purple-100",
              },
            ].map(({ label, value, color, bg, hoverBg }) => (
              <div
                key={label}
                className={`group relative flex items-center justify-between px-5 py-4 rounded-xl ${bg} ${hoverBg} 
                  border border-transparent hover:border-gray-300 shadow-sm hover:shadow-md 
                  transition-all duration-300 cursor-default backdrop-blur-sm`}
              >
                <div
                  className={`absolute inset-0 rounded-xl bg-gradient-to-r ${color} opacity-0 
                       group-hover:opacity-10 blur-xl transition-opacity duration-500`}
                />

                <div className="flex items-center gap-4">
                  <div
                    className={`p-2.5 rounded-lg bg-gradient-to-br ${color} shadow-md`}
                  >
                    {label === "Applications" && (
                      <Mail className="h-5 w-5 text-white" />
                    )}
                    {label === "Interviews" && (
                      <Calendar className="h-5 w-5 text-white" />
                    )}
                    {label === "Offers" && (
                       <DollarSign className="h-5 w-5 text-white" />
                    )}
                    {label === "Placements" && (
                      <Trophy className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700 tracking-wide">
                    {label}
                  </span>
                </div>

                <span
                  className={`text-2xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent 
                        drop-shadow-sm`}
                >
                  {value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Resume List */}
      <div className="mb-8">
        <CandidateResumeList candidateId={candidate.id} />
      </div>

      {/* Educational Qualifications and Work Experience - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Educational Qualifications */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 pb-5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                </div>
                Educational Qualifications
              </CardTitle>
              {canWriteCandidates && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => openAddModal("qualification")}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Qualification
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-7 pb-2">
            {candidate.qualifications &&
            candidate.qualifications.length > 0 ? (
              <div className="space-y-6">
                {candidate.qualifications.map((qual) => (
                  <div
                    key={qual.id}
                    className="group relative bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200/80 rounded-xl p-5 hover:border-blue-300 hover:from-blue-50/70 hover:to-indigo-50/50 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">
                          {qual.qualification.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          {qual.qualification.shortName && (
                            <span className="font-semibold text-blue-700">
                              {qual.qualification.shortName}
                            </span>
                          )}
                          {qual.university && (
                            <>
                              {qual.qualification.shortName && (
                                <span className="text-slate-400">•</span>
                              )}
                              <span className="text-slate-600 font-medium">
                                {qual.university}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`font-medium text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
                            qual.isCompleted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                              : "bg-amber-50 text-amber-700 border-amber-300 shadow-sm"
                          }`}
                        >
                          {qual.isCompleted ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Completed
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              In Progress
                            </>
                          )}
                        </Badge>

                        {canWriteCandidates && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              openEditModal("qualification", qual)
                            }
                            className="h-9 w-9 rounded-lg hover:bg-blue-100 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all duration-300"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {(qual.graduationYear || qual.gpa) && (
                      <div className="flex flex-wrap items-center gap-5 mt-4 text-sm text-slate-600">
                        {qual.graduationYear && (
                          <div className="flex items-center gap-2 font-medium">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span>Graduated {qual.graduationYear}</span>
                          </div>
                        )}
                        {qual.gpa && (
                          <div className="flex items-center gap-2 font-medium">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            <span className="text-slate-800 font-semibold">
                              GPA: {qual.gpa}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {qual.notes && (
                      <div className="mt-4 p-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-700 italic leading-relaxed">
                          “{qual.notes}”
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <GraduationCap className="h-12 w-12 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      No Educational Qualifications Yet
                    </h3>
                  </div>
                  {canWriteCandidates && (
                    <Button
                      onClick={() => openAddModal("qualification")}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add First Qualification
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 pb-5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <Briefcase className="h-6 w-6 text-emerald-600" />
                </div>
                Work Experience
              </CardTitle>
              {canWriteCandidates && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => openAddModal("workExperience")}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Experience
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-7 pb-2">
            {candidate.workExperiences &&
            candidate.workExperiences.length > 0 ? (
              <div className="space-y-6">
                {candidate.workExperiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="group relative bg-gradient-to-r from-slate-50 to-emerald-50/30 border border-slate-200/80 rounded-xl p-6 hover:border-emerald-300 hover:from-emerald-50/70 hover:to-teal-50/50 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-tight">
                              {exp.jobTitle}
                            </h3>
                            <p className="text-base font-semibold text-emerald-700 mt-1">
                              {exp.companyName}
                            </p>
                          </div>
                          {exp.isCurrent && (
                            <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 font-medium px-3 py-1.5 rounded-full shadow-sm">
                              Current Role
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-5 text-sm text-slate-600 font-medium mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-emerald-600" />
                            <span>
                              {formatDate(exp.startDate)} –{" "}
                              {exp.isCurrent
                                ? "Present"
                                : exp.endDate
                                ? formatDate(exp.endDate)
                                : "Ongoing"}
                            </span>
                          </div>
                          {exp.location && (
                            <>
                              <span className="text-slate-400">•</span>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-emerald-600" />
                                <span>{exp.location}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {exp.description && (
                          <p className="text-sm text-slate-700 leading-relaxed mb-5 bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-slate-200">
                            {exp.description}
                          </p>
                        )}
                        
                        {exp.salary && (
                           <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-4">
                                <DollarSign className="h-5 w-5 text-emerald-600" />
                                <span>{formatCurrency(exp.salary)}</span>
                              </div>
                        )}

                        {exp.achievements && (
                          <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <Trophy className="h-5 w-5 text-amber-600" />
                              <span className="font-bold text-amber-800 uppercase tracking-wider text-xs">
                                Key Achievements
                              </span>
                            </div>
                            <p className="text-sm text-amber-900 leading-relaxed">
                              {exp.achievements}
                            </p>
                          </div>
                        )}

                        {exp.skills && Array.isArray(exp.skills) && exp.skills.length > 0 && (
                          <div className="flex wrap gap-2">
                            {exp.skills.map((skill, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-800 border-purple-300 font-medium px-3 py-1 rounded-full"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {canWriteCandidates && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              openEditModal("workExperience", exp)
                            }
                            className="h-10 w-10 rounded-xl hover:bg-emerald-100 hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition-all duration-300"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                    <Briefcase className="h-12 w-12 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      No Work Experience Added
                    </h3>
                  </div>
                  {canWriteCandidates && (
                    <Button
                      onClick={() => openAddModal("workExperience")}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium shadow-lg"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add First Experience
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
