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
  IndianRupee,
  GraduationCap,
  Plus,
  Briefcase,
  Edit,
  Trash2,
  MapPin,
  Trophy,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { DateUtils } from "@/shared/utils/date";
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
  onEditPhysicalInfo?: () => void;
  onEditLicensing?: () => void;
  onDeleteWorkExperience?: (id: string) => void;
  onDeleteQualification?: (id: string) => void;
}

export const CandidateOverview: React.FC<CandidateOverviewProps> = ({
  candidate,
  canWriteCandidates,
  openAddModal,
  openEditModal,
  onEditJobPreferences,
  onEditPersonalInfo,
  onEditPhysicalInfo,
  onEditLicensing,
  onDeleteWorkExperience,
  onDeleteQualification,
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
                  variant="ghost"
                  size="sm"
                  onClick={onEditPersonalInfo}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5 h-8"
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
                        const { years, months } = DateUtils.calculateTotalExperience(candidate.workExperiences);
                        return DateUtils.formatDuration(years, months);
                      }
                      return (
                        candidate.totalExperience ||
                        candidate.experience ||
                        "N/A"
                      );
                    })()}
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

              {/* Candidate address (catalog country/state; separate from phone dial code) */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                  Candidate address
                </label>
                <p className="text-xs text-slate-500 mb-4">
                  Candidate address is the address of the candidate.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Country
                    </label>
                    <p className="text-sm flex items-start gap-2 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden />
                      {candidate.addressCountry?.name?.trim() ||
                        candidate.addressCountryCode?.trim() ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      State / province
                    </label>
                    <p className="text-sm mt-1">
                      {candidate.addressState?.name ?? "N/A"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Street address
                    </label>
                    <p className="text-sm mt-1 text-slate-800 whitespace-pre-wrap">
                      {candidate.address?.trim() ? candidate.address : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

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

              {/* Physical Information Section */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <Sparkles className="h-5 w-5 text-teal-600" />
                    Physical Information
                  </h3>
                  {canWriteCandidates && onEditPhysicalInfo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onEditPhysicalInfo}
                      className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 gap-1.5 h-8"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Edit</span>
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Height
                    </label>
                    <p className="text-sm mt-1">
                      {candidate.height != null
                        ? `${candidate.height} cm`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Weight
                    </label>
                    <p className="text-sm mt-1">
                      {candidate.weight != null
                        ? `${candidate.weight} kg`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Skin Tone
                    </label>
                    <p className="text-sm mt-1 capitalize">
                      {candidate.skinTone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Language Proficiency
                    </label>
                    <p className="text-sm mt-1">
                      {candidate.languageProficiency || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Smartness
                    </label>
                    <p className="text-sm mt-1 capitalize">
                      {candidate.smartness || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Job Preferences Section */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <Briefcase className="h-5 w-5 text-indigo-600" />
                    Job Preferences
                  </h3>
                  {canWriteCandidates && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onEditJobPreferences}
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1.5 h-8"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Edit</span>
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Expected Salary
                    </label>
                    <div className="text-sm flex items-center gap-2 mt-1 font-medium text-blue-700">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {candidate.expectedMinSalary !== undefined
                        ? formatCurrency(candidate.expectedMinSalary)
                        : candidate.expectedSalary
                        ? formatCurrency(candidate.expectedSalary)
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Sector Type
                    </label>
                    <Badge
                      variant="outline"
                      className="text-slate-700 border-slate-300"
                    >
                      {candidate.sectorType
                        ? candidate.sectorType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
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
                      {candidate.visaType
                        ? candidate.visaType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
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
                      Organization Preferences
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

              {/* Licensing & Verification Section */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <ClipboardCheck className="h-5 w-5 text-violet-600" />
                    Licensing & Verification
                  </h3>
                  {canWriteCandidates && onEditLicensing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onEditLicensing}
                      className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 gap-1.5 h-8"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Edit</span>
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Licensing Exam
                    </label>
                    <Badge
                      variant="outline"
                      className="text-slate-700 border-slate-300 capitalize"
                    >
                      {candidate.licensingExam && candidate.licensingExam !== "none"
                        ? candidate.licensingExam.replace(/_/g, " ")
                        : "N/A"}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Data Flow Completed
                    </label>
                    <div className="flex items-center gap-2">
                      {candidate.dataFlow ? (
                        <Badge className="bg-blue-50 text-blue-700 border-blue-100">
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200">
                          Not Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                      Eligibility
                    </label>
                    <div className="flex items-center gap-2">
                      {candidate.eligibility ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">
                          Eligible
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200">
                          Not Verified
                        </Badge>
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
                        <div className="relative space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-100">
                        {candidate.qualifications.map((qual) => (
                          <div
                            key={qual.id}
                            className="group relative ml-8 bg-white border border-slate-200 rounded-xl p-4 transition-all hover:border-blue-300 hover:shadow-md hover:shadow-blue-100/20"
                          >
                            {/* Timeline dot */}
                            <div className="absolute -left-[27px] top-6 w-3 h-3 rounded-full border-2 border-blue-500 bg-white z-10 group-hover:bg-blue-500 transition-colors" />

                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-slate-900">
                                    {qual.qualification.name}
                                  </h4>
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
                                <p className="text-sm text-blue-700 font-semibold mt-0.5">
                                  {qual.university || "University not specified"}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {canWriteCandidates && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        openEditModal("qualification", qual)
                                      }
                                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    {onDeleteQualification && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDeleteQualification(qual.id)}
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all text-red-500 hover:text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[11px] text-slate-500 font-medium">
                              {qual.graduationYear && (
                                <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full">
                                  <Calendar className="h-3 w-3 text-slate-400" />
                                  Class of {qual.graduationYear}
                                </span>
                              )}
                              {qual.gpa && (
                                <span className="flex items-center gap-1.5 text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                                  <Trophy className="h-3 w-3" />
                                  GPA: {qual.gpa}
                                </span>
                              )}
                            </div>

                            {qual.notes && (
                              <div className="mt-3 pt-3 border-t border-slate-50">
                                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed italic">
                                  "{qual.notes}"
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                        </div>
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
                        {/* Total Experience Summary */}
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-lg">
                              <Briefcase className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Experience</p>
                              <p className="text-xl font-bold text-slate-900">
                                {(() => {
                                  const { years, months } = DateUtils.calculateTotalExperience(candidate.workExperiences);
                                  return DateUtils.formatDuration(years, months);
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Positions</p>
                             <p className="text-xl font-bold text-slate-700">{candidate.workExperiences.length}</p>
                          </div>
                        </div>

                        <div className="relative space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-100">
                        {candidate.workExperiences.map((exp) => {
                          const duration = DateUtils.calculateDuration(exp.startDate, exp.endDate, exp.isCurrent);
                          return (
                          <div
                            key={exp.id}
                            className="group relative ml-8 bg-white border border-slate-200 rounded-xl p-4 transition-all hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100/20"
                          >
                            {/* Timeline dot */}
                            <div className="absolute -left-[27px] top-6 w-3 h-3 rounded-full border-2 border-emerald-500 bg-white z-10 group-hover:bg-emerald-500 transition-colors" />
                            
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-slate-900">
                                    {exp.jobTitle}
                                  </h4>
                                  {exp.isCurrent && (
                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] h-4 px-1.5 shadow-none">
                                      Current
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-medium border-slate-200 text-slate-500">
                                    {DateUtils.formatDuration(duration.years, duration.months)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-emerald-700 font-semibold mt-0.5">
                                  {exp.companyName || "N/A"}
                                </p>
                              </div>
                              {canWriteCandidates && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      openEditModal("workExperience", exp)
                                    }
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  {onDeleteWorkExperience && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onDeleteWorkExperience(exp.id)}
                                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[11px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                {formatDate(exp.startDate)} –{" "}
                                {exp.isCurrent
                                  ? "Present"
                                  : exp.endDate
                                  ? formatDate(exp.endDate)
                                  : "Ongoing"}
                              </span>
                              {exp.location && (
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="h-3 w-3 text-slate-400" /> {exp.location}
                                </span>
                              )}
                              {exp.salary && (
                                <span className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                                  <IndianRupee className="h-2.5 w-2.5" />
                                  {formatCurrency(exp.salary)}
                                </span>
                              )}
                            </div>
                            {exp.description && (
                              <div className="mt-3 pt-3 border-t border-slate-50">
                                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed italic">
                                  "{exp.description}"
                                </p>
                              </div>
                            )}
                          </div>
                          );
                        })}
                        </div>
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
                       <IndianRupee className="h-5 w-5 text-white" />
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
