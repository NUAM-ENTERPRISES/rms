import {
  Mail,
  Phone,
  DollarSign,
  BarChart3,
  Building2 as Building,
  MoreHorizontal,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

interface CandidateCardProps {
  candidate: any;
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

export default function CandidateCard({
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
    projectStatus || candidate?.currentStatus?.statusName || candidate?.currentStatus || ""
  );

  // Get initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
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

  return (
    <Card
      className={cn(
        "group hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer h-full flex flex-col",
        className
      )}
      onClick={() => onView?.(candidate.id)}
    >
      <CardHeader className="pb-2 space-y-2">
        {/* Avatar, Match Score, In Project Badge, and Menu Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10 border-2 border-gray-100">
              <AvatarImage
                src={candidate.profileImage}
                alt={`${candidate.firstName} ${candidate.lastName}`}
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {getInitials(candidate.firstName, candidate.lastName)}
              </AvatarFallback>
            </Avatar>
            {isAlreadyInProject && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 text-xs flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                In Project
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Three-dot menu */}
            {actions && actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {actions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <DropdownMenuItem
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction?.(candidate.id, action.action);
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

        {/* Name */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 truncate mb-0.5">
            {candidate.firstName} {candidate.lastName}
          </h3>

          {/* Status Badges */}
          <div className="flex flex-col gap-1.5">
            {/*
              If candidate is part of a project we prefer showing the project's
              (sub-)status on the card — otherwise fall back to the candidate's overall status.
            */}
            {projectStatus ? (
              <Badge
                variant="outline"
                className={`${statusConfig.color} border text-xs w-fit`}
              >
                {statusConfig.label}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={`${getStatusConfig(candidate?.currentStatus?.statusName || candidate?.currentStatus || "").color} border text-xs w-fit`}
              >
                {getStatusConfig(candidate?.currentStatus?.statusName || candidate?.currentStatus || "").label}
              </Badge>
            )}

            {/* Show match score badge below statuses */}
            {showMatchScore && matchScore !== undefined && (
              <Badge
                variant="outline"
                className={`${getMatchScoreColor(matchScore)} border text-xs w-fit`}
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                {matchScore}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 flex-1 flex flex-col">
        {/* Contact Information */}
        <div className="space-y-1">
          {candidate.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{candidate.email}</span>
            </div>
          )}
          {(candidate.mobileNumber || candidate.contact) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">
                {candidate.countryCode && candidate.mobileNumber
                  ? `${candidate.countryCode} ${candidate.mobileNumber}`
                  : candidate.contact}
              </span>
            </div>
          )}
        </div>

        {/* Current Employer and Salary */}
        {(candidate.currentEmployer || candidate.expectedSalary) && (
          <div className="space-y-1.5 text-sm">
            {candidate.currentEmployer && (
              <div className="flex items-center gap-2 text-gray-600">
                <Building className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{candidate.currentEmployer}</span>
              </div>
            )}
            {candidate.expectedSalary && (
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">Expected: {formatSalary(candidate.expectedSalary)}</span>
              </div>
            )}
          </div>
        )}

        {/* Send for Verification Button */}
        {showVerifyButton && onVerify && (
          <div className="pt-2 border-t mt-auto">
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onVerify(candidate.id);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send for Verification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
