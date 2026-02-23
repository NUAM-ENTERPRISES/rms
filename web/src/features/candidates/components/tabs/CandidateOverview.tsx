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
  onEditJobPreferences?: () => void;
  onEditPersonalInfo?: () => void;
}

export const CandidateOverview: React.FC<CandidateOverviewProps> = ({
  candidate,
  canWriteCandidates,
  openAddModal,
  openEditModal,
  onEditJobPreferences,
  onEditPersonalInfo,
}) => {
  const age = getAge(candidate.dateOfBirth);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Candidate Information */}
        <Card className="xl:col-span-2 border border-gray-300 rounded-lg shadow-lg bg-white bg-opacity-90 backdrop-blur-md transition-shadow hover:shadow-2xl">
          <CardHeader className="border-b border-gray-300 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900 select-none">
                <User className="h-6 w-6 text-blue-600" />
                Candidate Information
              </CardTitle>
              {canWriteCandidates && onEditPersonalInfo && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditPersonalInfo}
                  className="text-blue-600 border-blue-200 hover:border-blue-300 hover:bg-blue-50 gap-1.5 h-8 shadow-sm"
                >
                  <Edit className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Edit</span>
                </Button>
              )}
            </div>
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
                  <div className="text-sm flex items-center gap-2 mt-1 font-medium text-blue-700">
                    <DollarSign className="h-3.5 w-3.5" />
                    {candidate.expectedMinSalary !== undefined
                      ? `${formatCurrency(candidate.expectedMinSalary)}${
                          candidate.expectedMaxSalary
                            ? ` - ${formatCurrency(candidate.expectedMaxSalary)}`
                            : ""
                        }`
                      : candidate.expectedSalary
                      ? formatCurrency(candidate.expectedSalary)
                      : "N/A"}
                  </div>
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
                        {candidate.referralPhone
                          ? `${candidate.referralCountryCode || ""} ${candidate.referralPhone}`
                          : "N/A"}
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

              {/* Job Preferences Section */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <Briefcase className="h-5 w-5 text-indigo-600" />
                    Job Preferences
                  </h3>
                  {canWriteCandidates && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEditJobPreferences}
                      className="text-indigo-600 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 gap-1.5 h-8 shadow-sm"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Edit</span>
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Sector Type
                    </label>
                    <Badge
                      variant="outline"
                      className="text-slate-700 border-slate-300"
                    >
                      {candidate.sectorType && candidate.sectorType !== "no_preference"
                        ? candidate.sectorType
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())
                        : "N/A"}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Visa Type
                    </label>
                    <Badge
                      variant="outline"
                      className="text-slate-700 border-slate-300"
                    >
                      {candidate.visaType && candidate.visaType !== "not_applicable"
                        ? candidate.visaType
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())
                        : "N/A"}
                    </Badge>
                  </div>
                  <div className="lg:col-span-1">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Preferred Countries
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {candidate.preferredCountries &&
                      candidate.preferredCountries.length > 0 ? (
                        candidate.preferredCountries.map((pc, idx) => (
                          <Badge
                            key={idx}
                            className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                          >
                            {pc.country.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-slate-400 italic">
                          N/A
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="lg:col-span-1">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Facility Preferences
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {candidate.facilityPreferences &&
                      candidate.facilityPreferences.length > 0 ? (
                        candidate.facilityPreferences.map((fp, idx) => (
                          <Badge
                            key={idx}
                            className="bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100"
                          >
                            {fp.facilityType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-slate-400 italic">
                          N/A
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Educational Qualifications & Work Experience - Integrated Side by Side */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Educational Qualifications Column */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                        Educational Qualifications
                      </h3>
                      {canWriteCandidates && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddModal("qualification")}
                          className="h-8 flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      )}
                    </div>

                    {candidate.qualifications &&
                    candidate.qualifications.length > 0 ? (
                      <div className="space-y-4">
                        {candidate.qualifications.map((qual) => (
                          <div
                            key={qual.id}
                            className="group relative bg-slate-50/50 border border-slate-200 rounded-lg p-4 transition-all hover:border-blue-300 hover:bg-blue-50/30"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-900 line-clamp-1">
                                  {qual.qualification.name}
                                </h4>
                                <p className="text-xs text-slate-600 font-medium line-clamp-1">
                                  {qual.university ||
                                    "University not specified"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {canWriteCandidates && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      openEditModal("qualification", qual)
                                    }
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex gap-3 text-[10px] text-slate-500 font-medium">
                                {qual.graduationYear && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />{" "}
                                    {qual.graduationYear}
                                  </span>
                                )}
                                {qual.gpa && (
                                  <span className="flex items-center gap-1">
                                    <Trophy className="h-3 w-3" /> GPA:{" "}
                                    {qual.gpa}
                                  </span>
                                )}
                              </div>
                              {qual.isCompleted ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] h-4 px-1.5 shadow-none">
                                  Completed
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] h-4 px-1.5 shadow-none">
                                  Ongoing
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <p className="text-sm text-slate-500 italic">
                          No educational qualifications added.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Work Experience Column */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                        <Briefcase className="h-5 w-5 text-emerald-600" />
                        Work Experience
                      </h3>
                      {canWriteCandidates && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddModal("workExperience")}
                          className="h-8 flex items-center gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      )}
                    </div>

                    {candidate.workExperiences &&
                    candidate.workExperiences.length > 0 ? (
                      <div className="space-y-4">
                        {candidate.workExperiences.map((exp) => (
                          <div
                            key={exp.id}
                            className="group relative bg-slate-50/50 border border-slate-200 rounded-lg p-4 transition-all hover:border-emerald-300 hover:bg-emerald-50/30"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-slate-900">
                                    {exp.jobTitle}
                                  </h4>
                                  {exp.isCurrent && (
                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] h-4 px-1.5 shadow-none">
                                      Current
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-emerald-700 font-semibold">
                                  {exp.companyName}
                                </p>
                              </div>
                              {canWriteCandidates && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    openEditModal("workExperience", exp)
                                  }
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                            <div className="flex gap-4 mt-2 text-[11px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(exp.startDate)} –{" "}
                                {exp.isCurrent
                                  ? "Present"
                                  : exp.endDate
                                  ? formatDate(exp.endDate)
                                  : "Ongoing"}
                              </span>
                              {exp.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {exp.location}
                                </span>
                              )}
                              {exp.salary && (
                                <span className="flex items-center gap-1 text-emerald-600">
                                  <DollarSign className="h-3 w-3" />
                                  {formatCurrency(exp.salary)}
                                </span>
                              )}
                            </div>
                            {exp.description && (
                              <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <p className="text-sm text-slate-500 italic">
                          No work experience added.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
      <div className="mb-0">
        <CandidateResumeList candidateId={candidate.id} />
      </div>
    </div>
  );
};
