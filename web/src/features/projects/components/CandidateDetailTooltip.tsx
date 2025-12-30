import {
  Mail,
  Phone,
  DollarSign,
  Building,
  Briefcase,
  GraduationCap,
  Calendar,
  MapPin,
  Info,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { CandidateRecord } from "./CandidateCard";

interface CandidateDetailTooltipProps {
  candidate: CandidateRecord;
  children?: React.ReactNode;
}

// Helper functions
const getInitials = (firstName?: string, lastName?: string) => {
  return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
};

const formatSalary = (salary: number | undefined) => {
  if (!salary) return "Not specified";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(salary);
};

const formatAge = (dob?: string) => {
  if (!dob) return null;
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? `${age} years` : null;
  } catch {
    return null;
  }
};

const calculateExperience = (workExp?: Array<any>) => {
  if (!workExp || workExp.length === 0) return null;
  try {
    let totalMonths = 0;
    workExp.forEach(exp => {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      totalMonths += Math.max(0, months);
    });
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years > 0 && months > 0) return `${years}y ${months}m`;
    if (years > 0) return `${years} years`;
    if (months > 0) return `${months} months`;
  } catch {
    return null;
  }
  return null;
};

export function CandidateDetailTooltip({ candidate, children }: CandidateDetailTooltipProps) {
  const fullName = `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim();
  const contactValue =
    candidate.countryCode && candidate.mobileNumber
      ? `${candidate.countryCode} ${candidate.mobileNumber}`
      : candidate.contact;
  const age = formatAge(candidate.dateOfBirth);
  const workExpDuration = calculateExperience(candidate.workExperiences) || 
    (candidate.totalExperience ? `${candidate.totalExperience} years` : null);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children || (
          <div className="absolute top-1/2 right-2 -translate-y-1/2 z-10">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Info className="h-3 w-3" />
            </div>
          </div>
        )}
      </TooltipTrigger>
      <TooltipContent 
        side="right" 
        align="start"
        className="w-96 p-0 bg-white border-2 border-blue-100 shadow-2xl rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
              <AvatarImage src={candidate.profileImage} alt={fullName} />
              <AvatarFallback className="bg-white text-blue-600 font-bold">
                {getInitials(candidate.firstName, candidate.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base truncate">{fullName}</h3>
              <p className="text-xs text-blue-100 truncate">
                {candidate.currentRole || candidate.currentEmployer || "Candidate"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {/* Contact Information */}
          {(candidate.email || contactValue) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Contact
              </h4>
              <div className="space-y-1 text-[11px] text-slate-600">
                {candidate.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-slate-400" />
                    <span className="break-all">{candidate.email}</span>
                  </div>
                )}
                {contactValue && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span>{contactValue}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Personal Details */}
          {(age || candidate.gender) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Personal</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {age && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">{age}</span>
                  </div>
                )}
                {candidate.gender && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Gender:</span>
                    <span className="text-slate-700 font-medium capitalize">
                      {candidate.gender.charAt(0).toUpperCase() + candidate.gender.slice(1).toLowerCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Professional Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              Professional
            </h4>
            <div className="space-y-1.5 text-[11px]">
              {candidate.currentEmployer && (
                <div className="flex items-start gap-2">
                  <Building className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-slate-500">Current Employer</div>
                    <div className="text-slate-700 font-medium">{candidate.currentEmployer}</div>
                  </div>
                </div>
              )}
              {candidate.currentRole && (
                <div className="flex items-start gap-2">
                  <Briefcase className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-slate-500">Current Role</div>
                    <div className="text-slate-700 font-medium">{candidate.currentRole}</div>
                  </div>
                </div>
              )}
              {workExpDuration && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-slate-500">Experience</div>
                    <div className="text-slate-700 font-medium">{workExpDuration}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Work Experience */}
          {candidate.workExperiences && candidate.workExperiences.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Work History</h4>
              <div className="space-y-2">
                {candidate.workExperiences.slice(0, 3).map((exp, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded-lg">
                    <div className="text-[11px] font-semibold text-slate-800">{exp.jobTitle}</div>
                    <div className="text-[10px] text-slate-600">{exp.companyName}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-2.5 w-2.5" />
                      {new Date(exp.startDate).getFullYear()} - {exp.isCurrent ? 'Present' : exp.endDate ? new Date(exp.endDate).getFullYear() : 'N/A'}
                      {exp.location && (
                        <>
                          <span className="mx-1">•</span>
                          <MapPin className="h-2.5 w-2.5" />
                          {exp.location}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {candidate.workExperiences.length > 3 && (
                  <div className="text-[10px] text-slate-500 text-center">
                    +{candidate.workExperiences.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Education */}
          {((candidate.qualifications && candidate.qualifications.length > 0) || 
            (candidate.candidateQualifications && candidate.candidateQualifications.length > 0) || 
            candidate.highestEducation) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                Education
              </h4>
              <div className="space-y-1.5">
                {candidate.candidateQualifications && candidate.candidateQualifications.length > 0 ? (
                  candidate.candidateQualifications.slice(0, 2).map((qual, idx) => (
                    <div key={idx} className="p-2 bg-emerald-50 rounded-lg">
                      <div className="text-[11px] font-semibold text-emerald-900">
                        {qual.name || 'Qualification'}
                      </div>
                      {qual.university && (
                        <div className="text-[10px] text-emerald-700">{qual.university}</div>
                      )}
                      {qual.graduationYear && (
                        <div className="text-[10px] text-emerald-600">Class of {qual.graduationYear}</div>
                      )}
                    </div>
                  ))
                ) : candidate.qualifications && candidate.qualifications.length > 0 ? (
                  candidate.qualifications.slice(0, 2).map((qual, idx) => (
                    <div key={idx} className="p-2 bg-emerald-50 rounded-lg">
                      <div className="text-[11px] font-semibold text-emerald-900">
                        {qual.name || qual.qualification?.name || qual.qualification?.shortName || 'Qualification'}
                      </div>
                      {qual.university && (
                        <div className="text-[10px] text-emerald-700">{qual.university}</div>
                      )}
                      {qual.graduationYear && (
                        <div className="text-[10px] text-emerald-600">Class of {qual.graduationYear}</div>
                      )}
                    </div>
                  ))
                ) : candidate.highestEducation ? (
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <div className="text-[11px] font-semibold text-emerald-900">{candidate.highestEducation}</div>
                    {candidate.university && (
                      <div className="text-[10px] text-emerald-700">{candidate.university}</div>
                    )}
                  </div>
                ) : null}
                {((candidate.candidateQualifications && candidate.candidateQualifications.length > 2) ||
                  (candidate.qualifications && candidate.qualifications.length > 2)) && (
                  <div className="text-[10px] text-slate-500 text-center">
                    +{(candidate.candidateQualifications?.length || candidate.qualifications?.length || 0) - 2} more...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Skills</h4>
              <div className="flex flex-wrap gap-1">
                {candidate.skills.slice(0, 8).map((skill, idx) => (
                  <Badge key={idx} variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200">
                    {skill}
                  </Badge>
                ))}
                {candidate.skills.length > 8 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-600">
                    +{candidate.skills.length - 8}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Salary Info */}
          {(candidate.expectedSalary || candidate.currentSalary) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Compensation
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {candidate.currentSalary && (
                  <div>
                    <div className="text-slate-500">Current</div>
                    <div className="text-slate-700 font-semibold">{formatSalary(candidate.currentSalary)}</div>
                  </div>
                )}
                {candidate.expectedSalary && (
                  <div>
                    <div className="text-slate-500">Expected</div>
                    <div className="text-slate-700 font-semibold">{formatSalary(candidate.expectedSalary)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recruiter Info */}
          {candidate.recruiter && (
            <div className="pt-2 border-t border-slate-200">
              <div className="text-[10px] text-slate-500">Assigned Recruiter</div>
              <div className="text-[11px] text-slate-700 font-medium">{candidate.recruiter.name}</div>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
