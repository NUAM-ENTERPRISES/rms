import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAppSelector } from "@/app/hooks";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Send,
} from "lucide-react";
import { ConfirmationDialog } from "@/components/ui";
import {
  useGetEligibleCandidatesQuery,
  useGetProjectCandidatesByRoleQuery,
  useSendForVerificationMutation,
} from "@/features/projects";
import { useAssignToProjectMutation } from "@/features/candidates";
import { format } from "date-fns";
import CandidateCard from "./CandidateCard";

interface EligibleCandidatesTabProps {
  projectId: string;
}

export default function EligibleCandidatesTab({
  projectId,
}: EligibleCandidatesTabProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Confirmation dialog states
  const [verifyConfirm, setVerifyConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    notes: string;
  }>({ isOpen: false, candidateId: "", candidateName: "", notes: "" });
  
  const [assignConfirm, setAssignConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    notes: string;
  }>({ isOpen: false, candidateId: "", candidateName: "", notes: "" });

  // Get current user
  const { user } = useAppSelector((state) => state.auth);

  // Get eligible candidates with match scores
  const {
    data: candidatesData,
    isLoading,
    error,
  } = useGetEligibleCandidatesQuery(projectId);

  // Get candidates already assigned to this project
  const { data: projectCandidatesData } = useGetProjectCandidatesByRoleQuery({
    projectId,
    role: "Manager",
  });

  const [sendForVerification] = useSendForVerificationMutation();
  const [assignToProject, { isLoading: isAssigning }] = useAssignToProjectMutation();

  const eligibleCandidates = candidatesData?.data || [];
  const projectCandidates = projectCandidatesData?.data || [];
  const assignedToProjectIds = projectCandidates.map((c) => c.candidateId);

  const showVerifyConfirmation = (candidateId: string, candidateName: string) => {
    setVerifyConfirm({ isOpen: true, candidateId, candidateName, notes: "" });
  };

  const handleSendForVerification = async () => {
    try {
      await sendForVerification({ 
        projectId, 
        candidateId: verifyConfirm.candidateId,
        recruiterId: user?.id,
        notes: verifyConfirm.notes || undefined
      }).unwrap();
      toast.success("Candidate sent for verification successfully");
      setVerifyConfirm({ isOpen: false, candidateId: "", candidateName: "", notes: "" });
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to send candidate for verification"
      );
    }
  };

  const showAssignConfirmation = (candidateId: string, candidateName: string) => {
    setAssignConfirm({ isOpen: true, candidateId, candidateName, notes: "" });
  };

  const handleAssignSingleCandidate = async () => {
    try {
      const result = await assignToProject({
        candidateId: assignConfirm.candidateId,
        projectId,
        recruiterId: user?.id,
        notes: assignConfirm.notes || `Assigned to project`,
      }).unwrap();
      toast.success(
        result.message || "Candidate assigned to project successfully"
      );
      setAssignConfirm({ isOpen: false, candidateId: "", candidateName: "", notes: "" });
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to assign candidate to project"
      );
    }
  };

  // Filter candidates - API returns candidate data at root level with matchScore
  const filteredCandidates = eligibleCandidates.filter((candidate: any) => {
    if (!candidate) return false;
    
    const matchesSearch =
      candidate.firstName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      candidate.lastName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      candidate.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Failed to load candidates. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="text-center py-12">
          <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Eligible Candidates
          </h3>
          <p className="text-gray-600">
            No eligible candidates found matching the project requirements.
          </p>
        </div>
      ) : (
        <div>
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Eligible Candidates
            </h3>
            <p className="text-xs text-gray-600">
              Candidates matching project requirements with match scores
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedCandidates.map((candidate: any) => {
              const isAssignedToProject = assignedToProjectIds.includes(candidate.id);
              const projectAssignment = projectCandidates.find(
                (pc: any) => pc.candidateId === candidate.id
              );

              const actions = [];

              if (!isAssignedToProject) {
                actions.push({
                  label: "Assign to Project",
                  action: "assign",
                  variant: "default" as const,
                  icon: UserPlus,
                });
              }

              return (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onView={handleViewCandidate}
                  onAction={(candidateId, action) => {
                    if (action === "assign") {
                      showAssignConfirmation(
                        candidateId,
                        `${candidate.firstName} ${candidate.lastName}`
                      );
                    }
                  }}
                  actions={actions}
                  showMatchScore={true}
                  matchScore={candidate.matchScore}
                  showVerifyButton={isAssignedToProject}
                  onVerify={(candidateId) =>
                    showVerifyConfirmation(
                      candidateId,
                      `${candidate.firstName} ${candidate.lastName}`
                    )
                  }
                  isAlreadyInProject={isAssignedToProject}
                  projectStatus={projectAssignment?.currentProjectStatus?.statusName}
                  className="hover:scale-100"
                />
              );
            })}
          </div>
          
          {/* Pagination Controls */}
          {filteredCandidates.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredCandidates.length)} of {filteredCandidates.length} candidates
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (page === 1 || page === totalPages || 
                          (page >= currentPage - 1 && page <= currentPage + 1)) {
                        return true;
                      }
                      return false;
                    })
                    .map((page, idx, arr) => (
                      <>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span key={`ellipsis-${page}`} className="px-2 text-gray-400">...</span>
                        )}
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      </>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verification Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={verifyConfirm.isOpen}
        onClose={() => setVerifyConfirm({ isOpen: false, candidateId: "", candidateName: "", notes: "" })}
        onConfirm={handleSendForVerification}
        title="Send for Verification"
        description={
          <div className="space-y-4">
            <p>Are you sure you want to send {verifyConfirm.candidateName} for verification? This will notify the verification team.</p>
            <div className="space-y-2">
              <label htmlFor="verify-notes" className="text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <Textarea
                id="verify-notes"
                placeholder="Add any notes for the verification team..."
                value={verifyConfirm.notes}
                onChange={(e) => setVerifyConfirm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        }
        confirmText="Send for Verification"
        cancelText="Cancel"
        isLoading={false}
        variant="default"
        icon={
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Send className="h-5 w-5 text-blue-600" />
          </div>
        }
      />

      {/* Assignment Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={assignConfirm.isOpen}
        onClose={() => setAssignConfirm({ isOpen: false, candidateId: "", candidateName: "", notes: "" })}
        onConfirm={handleAssignSingleCandidate}
        title="Assign to Project"
        description={
          <div className="space-y-4">
            <p>Are you sure you want to assign {assignConfirm.candidateName} to this project?</p>
            <div className="space-y-2">
              <label htmlFor="assign-notes" className="text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <Textarea
                id="assign-notes"
                placeholder="Add any notes about this assignment..."
                value={assignConfirm.notes}
                onChange={(e) => setAssignConfirm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        }
        confirmText="Assign to Project"
        cancelText="Cancel"
        isLoading={isAssigning}
        variant="default"
        icon={
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-green-600" />
          </div>
        }
      />
    </div>
  );
}
