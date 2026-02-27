import {
  Mail,
  Phone,
  DollarSign,
  Building2 as Building,
  MoreVertical,
  Send,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  ArrowRight,
  Trophy,
  FileText,
  CheckCircle,
  AlertCircle,
  Upload,
  GraduationCap,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import { CandidateDetailTooltip } from "./CandidateDetailTooltip";
import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type StatusReference = {
  name?: string;
  label?: string;
  statusName?: string;
};

type CandidateProjectLink = {
  projectId?: string;
  subStatus?: StatusReference;
  currentProjectStatus?: { statusName?: string };
  mainStatus?: { name?: string };
  /**
   * Flag set by the backend when the candidate has been linked to a project
   * but document verification was intentionally skipped (direct screening).
   */
  isSendedForDocumentVerification?: boolean;
  documentVerifications?: Array<{
    id: string;
    status: string;
    document: {
      id: string;
      docType: string;
      fileName: string;
      fileUrl: string;
      status: string;
    };
  }>;
};

export interface CandidateRecord {
  id?: string;
  candidateId?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  email?: string;
  mobileNumber?: string;
  contact?: string;
  countryCode?: string;
  currentStatus?: StatusReference | string;
  projectSubStatus?: StatusReference;
  projectMainStatus?: StatusReference;
  currentProjectStatus?: { statusName?: string };
  projectStatus?: { statusName?: string };
  currentEmployer?: string;
  currentRole?: string;
  expectedSalary?: number;
  currentSalary?: number;
  totalExperience?: number;
  dateOfBirth?: string;
  gender?: string;
  source?: string;
  
  // Physical and Personal attributes
  height?: number;
  weight?: number;
  skinTone?: string;
  languageProficiency?: string;
  smartness?: string;

  // Licensing and Verification
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;

  // Preferences
  expectedMinSalary?: number;
  expectedMaxSalary?: number;
  sectorType?: string;
  visaType?: string;
  preferredCountries?: Array<{ id: string; countryCode: string }>;
  facilityPreferences?: Array<{ id: string; facilityType: string }>;

  /**
   * Flag set by the backend when the candidate has been linked to a project
   * but document verification was intentionally skipped (direct screening).
   */
  isSendedForDocumentVerification?: boolean;
  matchScore?:
    | number
    | {
        roleId?: string;
        roleName?: string;
        roleCatalogId?: string;
        roleDepartmentName?: string;
        roleDepartmentLabel?: string;
        score?: number;
      };
  roleMatches?: Array<{ roleId?: string; designation?: string; score?: number }>;
  nominatedRole?: { id?: string; designation?: string; score?: number };
  projects?: CandidateProjectLink[];
  projectDetails?: {
    projectId: string;
    projectTitle: string;
    mainStatus: string;
    subStatus: string;
    nominatedRole: string;
    roleNeeded?: any;
  } | null;
  project?: {
    id?: string;
    title?: string;
    documentRequirements?: Array<{
      id: string;
      docType: string;
      mandatory: boolean;
      description: string;
    }>;
  } | null;
  documentVerifications?: Array<{
    id: string;
    status: string;
    document: {
      id: string;
      docType: string;
      fileName: string;
      fileUrl: string;
      status: string;
    };
  }>;
  workExperiences?: Array<{
    id: string;
    companyName: string;
    jobTitle: string;
    startDate: string;
    endDate?: string;
    isCurrent: boolean;
    description?: string;
    location?: string;
  }>;
  qualifications?: Array<{
    id: string;
    qualificationId?: string;
    university?: string;
    graduationYear?: number;
    gpa?: number;
    isCompleted?: boolean;
    notes?: string;
    // Direct qualification fields (from nominated API)
    name?: string;
    level?: string;
    field?: string;
    // Nested qualification (from eligible/all candidates API)
    qualification?: {
      id: string;
      name: string;
      shortName?: string;
      level: string;
      field: string;
    };
  }>;
  candidateQualifications?: Array<{
    id: string;
    name: string;
    level: string;
    field: string;
    university?: string;
    graduationYear?: number;
    gpa?: number;
    isCompleted?: boolean;
    notes?: string;
  }>;
  skills?: string[];
  highestEducation?: string;
  university?: string;
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };
}

