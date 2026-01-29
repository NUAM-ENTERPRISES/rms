import {
  Mail,
  Phone,
  DollarSign,
  Building2 as Building,
  MoreVertical,
  Send,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  FileText,
  CheckCircle,
  AlertCircle,
  Upload,
} from "lucide-react";
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
}: CandidateCardProps) {
  const navigate = useNavigate();
  const candidateId = candidate.candidateId || candidate.id || "";
  // Filter out "Assign to Project" from actions as it's now a primary button
  const filteredActions = actions?.filter(
    (action) => action.label.toLowerCase() !== "assign to project"
  );

  // Eligibility check
  const isNotEligible = propEligibilityData?.isEligible === false;
  const eligibilityData = propEligibilityData;

  // Document verification logic
  const requiredDocs = candidate.project?.documentRequirements || [];
  
  // Try to find project-specific document verifications if projectId is provided
  const projectLink = propProjectId 
    ? candidate.projects?.find(p => p.projectId === propProjectId)
    : undefined;

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
      case "working":
        return {
          label: "Working",
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
                        <TooltipContent className="bg-slate-900 text-white border-0 text-[10px] p-2">
                          <p>Not Eligible for Project</p>
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
          {showMatchScore && displayMatchScore !== undefined && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`${getMatchScoreColor(
                    displayMatchScore
                  )} border text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1`}
                >
                  <span className="text-[11px] font-semibold">{displayMatchScore}%</span>
                </Badge>
              </TooltipTrigger>

              <TooltipContent className="bg-white text-slate-700 border shadow-sm p-2 rounded-md max-w-xs">
                {primaryRoleMatch.designation ? (
                  <>
                    {/* Include a concise, screen-reader-friendly sentence describing
                        the primary eligible role and score (also useful for tests). */}
                    <div className="sr-only">
                      This candidate is eligible for {primaryRoleMatch.designation} with score {displayMatchScore}%
                    </div>
                    <div className="p-3 max-w-xs">
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
                        <div className="text-[11px] text-slate-500">Top match</div>
                        <div className="text-sm font-semibold truncate">
                          {primaryRoleMatch.designation}
                        </div>
                        {primaryRoleMatch.department && (
                          <div className="text-xs text-slate-400 mt-0.5 truncate">
                            {primaryRoleMatch.department}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`${getMatchScoreColor(
                            displayMatchScore ?? 0
                          )} h-2 rounded-full`}
                          style={{ width: `${displayMatchScore}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{displayMatchScore}% match</div>
                    </div>
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
          {eligibilityData && eligibilityData.isEligible === false && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 cursor-help animate-pulse"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AlertCircle className="h-4 w-4" aria-hidden />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-white text-slate-900 border border-red-200 shadow-lg max-w-xs p-3 rounded-xl">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600 font-bold text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Not Eligible for Project</span>
                  </div>
                  <div className="space-y-1.5">
                    {(eligibilityData?.roleEligibility || []).map((role, rIdx) => (
                      <div key={rIdx} className="space-y-1">
                        <div className="text-[11px] font-semibold text-slate-700">{role.designation}</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {role.reasons.map((reason, idx) => (
                            <li key={idx} className="text-[10px] text-slate-600 leading-relaxed">
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Detail pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          {candidate.email && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <Mail className="h-3 w-3 text-slate-400" aria-hidden="true" />
              <span className="truncate max-w-[140px]">{candidate.email}</span>
            </span>
          )}
          {contactValue && (
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

        {showAssignButton && onAssignToProject && (
          <div className="flex items-center justify-end border-t border-slate-100 pt-2">
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
                <TooltipContent className="bg-slate-900 text-white border-0 text-[10px] p-2">
                  <p>Not Eligible for Project</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        )}

        {isRecruiter && showVerifyButton &&
          onVerify && isSendedForVerification === false && projectStatus !== "Verification In Progress" && (
            <div className="flex items-center justify-end border-t border-slate-100 pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isNoneUploaded}
                      className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 px-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={(event) => {
                        event.stopPropagation();
                        onVerify(candidateId);
                      }}
                    >
                      <Send className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                      Send for Verification
                    </Button>
                  </span>
                </TooltipTrigger>
                {isNoneUploaded && (
                  <TooltipContent className="bg-slate-900 text-white border-0 text-[10px] p-2">
                    <p>Please upload documents for this project</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          )
        }

        {showInterviewButton && onSendForInterview && (
          <div className="flex items-center justify-end border-t border-slate-100 pt-2">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default CandidateCard;
