import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Send, ChevronUp, ChevronDown, Search, Filter } from "lucide-react";
import { useAppSelector } from "@/app/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui";
import {
  useGetNominatedCandidatesQuery,
  useSendForVerificationMutation,
  useGetCandidateProjectStatusesQuery,
  useGetProjectQuery,
} from "@/features/projects";
import CandidateCard from "./CandidateCard";

interface SubmittedCandidatesSectionProps {
  projectId: string;
}

export default function SubmittedCandidatesSection({
  projectId,
}: SubmittedCandidatesSectionProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const itemsPerPage = 5; // Show 5 candidates per page in sidebar

  // Get current user
  const { user } = useAppSelector((state) => state.auth);

  // Confirmation dialog state
  const [verifyConfirm, setVerifyConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    roleNeededId?: string;
    notes: string;
  }>({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" });

  const { data: projectData } = useGetProjectQuery(projectId);

  // Get candidates already assigned to this project
  const { data: projectCandidatesData, isLoading } =
    useGetNominatedCandidatesQuery({
      projectId,
      search: searchTerm || undefined,
      statusId: selectedStatus !== "all" ? parseInt(selectedStatus) : undefined,
      page: currentPage,
      limit: itemsPerPage,
    });

  // Fetch project statuses from API
  const { data: statusesData } = useGetCandidateProjectStatusesQuery();

  const [sendForVerification] = useSendForVerificationMutation();

  const projectCandidates = projectCandidatesData?.data?.candidates || [];

  // Get pagination from API response
  const pagination = projectCandidatesData?.data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  const showVerifyConfirmation = (
    candidateId: string,
    candidateName: string
  ) => {
    setVerifyConfirm({
      isOpen: true,
      candidateId,
      candidateName,
      roleNeededId: projectData?.data?.rolesNeeded?.[0]?.id,
      notes: "",
    });
  };

  const handleSendForVerification = async () => {
    try {
      await sendForVerification({
        projectId,
        candidateId: verifyConfirm.candidateId,
        roleNeededId: verifyConfirm.roleNeededId,
        recruiterId: user?.id,
        notes: verifyConfirm.notes || undefined
      }).unwrap();
      toast.success("Candidate sent for verification successfully");
      setVerifyConfirm({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" });
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to send candidate for verification"
      );
    }
  };

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1); // Reset to first page on filter
  };

  // Get list of project statuses from API - ensure it's always an array
  const projectStatuses = Array.isArray(statusesData?.data?.statuses) 
    ? statusesData.data.statuses 
    : [];

  if (isLoading) {
    return (
      <div className="lg:col-span-1">
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Nominated Candidates
          </h3>
          <p className="text-xs text-gray-600">
            Candidates Nominated for this project
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="lg:col-span-1">
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Nominated Candidates
          </h3>
          <p className="text-xs text-gray-600">
            Candidates Nominated for this project
          </p>
        </div>

        {/* Search and Filter */}
        <div className="space-y-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          <Select value={selectedStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {projectStatuses.map((status) => (
                <SelectItem key={status.id} value={status.id.toString()}>
                  {status.label || status.statusName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {projectCandidates.map((candidate: any) => {
            if (!candidate) return null;

            // Get the correct project status from the candidate's project data
            const projectStatus = candidate.currentProjectStatus?.statusName || 
                                 candidate.projectStatus?.statusName ||
                                 "nominated";

            // Only show verify button if status is 'nominated'
            const canSendForVerification = projectStatus.toLowerCase() === "nominated";

            // Use candidateId if it exists, otherwise use id
            const actualCandidateId = candidate.candidateId || candidate.id;

            // Get match score if available
            const matchScore = candidate.matchScore;

            return (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onView={() => handleViewCandidate(actualCandidateId)}
                onAction={() => {}}
                actions={[]}
                projectStatus={projectStatus}
                showMatchScore={matchScore !== undefined && matchScore !== null}
                matchScore={matchScore}
                showVerifyButton={canSendForVerification}
                onVerify={() =>
                  showVerifyConfirmation(
                    actualCandidateId,
                    `${candidate.firstName} ${candidate.lastName}`
                  )
                }
                isAlreadyInProject={true}
                className="hover:scale-100"
              />
            );
          })}
          {projectCandidates.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No candidates submitted yet
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="text-xs text-gray-600 text-center">
              Page {currentPage} of {pagination.totalPages} ({pagination.total} candidates)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex-1"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex-1"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Verification Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={verifyConfirm.isOpen}
        onClose={() =>
          setVerifyConfirm({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" })
        }
        onConfirm={handleSendForVerification}
        title="Send for Verification"
        description={
          <div className="space-y-4">
            <p>Are you sure you want to send {verifyConfirm.candidateName} for verification? This will notify the verification team.</p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select
                value={verifyConfirm.roleNeededId}
                onValueChange={(v) => setVerifyConfirm((prev) => ({ ...prev, roleNeededId: v }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectData?.data?.rolesNeeded?.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
    </>
  );
}
