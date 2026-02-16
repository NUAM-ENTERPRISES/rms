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

// Returns total full years of experience (number) when possible
const calculateExperienceYears = (workExp?: Array<any>) => {
  if (!workExp || workExp.length === 0) return null;
  try {
    let totalMonths = 0;
    workExp.forEach(exp => {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      totalMonths += Math.max(0, months);
    });
    return Math.floor(totalMonths / 12);
  } catch {
    return null;
  }
};

// Format a work experience period as `YYYY - YYYY` or `YYYY - Present` (safe for tests)
const formatWorkPeriod = (startDate?: string, endDate?: string) => {
  try {
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    const sYear = s ? s.getFullYear() : "";
    const eLabel = e ? String(e.getFullYear()) : "Present";
    return sYear ? `${sYear} - ${eLabel}` : eLabel;
  } catch {
    return "";
  }
};

// Derive a human-readable qualification label from multiple possible shapes
const getQualificationLabel = (candidate: CandidateRecord) => {
  if (candidate.highestEducation) return candidate.highestEducation;
  const quals = (candidate.candidateQualifications || candidate.qualifications || []) as any[];
  if (!Array.isArray(quals) || quals.length === 0) return null;
  const q = quals[0];
  const nested = q.qualification || {};
  const label = q.shortName || q.name || nested.shortName || nested.name || q.field || q.university;
  return label ? String(label) : null;
};

// Try to extract department info from known candidate shapes (matchScore / roleMatches)
const getDepartmentFromCandidate = (candidate: CandidateRecord) => {
  if (candidate.matchScore && typeof candidate.matchScore === "object") {
    // some responses include roleDepartmentLabel / roleDepartmentName in matchScore
    // @ts-ignore - matchScore has flexible shape
    return (candidate.matchScore as any).roleDepartmentLabel || (candidate.matchScore as any).roleDepartmentName || undefined;
  }
  // fallback: some roleMatches may include department (rare)
  if (candidate.roleMatches && Array.isArray(candidate.roleMatches) && (candidate as any).roleMatches[0]?.department) {
    return (candidate as any).roleMatches[0].department;
  }
  return undefined;
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

  // New fields requested: qualification label, numeric years and department
  const qualificationLabel = getQualificationLabel(candidate);
  const department = getDepartmentFromCandidate(candidate);
  const experienceYearsNumeric =
    typeof candidate.totalExperience === "number"
      ? candidate.totalExperience
      : calculateExperienceYears(candidate.workExperiences);

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
        className="w-80 p-0 bg-white border-2 border-blue-100 shadow-2xl rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 text-white">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
              <AvatarImage src={candidate.profileImage} alt={fullName} />
              <AvatarFallback className="bg-white text-blue-600 font-bold text-xs">
                {getInitials(candidate.firstName, candidate.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">{fullName}</h3>
              <p className="text-[10px] text-blue-100 truncate">
                {candidate.currentRole || candidate.currentEmployer || "Candidate"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-3 max-h-72 overflow-y-auto">
          {/* Contact Information */}
          {(candidate.email || contactValue) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Contact
              </h4>
              <div className="space-y-1.5 text-[11px] text-slate-600">
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
          {(age || candidate.gender || department) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Personal
              </h4>
              <div className="grid grid-cols-1 gap-2 text-[11px]">
                {age && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Age:</span>
                    <span className="text-slate-700 font-medium">{age}</span>
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

                {department && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Department:</span>
                    <span className="text-slate-700 font-medium">{department}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Qualification */}
          {qualificationLabel && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                Qualification
              </h4>
              <div className="text-[11px] flex items-center gap-2">
                <span className="text-slate-500">Qualification:</span>
                <span className="text-slate-700 font-medium">{qualificationLabel}</span>
              </div>
            </div>
          )}

          {/* Experience */}
          {workExpDuration && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                Experience
              </h4>

              <div className="text-[11px] flex items-center gap-2">
                <span className="text-slate-500">Total Experience:</span>
                <span className="text-slate-700 font-medium">{workExpDuration}</span>
              </div>

              {experienceYearsNumeric !== null && (
                <div className="text-[11px] flex items-center gap-2">
                  <span className="text-slate-500">Years:</span>
                  <span className="text-slate-700 font-medium">{experienceYearsNumeric} {Number(experienceYearsNumeric) === 1 ? 'year' : 'years'}</span>
                </div>
              )}

              {/* Work history details (show up to 3 recent entries) */}
              {Array.isArray(candidate.workExperiences) && candidate.workExperiences.length > 0 && (
                <div className="pt-2 space-y-2">
                  <h5 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Work history</h5>
                  <div className="space-y-2 text-[11px]">
                    {candidate.workExperiences.slice(0, 3).map((we, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{we.jobTitle || we.job_title || "-"}</div>
                          <div className="text-[11px] text-slate-500 truncate">{we.companyName || we.company_name || "Unknown"}{we.location ? ` • ${we.location}` : ""}</div>
                        </div>
                        <div className="text-[11px] text-slate-500 whitespace-nowrap">{formatWorkPeriod(we.startDate || we.start_date, we.endDate || we.end_date)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
