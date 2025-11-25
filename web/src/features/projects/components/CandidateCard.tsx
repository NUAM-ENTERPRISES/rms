import {
  Mail,
  Phone,
  DollarSign,
  BarChart3,
  Building2 as Building,
  MoreVertical,
  Send,
  CheckCircle2,
} from "lucide-react";
import { memo } from "react";
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
  currentProjectStatus?: { statusName?: string };
  projectStatus?: { statusName?: string };
  currentEmployer?: string;
  expectedSalary?: number;
  matchScore?: number;
  projects?: CandidateProjectLink[];
  project?: { id?: string } | null;
}

interface CandidateCardProps {
  candidate: CandidateRecord;
  onView?: (candidateId: string) => void;
  onAction?: (candidateId: string, action: string) => void;
  actions?: Array<{
    label: string;
    action: string;
    variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  showMatchScore?: boolean;
  matchScore?: number;
  projectStatus?: string;
  showVerifyButton?: boolean;
  onVerify?: (candidateId: string) => void;
  isAlreadyInProject?: boolean;
  className?: string;
}

const CandidateCard = memo(function CandidateCard({
  candidate,
  onView,
  onAction,
  actions,
  showMatchScore = false,
  matchScore,
  projectStatus,
  showVerifyButton = false,
  onVerify,
  isAlreadyInProject = false,
  className,
}: CandidateCardProps) {
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

  const candidateId = candidate.candidateId || candidate.id || "";
  const fullName = `${candidate.firstName || ""} ${
    candidate.lastName || ""
  }`.trim();
  const contactValue =
    candidate.countryCode && candidate.mobileNumber
      ? `${candidate.countryCode} ${candidate.mobileNumber}`
      : candidate.contact;
  const displayMatchScore =
    matchScore ??
    (typeof candidate.matchScore === "number"
      ? candidate.matchScore
      : undefined);

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
                {actions && actions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-500"
                        aria-label="More actions"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {actions.map((action, index) => {
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
            <Badge
              variant="outline"
              className={`${getMatchScoreColor(
                displayMatchScore
              )} border text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1`}
            >
              <BarChart3 className="h-2.5 w-2.5" aria-hidden="true" />
              Match {displayMatchScore}%
            </Badge>
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

        {showVerifyButton && onVerify && (
          <div className="flex items-center justify-end border-t border-slate-100 pt-2">
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 px-3"
              onClick={(event) => {
                event.stopPropagation();
                onVerify(candidateId);
              }}
            >
              <Send className="h-3 w-3 mr-1" aria-hidden="true" />
              Send for Verification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default CandidateCard;