interface CandidateCardProps {
  candidate: CandidateRecord;
  projectId?: string;
  isRecruiter?: boolean;
  /** Current search term from the parent board — used to highlight / filter qualifications shown */
  searchTerm?: string;
  onView?: (candidateId: string) => void;
  onAction?: (candidateId: string, action: string) => void;
  actions?: Array<{
    label: string;
    action: string;
    variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  showMatchScore?: boolean;
  matchScore?:
    | number
    | {
        roleId?: string;
        roleName?: string;
        roleCatalogId?: string;
        roleDepartmentName?: string;
        roleDepartmentLabel?: string;
        score?: number;
      };
  projectStatus?: string;
  showVerifyButton?: boolean;
  onVerify?: (candidateId: string) => void;
  /**
   * Show an 'Assign to Project' button and handler.
   */
  showAssignButton?: boolean;
  onAssignToProject?: (candidateId: string) => void;
  /**
   * Show a 'Send for Interview' button and handler. The handler gets called
   * with candidate id when the button is clicked.
   */
  showInterviewButton?: boolean;
  onSendForInterview?: (candidateId: string) => void;
  isAlreadyInProject?: boolean;
  className?: string;
  /** Whether to show the document verification status icon and tooltip */
  showDocumentStatus?: boolean;
  /** When true, hide the verify button and show an alert icon with tooltip */
  showSkipDocumentVerification?: boolean;
  skipDocumentVerificationMessage?: string;
  eligibilityData?: {
    isEligible: boolean;
    roleEligibility?: Array<{
      roleId: string;
      designation: string;
      isEligible: boolean;
      flags: {
        gender: boolean;
        age: boolean;
        experience: boolean;
      };
      reasons: string[];
    }>;
  };
  /**
   * When true, show contact buttons (WhatsApp + Call) on the left side of the
   * action row. Parent (Project page) enables this for Eligible / All columns.
   */
  showContactButtons?: boolean;
}

const CandidateCard = memo(function CandidateCard({
  candidate,
  projectId: propProjectId,
  isRecruiter = false,
  onView,
  onAction,
  actions,
  showMatchScore = false,
  matchScore,
  projectStatus,
  showVerifyButton = false,
  showInterviewButton = false,
  onVerify,
  onSendForInterview,
  showAssignButton = false,
  onAssignToProject,
  isAlreadyInProject = false,
  className,
  showDocumentStatus = true,
  showSkipDocumentVerification = false,
  skipDocumentVerificationMessage,
  eligibilityData: propEligibilityData,
  showContactButtons = false,
  /** control hiding of email/phone pills */
  hideContactInfo = false,
  searchTerm = "",
}: CandidateCardProps) {
  const navigate = useNavigate();
  const candidateId = candidate.candidateId || candidate.id || "";
  // Filter out "Assign to Project" from actions as it's now a primary button
  const filteredActions = actions?.filter(
    (action) => action.label.toLowerCase() !== "assign to project"
  );

  // Eligibility check: enable if ANY role is eligible (even with soft reasons)
  const anyRoleEligible = propEligibilityData?.roleEligibility?.some((r) => r.isEligible);
  const isNotEligible = propEligibilityData?.isEligible === false || !anyRoleEligible;
  const eligibilityData = propEligibilityData;

  // Document verification logic
  const requiredDocs = candidate.project?.documentRequirements || [];
  
  // Try to find project-specific document verifications if projectId is provided
  const projectLink = propProjectId 
    ? candidate.projects?.find(p => p.projectId === propProjectId)
    : undefined;

  // If projects array is missing (consolidated API), use flattened project properties
  const isNominatedForThisProject = propProjectId === candidate.projectDetails?.projectId || !!projectLink;
  const currentSubStatus = projectLink?.subStatus || (propProjectId === candidate.projectDetails?.projectId ? candidate.projectSubStatus : undefined);
  const currentMainStatus = projectLink?.mainStatus || (propProjectId === candidate.projectDetails?.projectId ? candidate.projectMainStatus : undefined);

  const isSendedForVerification = projectLink?.isSendedForDocumentVerification ?? candidate.isSendedForDocumentVerification;
    
  const uploadedDocs = [
    ...(candidate.documentVerifications || []),
    ...(projectLink?.documentVerifications || [])
  ];
  const isNoneUploaded = uploadedDocs.length === 0;
  
  const docStatusList = requiredDocs.map(req => {
    const uploaded = uploadedDocs.find(u => 
      u.document?.docType?.toLowerCase() === req.docType?.toLowerCase()
    );
    return {
      ...req,
      isUploaded: !!uploaded,
      status: uploaded?.status || 'pending'
    };
  });

  const isAllUploaded = docStatusList.every(d => d.isUploaded);

  const handleUploadNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pId = propProjectId || candidate.project?.id;
    if (pId && candidateId) {
      navigate(`/recruiter-docs/${pId}/${candidateId}`);
    }
  };

  // Get status configuration
  const getStatusConfig = (status: string) => {
    const statusLower = status?.toLowerCase() || "";
    switch (statusLower) {
      case "interested":
        return {
          label: "Interested",
          color: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "untouched":
        return {
          label: "Untouched",
          color: "bg-gray-100 text-gray-800 border-gray-200",
        };
      case "not interested":
        return {
          label: "Not Interested",
          color: "bg-slate-100 text-slate-800 border-slate-200",
        };
      case "qualified":
        return {
          label: "Qualified",
          color: "bg-green-100 text-green-800 border-green-200",
        };
      case "deployed":
      case "working": // legacy
        return {
          label: "Deployed",
          color: "bg-emerald-100 text-emerald-800 border-emerald-200",
        };
      // Project statuses
      case "nominated":
        return {
          label: "Nominated",
          color: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "pending_documents":
        return {
          label: "Pending Documents",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        };
      case "documents_submitted":
        return {
          label: "Documents Submitted",
          color: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "verification_in_progress":
        return {
          label: "Verification In Progress",
          color: "bg-orange-100 text-orange-800 border-orange-200",
        };
      case "documents_verified":
        return {
          label: "Documents Verified",
          color: "bg-green-100 text-green-800 border-green-200",
        };
      case "approved":
        return {
          label: "Approved",
          color: "bg-green-100 text-green-800 border-green-200",
        };
      case "interview_scheduled":
        return {
          label: "Interview Scheduled",
          color: "bg-purple-100 text-purple-800 border-purple-200",
        };
      case "interview_completed":
        return {
          label: "Interview Completed",
          color: "bg-purple-100 text-purple-800 border-purple-200",
        };
      case "interview_passed":
        return {
          label: "Interview Passed",
          color: "bg-green-100 text-green-800 border-green-200",
        };
      case "selected":
        return {
          label: "Selected",
          color: "bg-green-100 text-green-800 border-green-200",
        };
      case "processing":
        return {
          label: "Processing",
          color: "bg-orange-100 text-orange-800 border-orange-200",
        };
      case "hired":
        return {
          label: "Hired",
          color: "bg-green-100 text-green-800 border-green-200",
        };
      case "rejected_documents":
        return {
          label: "Rejected - Documents",
          color: "bg-red-100 text-red-800 border-red-200",
        };
      case "rejected_interview":
        return {
          label: "Rejected - Interview",
          color: "bg-red-100 text-red-800 border-red-200",
        };
      case "rejected_selection":
        return {
          label: "Rejected - Selection",
          color: "bg-red-100 text-red-800 border-red-200",
        };
      case "withdrawn":
        return {
          label: "Withdrawn",
          color: "bg-gray-100 text-gray-800 border-gray-200",
        };
      case "on_hold":
        return {
          label: "On Hold",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        };
      case "not_in_project":
        return {
          label: "Not in Project",
          color: "bg-red-50 text-red-600 border-red-200",
        };
      default:
        return {
          label: status,
          color: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  };

  // Get match score color
  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 70) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const statusConfig = getStatusConfig(
    projectStatus ||
      (typeof candidate.currentStatus === "string"
        ? candidate.currentStatus
        : candidate.currentStatus?.statusName || "") ||
      ""
  );

  // Also compute explicit candidate.currentStatus (separate from projectStatus)
  const candidateStatusRaw: string =
    typeof candidate.currentStatus === "string"
      ? candidate.currentStatus
      : candidate.currentStatus?.statusName || candidate.currentStatus?.name || "";
  const normalize = (s: string | undefined) =>
    (s || "").toString().toLowerCase().replace(/[\s_]+/g, "");
  const showCandidateStatusBadge = !!candidateStatusRaw && !!projectStatus && normalize(candidateStatusRaw) !== normalize(projectStatus);
  const candidateStatusConfig = candidateStatusRaw ? getStatusConfig(candidateStatusRaw) : null;

  // Get initials for avatar
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ""}${
      lastName?.charAt(0) || ""
    }`.toUpperCase();
  };

  // Format salary
  const formatSalary = (salary: number | undefined) => {
    if (!salary) return "Not specified";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(salary);
  };

  const fullName = `${candidate.firstName || ""} ${
    candidate.lastName || ""
  }`.trim();
  const contactValue =
    candidate.countryCode && candidate.mobileNumber
      ? `${candidate.countryCode} ${candidate.mobileNumber}`
      : candidate.contact;
  // Determine the primary role + score to display (prefers explicit matchScore object,
  // then highest-scoring roleMatches, then nominatedRole, then numeric matchScore)
  const getPrimaryRoleMatch = () => {
    // If matchScore is an object with roleName and score, use it
    if (
      candidate.matchScore &&
      typeof candidate.matchScore === "object" &&
      (candidate.matchScore as any).score !== undefined
    ) {
      const ms: any = candidate.matchScore;
      return {
        designation: ms.roleName ?? ms.roleDepartmentLabel ?? ms.roleId,
        department: ms.roleDepartmentLabel ?? ms.roleDepartmentName ?? undefined,
        score: typeof ms.score === "number" ? ms.score : undefined,
      } as { designation?: string; score?: number | undefined; department?: string };
    }

    // If roleMatches array present, pick the highest scoring role
    if (candidate.roleMatches && candidate.roleMatches.length > 0) {
      const sorted = [...candidate.roleMatches].sort(
        (a, b) => (b.score ?? 0) - (a.score ?? 0)
      );
      return {
        designation: sorted[0].designation,
        score: sorted[0].score,
        department: undefined,
      };
    }

    // Fallback to nominatedRole
    if (candidate.nominatedRole) {
      return {
        designation: candidate.nominatedRole.designation,
        score: candidate.nominatedRole.score,
        department: undefined,
      };
    }

    // Fallback to projectDetails (from consolidated API)
    if (candidate.projectDetails?.roleNeeded) {
      return {
        designation: candidate.projectDetails.roleNeeded.designation,
        department: candidate.projectDetails.roleNeeded.roleCatalog?.label || candidate.projectDetails.roleNeeded.roleCatalog?.name,
        score: undefined,
      };
    }

    // Final fallback: numeric matchScore
    if (typeof candidate.matchScore === "number") {
      return { designation: undefined, score: candidate.matchScore };
    }

    return { designation: undefined, score: undefined, department: undefined };
  };

  const primaryRoleMatch = getPrimaryRoleMatch();
  // Ensure the displayed match score is a plain number (not an object).
  const resolveNumericScore = (s: any): number | undefined => {
    if (s === undefined || s === null) return undefined;
    if (typeof s === "number") return s;
    if (typeof s === "object") {
      if (typeof s.score === "number") return s.score;
      // Some responses may use 'score' nested differently; try common keys
      if (typeof s?.value === "number") return s.value;
    }
    return undefined;
  };

  const displayMatchScore =
    resolveNumericScore(matchScore) ??
    resolveNumericScore(candidate.matchScore) ??
    primaryRoleMatch.score;

  // Show only the qualifications that match the current search term (if any).
  // This keeps the card UI unchanged when there's no search, and highlights
  // matching qualifications when the user searches for a qualification.
  const _searchTerm = (/* optional prop forwarded from parent */ (undefined as unknown) as string) || "";
  // Note: the parent component (`ProjectCandidatesBoard`) forwards `searchTerm`.
  // We try to use that if available via props; TypeScript typing for the
  // component will include `searchTerm?: string` below.
  // (We will override `_searchTerm` with the actual prop below when added.)

  // Build a normalized list of qualifications from both possible shapes
  const allQualifications: Array<{ name?: string; shortName?: string; field?: string; university?: string }> = [];
  (candidate.candidateQualifications || []).forEach((q: any) => {
    allQualifications.push({ name: q.name, shortName: q.shortName, field: q.field, university: q.university });
  });
  (candidate.qualifications || []).forEach((q: any) => {
    // `qualifications` can either include direct name/field or a nested `qualification` object
    const nested = q.qualification || {};
    allQualifications.push({ name: q.name || nested.name, shortName: nested.shortName, field: q.field || nested.field, university: q.university });
  });

  // NOTE: `searchTerm` prop is injected into the component signature below.
  // Compute matching qualifications only when a non-empty search term exists.
  const term = (searchTerm || _searchTerm || "").toLowerCase().trim();
  // Deduplicate qualification pills by the display label (shortName/name/field/university).
  // Keep the first occurrence of a label so cards do not show the same pill multiple times.
  const matchingQualifications = (() => {
    if (!term) return [] as typeof allQualifications;

    const seen = new Set<string>();
    const res: Array<typeof allQualifications[0]> = [];

    for (const q of allQualifications) {
      const label = (q.shortName || q.name || q.field || q.university || "").toString().trim();
      if (!label) continue;
      const labelLower = label.toLowerCase();
      // only include qualifications that match the search term
      if (!labelLower.includes(term)) continue;
      if (seen.has(labelLower)) continue;
      seen.add(labelLower);
      res.push(q);
    }

    return res;
  })();

  // DEBUG: In tests, help verify whether interview button is expected to render
  

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer rounded-xl border border-slate-200 bg-white/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-within:border-blue-300 focus-within:shadow-md py-2",
        className
      )}
      onClick={() => onView?.(candidateId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onView?.(candidateId);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View candidate ${fullName}`}
    >
      <div
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500"
        aria-hidden="true"
      />
      
      {/* Detailed Info Tooltip - Hover on entire card */}
      <CandidateDetailTooltip candidate={candidate} />

      <CardContent className="pl-3 pr-3 py-0 space-y-2">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-white shadow-sm flex-shrink-0">
            <AvatarImage src={candidate.profileImage} alt={fullName} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-semibold">
              {getInitials(candidate.firstName, candidate.lastName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
                  {fullName || "Unnamed Candidate"}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isAlreadyInProject && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0 h-5 rounded-full flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    In Project
                  </Badge>
                )}
                {filteredActions && filteredActions.length > 0 && (
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn(isNotEligible && "cursor-not-allowed")}>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isNotEligible}
                              className="h-5 w-5 p-0 text-slate-500"
                              aria-label="More actions"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                        </span>
                      </TooltipTrigger>
                      {isNotEligible && (
                        <TooltipContent className="bg-slate-900 text-white border-0 text-[10px] p-2 max-w-xs shadow-xl">
                          <div className="space-y-2">
                            <p className="font-semibold border-b border-slate-700 pb-1 mb-1">
                              Eligibility Mismatch:
                            </p>
                            {eligibilityData?.roleEligibility?.map(
                              (role, idx) => (
                                <div key={idx} className="space-y-1">
                                  <p className="text-slate-300 font-medium">
                                    {role.designation}:
                                  </p>
                                  <ul className="list-disc pl-3 space-y-0.5">
                                    {role.reasons.map((reason, ridx) => (
                                      <li key={ridx}>{reason}</li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            )}
                            {(!eligibilityData?.roleEligibility ||
                              eligibilityData.roleEligibility.length === 0) && (
                              <p>Not eligible for this project.</p>
                            )}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                    <DropdownMenuContent
                      align="end"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {filteredActions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                          <DropdownMenuItem
                            key={index}
                            onClick={(event) => {
                              event.stopPropagation();
                              onAction?.(candidateId, action.action);
                            }}
                          >
                            {Icon && <Icon className="h-4 w-4 mr-2" />}
                            {action.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status row */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={`${statusConfig.color} border text-[10px] px-2 py-0.5 rounded-full`}
          >
            {statusConfig.label}
          </Badge>

          {/* Candidate's global/current status (shown only when different from project status) */}
          {showCandidateStatusBadge && candidateStatusConfig && (
            <Badge
              variant="outline"
              className={`${candidateStatusConfig.color} border text-[10px] px-2 py-0.5 rounded-full`}
              title={`Candidate status: ${candidateStatusConfig.label}`}
            >
              {candidateStatusConfig.label}
            </Badge>
          )}

          {showMatchScore && displayMatchScore !== undefined && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`${getMatchScoreColor(
                    displayMatchScore
                  )} border text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1`}
                >
                  {anyRoleEligible && (
                    <Trophy className="h-3 w-3 text-amber-500 animate-pulse" />
                  )}
                  <span className="text-[11px] font-semibold">{displayMatchScore}%</span>
                </Badge>
              </TooltipTrigger>

              <TooltipContent className="bg-white text-slate-700 border shadow-sm p-0 rounded-md max-w-xs">
                {primaryRoleMatch.designation ? (
                  <>
                    {/* Include a concise, screen-reader-friendly sentence describing
                        the primary eligible role and score (also useful for tests). */}
                    <div className="sr-only">
                      This candidate is eligible for {primaryRoleMatch.designation} with score {displayMatchScore}%
                    </div>
                    <div className="p-4 max-w-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`${getMatchScoreColor(
                          displayMatchScore ?? 0
                        )} w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold`}
                        aria-hidden
                      >
                        <span className="text-[12px]">{displayMatchScore}%</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">
                          {primaryRoleMatch.designation}
                        </div>
                        {primaryRoleMatch.department && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate uppercase tracking-wider font-medium">
                            {primaryRoleMatch.department}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs font-semibold text-slate-500 mb-1.5">{displayMatchScore}% match</div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`${getMatchScoreColor(
                            displayMatchScore ?? 0
                          )} h-full rounded-full`}
                          style={{ width: `${displayMatchScore}%` }}
                        />
                      </div>

                      {/* Top matched role reasons (Only top matched role reason) */}
                      {(() => {
                        const topRole = eligibilityData?.roleEligibility?.find(
                          (r) => r.designation === primaryRoleMatch.designation
                        );
                        if (topRole?.reasons && topRole.reasons.length > 0) {
                          return (
                            <div className="mt-4 p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                              <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <AlertCircle className="h-3 w-3 text-amber-500" />
                                {topRole.designation} Match Details
                              </div>
                              <ul className="list-disc list-inside space-y-1.5">
                                {topRole.reasons.map((reason, idx) => (
                                  <li key={idx} className="text-[10px] text-slate-500 italic leading-relaxed pl-1">
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {eligibilityData?.roleEligibility && anyRoleEligible && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                        <div className="text-[11px] font-bold text-green-600 flex items-center gap-2 mb-3 bg-green-50 p-2.5 rounded-lg border border-green-100 italic">
                          <Trophy className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />
                          <span>
                            Correct! {eligibilityData.roleEligibility.filter(r => r.isEligible).length > 1 
                              ? `these roles are eligible. You can assign this candidate to any of these ${eligibilityData.roleEligibility.filter(r => r.isEligible).length} roles.` 
                              : `this role is eligible. You can assign this candidate to only this role.`}
                          </span>
                        </div>

                        {eligibilityData.roleEligibility.filter(role => role.isEligible).map((role, rIdx) => (
                          <div key={rIdx} className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-[11px] font-bold text-slate-700">{role.designation}</div>
                              <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Eligible</span>
                            </div>
                            {role.reasons && role.reasons.length > 0 && (
                              <ul className="list-disc list-inside space-y-1 mt-1">
                                {role.reasons.map((reason, idx) => (
                                  <li key={idx} className="text-[10px] text-slate-500 italic leading-relaxed pl-1">
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
                ) : candidate.roleMatches && candidate.roleMatches.length > 0 ? (
                  <div className="text-xs font-medium">Top role: {candidate.roleMatches[0].designation} — {candidate.roleMatches[0].score ?? '-'}%</div>
                ) : (
                  <div className="text-xs text-slate-500">No role breakdown available</div>
                )}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Document Status Icon */}
          {showDocumentStatus && (requiredDocs.length > 0 || uploadedDocs.length > 0) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300",
                    isAllUploaded ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600",
                    isNoneUploaded && "animate-pulse"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isAllUploaded ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="w-64 p-3 bg-white border shadow-lg rounded-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Project Documents</h4>
                    {isAllUploaded ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-[10px] h-5">Complete</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-[10px] h-5">Pending</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {docStatusList.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 text-slate-600">
                          {doc.isUploaded ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                          )}
                          <span className="capitalize">{doc.docType.replace(/_/g, ' ')}</span>
                        </div>
                        <span className={cn(
                          "font-medium",
                          doc.isUploaded ? "text-green-600" : "text-amber-600"
                        )}>
                          {doc.isUploaded ? "Uploaded" : "Missing"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {isRecruiter && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full h-7 text-[10px] text-black gap-1.5 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                      onClick={handleUploadNavigation}
                    >
                      <Upload className="h-3 w-3" />
                      Upload Documents
                    </Button>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Skip Document Verification Icon */}
          {showSkipDocumentVerification && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-600 cursor-help"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-white text-red-600 border border-red-100 shadow-sm max-w-xs p-2 rounded-md">
                <p className="text-xs text-red-600">
                  {skipDocumentVerificationMessage ||
                    "This candidate should skip document verification because of direct screening. Once screening is completed you should do document verification."}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Eligibility Warning Icon */}
          {eligibilityData && (eligibilityData.isEligible === false || eligibilityData.roleEligibility?.some(r => r.reasons && r.reasons.length > 0)) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full cursor-help animate-pulse",
                    isNotEligible ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  )}
                  onClick={(event) => event.stopPropagation()}
                >
                  <AlertCircle className="h-4 w-4" aria-hidden />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-white text-slate-900 border border-red-200 shadow-lg max-w-xs p-3 rounded-xl">
                <div className="space-y-2">
                  <div className={cn(
                    "flex items-center gap-2 font-bold text-xs",
                    isNotEligible ? "text-red-600" : "text-amber-600"
                  )}>
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{isNotEligible ? "Not Eligible for Project" : "Eligibility Mismatch"}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2">
                    {isNotEligible 
                      ? "This candidate does not meet the minimum requirements for any role in this project."
                      : "This candidate is eligible but has some soft mismatches or requires verification."}
                  </div>
                  
                  {eligibilityData?.roleEligibility && (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role Breakdown</div>
                      {eligibilityData.roleEligibility.map((role, rIdx) => (
                        <div key={rIdx} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-semibold text-slate-700">{role.designation}</div>
                            {role.isEligible ? (
                              <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Eligible</span>
                            ) : (
                              <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Not Eligible</span>
                            )}
                          </div>
                          {role.reasons && role.reasons.length > 0 && (
                            <ul className="list-disc list-inside space-y-0.5">
                              {role.reasons.map((reason, idx) => (
                                <li key={idx} className="text-[10px] text-slate-500 italic leading-relaxed">
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Detail pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          {!hideContactInfo && candidate.email && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <Mail className="h-3 w-3 text-slate-400" aria-hidden="true" />
              <span className="truncate max-w-[140px]">{candidate.email}</span>
            </span>
          )}
          {!hideContactInfo && contactValue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <Phone className="h-3 w-3 text-slate-400" aria-hidden="true" />
              <span className="truncate max-w-[120px]">{contactValue}</span>
            </span>
          )}
          {candidate.currentEmployer && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <Building className="h-3 w-3 text-slate-400" aria-hidden="true" />
              <span className="truncate max-w-[140px]">
                {candidate.currentEmployer}
              </span>
            </span>
          )}
          {candidate.expectedSalary && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <DollarSign
                className="h-3 w-3 text-slate-400"
                aria-hidden="true"
              />
              <span className="truncate max-w-[120px]">
                {formatSalary(candidate.expectedSalary)}
              </span>
            </span>
          )}
        </div>

        {/* Show matching qualifications when user is searching for a qualification */}
        {Array.isArray(matchingQualifications) && matchingQualifications.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
            {matchingQualifications.map((mq, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                <GraduationCap className="h-3 w-3 text-slate-400" aria-hidden />
                <span className="truncate max-w-[160px]">{mq.shortName || mq.name || mq.field || mq.university}</span>
              </span>
            ))}
          </div>
        )}

        {/* Unified footer: left = contact buttons, right = action buttons (assign / verify / interview) */}
        {(showContactButtons || (showAssignButton && onAssignToProject) || (isRecruiter && showVerifyButton && onVerify) || (showInterviewButton && onSendForInterview)) && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
            <div className="flex items-center gap-2">
              {showContactButtons && (
                <>
                  {/* WhatsApp button — opens wa.me if number present; stopPropagation so card click doesn't fire */}
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="candidate-whatsapp-btn"
                    className="h-7 w-9 p-0 bg-green-100 text-green-900 hover:bg-green-200 focus:ring-2 focus:ring-green-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      const num = candidate.countryCode ? `${candidate.countryCode}${candidate.mobileNumber || candidate.contact}` : candidate.mobileNumber || candidate.contact;
                      if (num) {
                        // normalize number by removing spaces
                        const normalized = String(num).replace(/\s+/g, "").replace(/[()+-]/g, "");
                        window.open(`https://wa.me/${normalized}`, "_blank");
                      }
                    }}
                  >
                    <span className="sr-only">WhatsApp</span>
                    <FaWhatsapp className="h-4 w-4 text-green-900" aria-hidden="true" />
                  </Button>

                  {/* Call button — uses tel: link */}
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="candidate-call-btn"
                    className="h-7 w-9 p-0 border border-slate-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      const num = candidate.countryCode ? `${candidate.countryCode}${candidate.mobileNumber || candidate.contact}` : candidate.mobileNumber || candidate.contact;
                      if (num) {
                        const normalized = String(num).replace(/\s+/g, "").replace(/[()+-]/g, "");
                        window.location.href = `tel:${normalized}`;
                      }
                    }}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {showAssignButton && onAssignToProject && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(isNotEligible && "cursor-not-allowed")}>
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isNotEligible}
                        className="h-7 text-[11px] bg-green-600 hover:bg-green-700 px-2.5"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAssignToProject(candidateId);
                        }}
                      >
                        <UserPlus className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                        Assign to Project
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isNotEligible && (
                    <TooltipContent className="bg-slate-900 text-white border-0 text-[10px] p-2 max-w-xs shadow-xl">
                      <div className="space-y-2">
                        <p className="font-semibold border-b border-slate-700 pb-1 mb-1">
                          Eligibility Mismatch:
                        </p>
                        {eligibilityData?.roleEligibility?.map((role, idx) => (
                          <div key={idx} className="space-y-1">
                            <p className="text-slate-300 font-medium">
                              {role.designation}:
                            </p>
                            <ul className="list-disc pl-3 space-y-0.5">
                              {role.reasons.map((reason, ridx) => (
                                <li key={ridx}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        {(!eligibilityData?.roleEligibility ||
                          eligibilityData.roleEligibility.length === 0) && (
                          <p>Not eligible for this project.</p>
                        )}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}

              {isRecruiter && showVerifyButton && onVerify && isSendedForVerification === false && projectStatus !== "Verification In Progress" && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 px-2.5"
                  onClick={(event) => {
                    event.stopPropagation();
                    onVerify(candidateId);
                  }}
                >
                  <Send className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                  Send for Verification
                </Button>
              )}

              {showInterviewButton && onSendForInterview && (
                <Button
                  variant="default"
                  size="sm"
                  className="ml-2 h-7 text-[11px] bg-purple-600 hover:bg-purple-700 px-2.5"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSendForInterview(candidateId);
                  }}
                >
                  <Send className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                  Send for Interview
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default CandidateCard;
