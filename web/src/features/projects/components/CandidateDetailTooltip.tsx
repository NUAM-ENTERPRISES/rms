import {
  Briefcase,
  GraduationCap,
  Info,
  FileText,
  CheckCircle2,
  XCircle,
  DollarSign,
  User,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const formatDateOfBirth = (dob?: string) => {
  if (!dob || dob === "0001-01-01T00:00:00Z") return null;
  try {
    const d = new Date(dob);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

// Human-readable duration between two dates (used per-work-entry)
const formatDuration = (startDate?: string, endDate?: string) => {
  if (!startDate) return null;
  try {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    months = Math.max(0, months);
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (years > 0 && remMonths > 0) return `${years}y ${remMonths}m`;
    if (years > 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
    if (remMonths > 0) return `${remMonths} months`;
    return `0 months`;
  } catch {
    return null;
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
  // Robust candidate data resolution: handles both direct records and nested records (common in joins)
  // when the API returns `{ candidate: { ... } }` the inner object sometimes omits
  // email/phone even though the outer candidate contains them.  Merge both
  // so that top-level values take precedence for contact info while still
  // allowing nested fields for everything else.
  const inner = (candidate as any).candidate || {};
  const c: any = { ...inner, ...candidate };

  const fullName = `${c.firstName || ""} ${c.lastName || ""}`.trim();

  // Robust contact resolution
  const emailVal = c.email || (candidate as any).email;
  const phoneVal = c.mobileNumber || c.contact || (candidate as any).mobileNumber || (candidate as any).contact;
  const countryCodeVal = c.countryCode || (candidate as any).countryCode;

  const contactValue =
    countryCodeVal && phoneVal && !phoneVal.includes(countryCodeVal)
      ? `${countryCodeVal} ${phoneVal}`
      : phoneVal;

  const age = formatAge(c.dateOfBirth || (candidate as any).dateOfBirth);
  const dobFormatted = formatDateOfBirth(c.dateOfBirth || (candidate as any).dateOfBirth);
  
  const totalExp = c.totalExperience || (c as any).experience || candidate.totalExperience || (candidate as any).experience;
  const workExpDuration = calculateExperience(c.workExperiences || (candidate as any).workExperiences) || 
    (totalExp ? `${totalExp} years` : null);

  // New fields requested: qualification label, numeric years and department
  const qualificationLabel = getQualificationLabel(c) || getQualificationLabel(candidate);
  const department = getDepartmentFromCandidate(c) || getDepartmentFromCandidate(candidate);
  const experienceYearsNumeric =
    typeof totalExp === "number"
      ? totalExp
      : calculateExperienceYears(c.workExperiences || (candidate as any).workExperiences);

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
              <AvatarImage src={c.profileImage || (candidate as any).profileImage} alt={fullName} />
              <AvatarFallback className="bg-white text-blue-600 font-bold text-xs">
                {getInitials(c.firstName || (candidate as any).firstName, c.lastName || (candidate as any).lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">{fullName}</h3>
              {/* contact in header */}
              {(emailVal || contactValue) && (
                <div className="text-[10px] text-blue-100 truncate space-y-0.5">
                  {emailVal && <div className="truncate">{emailVal}</div>}
                  {contactValue && <div className="truncate">{contactValue}</div>}
                </div>
              )}
              {!emailVal && !contactValue && (
                <p className="text-[10px] text-blue-100 truncate">
                  {c.currentRole || c.currentEmployer || (candidate as any).currentRole || (candidate as any).currentEmployer || "Candidate"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 space-y-3 max-h-72 overflow-y-auto">

          {/* Personal Details */}
          {(age || c.gender || (candidate as any).gender || department || dobFormatted) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-indigo-600" />
                Personal Profile
              </h4>
              <div className="grid grid-cols-1 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                {(c.gender || (candidate as any).gender) && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-16">Gender:</span>
                    <span className="text-slate-700 font-bold capitalize">
                      {(c.gender || (candidate as any).gender).toLowerCase()}
                    </span>
                  </div>
                )}
                {age && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-16">Age:</span>
                    <span className="text-slate-700 font-medium">{age}</span>
                  </div>
                )}
                {dobFormatted && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-16">Birthday:</span>
                    <span className="text-slate-700 font-medium">{dobFormatted}</span>
                  </div>
                )}
                {department && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-16">Dept:</span>
                    <span className="text-slate-700 font-medium">{department}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Physical Attributes */}
          {(c.height ||
            c.weight ||
            c.skinTone ||
            c.languageProficiency ||
            c.smartness) && (
            <div className="space-y-2 border-t pt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                <Info className="h-3 w-3" />
                Physical & Attributes
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                {c.height && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Height:</span>
                    <span className="text-slate-700 font-medium">
                      {c.height} cm
                    </span>
                  </div>
                )}
                {c.weight && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Weight:</span>
                    <span className="text-slate-700 font-medium">
                      {c.weight} kg
                    </span>
                  </div>
                )}
                {c.skinTone && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Skin:</span>
                    <span className="text-slate-700 font-medium">
                      {c.skinTone}
                    </span>
                  </div>
                )}
                {c.smartness && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Smartness:</span>
                    <span className="text-slate-700 font-medium">
                      {c.smartness}
                    </span>
                  </div>
                )}
                {c.languageProficiency && (
                  <div className="flex items-center gap-1 col-span-2">
                    <span className="text-slate-500">Language:</span>
                    <span className="text-slate-700 font-medium">
                      {c.languageProficiency}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Licensing & Verification */}
          {(c.licensingExam ||
            c.dataFlow ||
            c.eligibility) && (
            <div className="space-y-2 border-t pt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Licensing
              </h4>
              <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                {c.licensingExam && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Exam:</span>
                    <span className="text-slate-700 font-medium">
                      {c.licensingExam}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">DataFlow:</span>
                    {c.dataFlow ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Eligibility:</span>
                    {c.eligibility ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences */}
          {(c.expectedMinSalary ||
            c.sectorType ||
            c.visaType ||
            c.preferredCountries ||
            c.facilityPreferences) && (
            <div className="space-y-2 border-t pt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Preferences
              </h4>
              <div className="space-y-1.5 text-[11px]">
                {(c.expectedMinSalary || c.expectedMaxSalary) && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Expected Salary:</span>
                    <span className="text-slate-700 font-medium">
                      {c.expectedMinSalary
                        ? formatSalary(c.expectedMinSalary)
                        : "Any"}{" "}
                      {c.expectedMaxSalary
                        ? ` - ${formatSalary(c.expectedMaxSalary)}`
                        : ""}
                    </span>
                  </div>
                )}
                {c.sectorType && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Sector:</span>
                    <span className={c.sectorType === "no_preference" ? "text-slate-400 italic" : "text-slate-700 font-medium"}>
                      {c.sectorType === "no_preference"
                        ? "No preference"
                        : c.sectorType}
                    </span>
                  </div>
                )}
                {c.visaType && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Visa:</span>
                    <span className={c.visaType === "not_applicable" ? "text-slate-400 italic" : "text-slate-700 font-medium"}>
                      {c.visaType === "not_applicable"
                        ? "Not Applicable"
                        : c.visaType}
                    </span>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">
                    Countries:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {c.preferredCountries &&
                    c.preferredCountries.length > 0 ? (
                      c.preferredCountries.map((country: any, idx: number) => (
                        <span
                          key={idx}
                          className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]"
                        >
                          {country.countryCode}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No preference</span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">
                    Facilities:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {c.facilityPreferences &&
                    c.facilityPreferences.length > 0 ? (
                      c.facilityPreferences.map((f: any, idx: number) => (
                        <span
                          key={idx}
                          className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]"
                        >
                          {f.facilityType}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No preference</span>
                    )}
                  </div>
                </div>
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

              {/* Work history details (show up to 3 recent entries) with per-entry duration */}
              {Array.isArray(c.workExperiences || (candidate as any).workExperiences) && (c.workExperiences || (candidate as any).workExperiences).length > 0 && (
                <div className="pt-2 space-y-2">
                  <h5 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Work Experience</h5>
                  <div className="space-y-2 text-[11px]">
                    {(c.workExperiences || (candidate as any).workExperiences).slice(0, 3).map((we: any, idx: number) => {
                      const start = we.startDate || we.start_date;
                      const end = we.endDate || we.end_date;
                      const period = formatWorkPeriod(start, end);
                      const duration = formatDuration(start, end);

                      // Robust display fallbacks for heterogeneous API shapes:
                      // - prefer explicit jobTitle/companyName
                      // - then try nested roleCatalog.label / roleCatalog.shortName
                      // - then fall back to c.matchScore.roleName or nominatedRole
                      const roleCatalogFromExp = we.roleCatalog || we.role_catalog;
                      const roleCatalogIdFromExp = we.roleCatalogId || we.role_catalog_id || we.roleCatalog?.id || we.role_catalog?.id;

                      // try to resolve a role label from the experience, or from the candidate's matchScore
                      let roleLabel: string | undefined = undefined;
                      if (roleCatalogFromExp?.label) roleLabel = roleCatalogFromExp.label;
                      else if (roleCatalogFromExp?.shortName) roleLabel = roleCatalogFromExp.shortName;
                      else if (roleCatalogIdFromExp && (c as any).matchScore && typeof (c as any).matchScore === 'object' && (c as any).matchScore.roleCatalog && (c as any).matchScore.roleCatalog.id === roleCatalogIdFromExp) {
                        roleLabel = (c as any).matchScore.roleCatalog.label || (c as any).matchScore.roleName;
                      }

                      const jobTitle = we.jobTitle || we.job_title || roleLabel || (c as any).matchScore?.roleName || c.nominatedRole?.designation || (candidate as any).nominatedRole?.designation || "-";
                      const company =
                        we.companyName ||
                        we.company_name ||
                        we.company ||
                        we.employer ||
                        c.currentEmployer ||
                        (candidate as any).currentEmployer ||
                        "Unknown";

                      // show roleCatalog shortName as compact secondary if available
                      const roleShort = roleCatalogFromExp?.shortName || (c as any).matchScore?.roleCatalog?.shortName || (candidate as any).matchScore?.roleCatalog?.shortName || undefined;

                      return (
                        <div key={idx} className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate text-black">{jobTitle}</div>
                            <div className="text-[11px] text-black truncate">{company}{we.location ? ` • ${we.location}` : ""}{roleShort ? ` • ${roleShort}` : ""}</div>
                          </div>
                          <div className="text-[11px] text-black whitespace-nowrap">
                            {period}{duration ? ` • ${duration}` : ""}
                          </div>
                        </div>
                      );
                    })}
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
