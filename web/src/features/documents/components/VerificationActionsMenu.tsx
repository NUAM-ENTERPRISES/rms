import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  User,
  Building2,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Can } from "@/components/auth/Can";

interface VerificationActionsMenuProps {
  candidateProject: any;
  onVerify?: (candidateProject: any) => void;
  onReject: (candidateProject: any) => void;
}

export default function VerificationActionsMenu({
  candidateProject,
  onVerify,
  onReject,
}: VerificationActionsMenuProps) {
  const navigate = useNavigate();

  const handleCandidateDetails = () => {
    navigate(`/candidates/${candidateProject.candidate.id}`);
  };

  const handleProjectDetails = () => {
    navigate(`/projects/${candidateProject.project.id}`);
  };

  const handleViewDocuments = () => {
    navigate(
      `/candidates/${candidateProject.candidate.id}/documents/${candidateProject.project.id}`
    );
  };

  const canVerify = candidateProject.status === "documents_submitted";

  return (
    <div className="flex items-center justify-end space-x-1">
      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleCandidateDetails}>
            <User className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span className="font-medium">Candidate Details</span>
              <span className="text-xs text-muted-foreground">
                View full candidate profile
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleProjectDetails}>
            <Building2 className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span className="font-medium">Project Details</span>
              <span className="text-xs text-muted-foreground">
                View project information
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleViewDocuments}>
            <Eye className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span className="font-medium">Document Verification</span>
              <span className="text-xs text-muted-foreground">
                Verify documents for this project
              </span>
            </div>
          </DropdownMenuItem>

          {/* Verification Actions */}
          <Can anyOf={["verify:documents"]}>
            {canVerify && (
              <>
                <div className="border-t my-1" />
                <DropdownMenuItem
                  onClick={handleViewDocuments}
                  className="text-green-600 focus:text-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">Verify Documents</span>
                    <span className="text-xs text-muted-foreground">
                      Go to document verification page
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onReject(candidateProject)}
                  className="text-red-600 focus:text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">Reject Documents</span>
                    <span className="text-xs text-muted-foreground">
                      Reject with reason
                    </span>
                  </div>
                </DropdownMenuItem>
              </>
            )}
          </Can>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
