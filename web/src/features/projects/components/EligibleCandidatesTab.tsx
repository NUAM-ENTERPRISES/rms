import { useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAppSelector } from "@/app/hooks";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Send,
  BarChart3,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ConfirmationDialog } from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetEligibleCandidatesQuery,
  useGetProjectCandidatesByRoleQuery,
  useSendForVerificationMutation,
  useGetProjectQuery,
  useCheckBulkCandidateEligibilityQuery,
} from "@/features/projects";
import { useAssignToProjectMutation } from "@/features/candidates";
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
  const itemsPerPage = 9; // Changed to 9 to show 3 cards per row (3x3)
  
  // Confirmation dialog states
  const [verifyConfirm, setVerifyConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    roleNeededId?: string;
    notes: string;
  }>({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" });
  
  const [assignConfirm, setAssignConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    roleNeededId?: string;
    notes: string;
  }>({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" });

  // Get current user
  const { user } = useAppSelector((state) => state.auth);
  const isRecruiter = user?.roles?.includes("Recruiter") ?? false;

  // Get eligible candidates with match scores
  const {
    data: candidatesData,
    isLoading,
    error,
  } = useGetEligibleCandidatesQuery({ projectId });

  // Get candidates already assigned to this project
  const { data: projectCandidatesData } = useGetProjectCandidatesByRoleQuery({
    projectId,
    role: "Manager",
  });

  // Get project details for comparison
  const { data: projectData } = useGetProjectQuery(projectId);

  // Eligibility query for the assign modal
  const assignCandidateIds = assignConfirm.candidateId ? [assignConfirm.candidateId] : [];
  const { data: assignEligibilityResponse } = useCheckBulkCandidateEligibilityQuery(
    { projectId, candidateIds: assignCandidateIds },
    { skip: assignCandidateIds.length === 0 }
  );
  const assignEligibilityData = (() => {
    if (!assignEligibilityResponse?.data || !Array.isArray(assignEligibilityResponse.data)) return null;
    return assignEligibilityResponse.data.find((d) => d.candidateId === assignConfirm.candidateId) || null;
  })();

  const [sendForVerification] = useSendForVerificationMutation();
  const [assignToProject, { isLoading: isAssigning }] = useAssignToProjectMutation();

  const eligibleCandidates = Array.isArray(candidatesData)
    ? candidatesData
    : candidatesData && typeof candidatesData === "object"
    ? (candidatesData as any).candidates || (candidatesData as any).data || []
    : [];
  const projectCandidates = projectCandidatesData?.data || [];
  const assignedToProjectIds = projectCandidates.map((c) => c.candidateId);

  // Get candidate by ID for comparison
  const getCandidateById = (candidateId: string) => {
    return eligibleCandidates.find((c: any) => c.id === candidateId);
  };

  const getNumericMatchScore = (candidate: any) => {
    if (candidate == null) return undefined;
    if (typeof candidate.matchScore === "number") return candidate.matchScore;
    if (candidate.matchScore && typeof candidate.matchScore === "object") return candidate.matchScore.score;
    return undefined;
  };

  const showVerifyConfirmation = (candidateId: string, candidateName: string) => {
    setVerifyConfirm({ isOpen: true, candidateId, candidateName, roleNeededId: projectData?.data?.rolesNeeded?.[0]?.id, notes: "" });
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

  const showAssignConfirmation = (candidateId: string, candidateName: string) => {
    // Find candidate to determine top matched role
    const candidate = getCandidateById(candidateId);
    let bestRoleNeededId = projectData?.data?.rolesNeeded?.[0]?.id;
    if (candidate?.roleMatches && candidate.roleMatches.length > 0) {
      const sorted = [...candidate.roleMatches].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
      const topRoleDesignation = sorted[0]?.designation;
      if (topRoleDesignation) {
        const matchedRole = projectData?.data?.rolesNeeded?.find(
          (r: any) => r.designation === topRoleDesignation
        );
        if (matchedRole) bestRoleNeededId = matchedRole.id;
      }
    } else if (candidate?.matchScore && typeof candidate.matchScore === 'object') {
      const ms = candidate.matchScore as any;
      const roleName = ms.roleName || ms.roleDepartmentLabel;
      if (roleName) {
        const matchedRole = projectData?.data?.rolesNeeded?.find(
          (r: any) => r.designation === roleName
        );
        if (matchedRole) bestRoleNeededId = matchedRole.id;
      }
    }
    setAssignConfirm({ isOpen: true, candidateId, candidateName, roleNeededId: bestRoleNeededId, notes: "" });
  };

  const handleAssignSingleCandidate = async () => {
    try {
      const result = await assignToProject({
        candidateId: assignConfirm.candidateId,
        projectId,
        recruiterId: user?.id,
        roleNeededId: assignConfirm.roleNeededId,
        notes: assignConfirm.notes || `Assigned to project`,
      }).unwrap();
      toast.success(
        result.message || "Candidate assigned to project successfully"
      );
      setAssignConfirm({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" });
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
          
          {/* Changed from md:grid-cols-2 to md:grid-cols-3 for 3 cards per row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paginatedCandidates.map((candidate: any) => {
              // Check from both sources: candidate's projects array and projectCandidates query
              const currentProjectInCandidate = candidate.projects?.find(
                (p: any) => p.projectId === projectId
              );
              
              const projectAssignment = projectCandidates.find(
                (pc: any) => pc.candidateId === candidate.id
              );

              // Candidate is assigned if found in either source
              const isAssignedToProject = !!currentProjectInCandidate || assignedToProjectIds.includes(candidate.id);

              // Prefer sub-status for display/checks. Fall back to currentProjectStatus.
              const actualSubStatusLabel = isAssignedToProject
                ? (currentProjectInCandidate?.subStatus?.label || projectAssignment?.subStatus?.label)
                : null;

              const actualSubStatusName = isAssignedToProject
                ? (currentProjectInCandidate?.subStatus?.name || projectAssignment?.subStatus?.name)
                : null;

              // Determine the status to display (prefer sub-status label, then name, then currentProjectStatus)
              const projectStatusToShow = isAssignedToProject
                ? (actualSubStatusLabel || actualSubStatusName || currentProjectInCandidate?.currentProjectStatus?.statusName || projectAssignment?.currentProjectStatus?.statusName)
                : "not_in_project";

              // Consider nominated when sub-status name or main/current status indicates nominated
              const isNominated = isAssignedToProject && (
                !!actualSubStatusName && actualSubStatusName.toLowerCase().startsWith("nominated") ||
                (currentProjectInCandidate?.mainStatus?.name || projectAssignment?.mainStatus?.name || "").toLowerCase() === "nominated" ||
                (currentProjectInCandidate?.currentProjectStatus?.statusName || projectAssignment?.currentProjectStatus?.statusName || "").toLowerCase() === "nominated"
              );

              // Explicitly detect verification-in-progress states so we never show the
              // "Send for Verification" button for candidates already in verification.
              const isVerificationInProgress = isAssignedToProject && (
                (!!actualSubStatusName && actualSubStatusName.toLowerCase().includes("verification")) ||
                (!!actualSubStatusLabel && actualSubStatusLabel.toLowerCase().includes("verification")) ||
                ((currentProjectInCandidate?.currentProjectStatus?.statusName || projectAssignment?.currentProjectStatus?.statusName || "").toLowerCase().includes("verification"))
              );

              // Show verify button if: In project and nominated AND not already in verification
              const showVerifyBtn = isAssignedToProject && isNominated && !isVerificationInProgress;

              const actions: {
                label: string;
                action: string;
                variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
                icon?: ComponentType<{ className?: string }>;
              }[] = [];

              return (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  projectId={projectId}
                  isRecruiter={isRecruiter}
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
                  showVerifyButton={showVerifyBtn}
                  onVerify={(candidateId) =>
                    showVerifyConfirmation(
                      candidateId,
                      `${candidate.firstName} ${candidate.lastName}`
                    )
                  }
                  showAssignButton={!isAssignedToProject}
                  onAssignToProject={(candidateId) =>
                    showAssignConfirmation(
                      candidateId,
                      `${candidate.firstName} ${candidate.lastName}`
                    )
                  }
                  isAlreadyInProject={isAssignedToProject}
                  projectStatus={projectStatusToShow}
                  className="hover:scale-100"
                  showDocumentStatus={false}
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
        onClose={() => setVerifyConfirm({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" })}
        onConfirm={handleSendForVerification}
        title="Send for Verification"
        description={
          <div className="space-y-4">
            <p>Are you sure you want to send {verifyConfirm.candidateName} for verification? This will notify the verification team.</p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select
                value={verifyConfirm.roleNeededId}
                onValueChange={(v) => setVerifyConfirm(prev => ({ ...prev, roleNeededId: v }))}
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
            </div>
            
            {/* Candidate-Project Comparison */}
            {verifyConfirm.candidateId && projectData && (() => {
              const candidate = getCandidateById(verifyConfirm.candidateId);
              const project = (projectData as any)?.data || projectData;
              if (!candidate || !project) return null;
              
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Candidate vs Project Requirements
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    {/* Match Score */}
                    {getNumericMatchScore(candidate) !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Match Score:</span>
                        <Badge variant="outline" className={
                          getNumericMatchScore(candidate)! >= 80 ? "bg-green-100 text-green-800" :
                          getNumericMatchScore(candidate)! >= 60 ? "bg-blue-100 text-blue-800" :
                          "bg-amber-100 text-amber-800"
                        }>
                          {getNumericMatchScore(candidate)}%
                        </Badge>
                      </div>
                    )}

                    {/* Experience Comparison */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Experience:</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white">
                          Candidate: {candidate.totalExperience || candidate.experience || 0} years
                        </Badge>
                        <span className="text-gray-400">vs</span>
                        <Badge variant="outline" className="bg-white">
                          Required: {(project as any).minExperience || 0}-{(project as any).maxExperience || 0} years
                        </Badge>
                      </div>
                    </div>

                    {/* Role Comparison */}
                    {candidate.currentRole && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Current Role:</span>
                        <Badge variant="outline" className="bg-white">
                          {candidate.currentRole}
                        </Badge>
                      </div>
                    )}

                    {/* Skills Comparison */}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-gray-700">Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

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
        onClose={() => setAssignConfirm({ isOpen: false, candidateId: "", candidateName: "", roleNeededId: undefined, notes: "" })}
        onConfirm={handleAssignSingleCandidate}
        className="w-full max-w-3xl sm:max-w-4xl p-6 max-h-[90vh] overflow-y-auto"
        title="Assign to Project"
        description={
          <div className="space-y-4">
            <p>Are you sure you want to assign {assignConfirm.candidateName} to this project?</p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select
                value={assignConfirm.roleNeededId}
                onValueChange={(v) => setAssignConfirm(prev => ({ ...prev, roleNeededId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectData?.data?.rolesNeeded?.map((r: any) => {
                    const roleElig = assignEligibilityData?.roleEligibility?.find(
                      (re: any) => re.designation === r.designation
                    );
                    return (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="flex items-center gap-2">
                          {r.designation}
                          {roleElig && roleElig.reasons.length > 0 && (
                            <AlertCircle className="h-3 w-3 text-amber-500 inline" />
                          )}
                          {roleElig && roleElig.reasons.length === 0 && (
                            <CheckCircle2 className="h-3 w-3 text-green-500 inline" />
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Eligibility reasons for the selected role */}
              {(() => {
                const selectedRole = projectData?.data?.rolesNeeded?.find((r: any) => r.id === assignConfirm.roleNeededId);
                const roleElig = assignEligibilityData?.roleEligibility?.find(
                  (re: any) => re.designation === selectedRole?.designation
                );
                if (!roleElig) return null;
                return (
                  <div className={`mt-2 p-3 rounded-lg border ${
                    roleElig.reasons.length === 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className={`flex items-center gap-2 text-xs font-semibold mb-1 ${
                      roleElig.reasons.length === 0 ? 'text-green-700' : 'text-amber-700'
                    }`}>
                      {roleElig.reasons.length === 0 ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> Eligible for {roleElig.designation}</>
                      ) : (
                        <><AlertCircle className="h-3.5 w-3.5" /> {roleElig.designation} &mdash; Eligibility Issues</>
                      )}
                    </div>
                    {roleElig.reasons.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {roleElig.reasons.map((reason: string, idx: number) => (
                          <li key={idx} className="text-[11px] text-slate-600 italic">{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-green-600 italic">This candidate meets all requirements for this role.</p>
                    )}
                  </div>
                );
              })()}
            </div>
            
            {/* Candidate-Project Comparison */}
            {assignConfirm.candidateId && projectData && (() => {
              const candidate = getCandidateById(assignConfirm.candidateId);
              const project = (projectData as any)?.data || projectData;
              if (!candidate || !project) return null;
              
              const candidateExp = candidate.totalExperience || candidate.experience || 0;
              const minExp = (project as any).minExperience || 0;
              const maxExp = (project as any).maxExperience || 0;
              const expMatch = candidateExp >= minExp && candidateExp <= maxExp;
              
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Candidate vs Project Requirements
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    {/* Match Score */}
                    {getNumericMatchScore(candidate) !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Match Score:</span>
                        <Badge variant="outline" className={
                          getNumericMatchScore(candidate)! >= 80 ? "bg-green-100 text-green-800" :
                          getNumericMatchScore(candidate)! >= 60 ? "bg-blue-100 text-blue-800" :
                          "bg-amber-100 text-amber-800"
                        }>
                          {getNumericMatchScore(candidate)}%
                        </Badge>
                      </div>
                    )}

                    {/* Experience Comparison with Match Indicator */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Experience:</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={expMatch ? "bg-green-100 text-green-800" : "bg-white"}>
                          Candidate: {candidateExp} years
                        </Badge>
                        <span className="text-gray-400">vs</span>
                        <Badge variant="outline" className="bg-white">
                          Required: {minExp}-{maxExp} years
                        </Badge>
                        {expMatch && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      </div>
                    </div>

                    {/* Role Comparison */}
                    {candidate.currentRole && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Current Role:</span>
                        <Badge variant="outline" className="bg-white">
                          {candidate.currentRole}
                        </Badge>
                      </div>
                    )}

                    {/* Qualifications */}
                    {candidate.qualifications && candidate.qualifications.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-gray-700">Qualifications:</span>
                        <div className="flex flex-wrap gap-1">
                          {candidate.qualifications.slice(0, 3).map((qual: any) => (
                            <Badge key={qual.id} variant="secondary" className="text-xs">
                              {qual.degreeName || qual.name}
                            </Badge>
                          ))}
                          {candidate.qualifications.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{candidate.qualifications.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Skills Comparison */}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-gray-700">Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 5).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{candidate.skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

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